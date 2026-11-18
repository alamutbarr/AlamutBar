from datetime import timedelta
from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import *

ACTIVE_TRIP = [
    "assigned",
    "en_route_pickup",
    "arrived_pickup",
    "loading",
    "waybill",
    "in_transit",
    "near_destination",
    "on_hold",
    "delivered",
]
GPS_STATUSES = ["waybill", "in_transit", "near_destination"]


def audit(user, action, obj, detail=None):
    AuditLog.objects.create(
        actor=user, action=action, object_id=str(obj.pk), detail=detail or {}
    )


def notify(shipment, title):
    ids = {shipment.owner_id, shipment.driver_id, shipment.inspector_id} - {None}
    Notification.objects.bulk_create(
        [
            Notification(
                user_id=i, shipment=shipment, title=f"{shipment.code} · {title}"
            )
            for i in ids
        ]
    )


def event(shipment, user, note):
    ShipmentEvent.objects.create(
        shipment=shipment, actor=user, status=shipment.status, note=note
    )
    audit(user, "shipment." + shipment.status, shipment, {"note": note})
    notify(shipment, shipment.get_status_display())


def driver_documents_valid(user):
    profile = getattr(user, "driver_profile", None)
    today = timezone.localdate()
    return bool(
        profile
        and profile.status == "approved"
        and profile.license_expiry
        and profile.license_expiry > today
        and profile.insurance_expiry
        and profile.insurance_expiry > today
    )


def driver_market_enabled(user):
    return (
        user.role == "driver"
        and user.is_active
        and user.verified
        and driver_documents_valid(user)
    )


TRANSITIONS = {
    "approved": ({"pending"}, {"operator"}),
    "en_route_pickup": ({"assigned"}, {"driver", "operator"}),
    "arrived_pickup": ({"en_route_pickup", "on_hold"}, {"driver", "operator"}),
    "loading": ({"assigned", "arrived_pickup"}, {"driver", "operator"}),
    "waybill": ({"arrived_pickup", "loading"}, {"operator"}),
    "in_transit": ({"loading", "waybill"}, {"driver", "operator"}),
    "near_destination": ({"in_transit"}, {"driver", "operator"}),
    "on_hold": (
        {"arrived_pickup", "loading", "waybill", "in_transit", "near_destination"},
        {"operator"},
    ),
    "delivered": ({"in_transit", "near_destination"}, {"driver", "operator"}),
    "completed": ({"delivered"}, {"owner", "operator"}),
}


@transaction.atomic
def transition(shipment_id, user, target, note=""):
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if user.role == "owner" and shipment.owner_id != user.pk:
        raise PermissionDenied()
    if user.role == "driver" and shipment.driver_id != user.pk:
        raise PermissionDenied()
    if (
        target in ["in_transit", "completed"]
        and shipment.incidents.filter(severity="critical")
        .exclude(status="resolved")
        .exists()
    ):
        raise ValidationError("ابتدا رخداد بحرانی این محموله باید رفع شود.")
    if target == "cancelled":
        if user.role not in ["owner", "operator"]:
            raise PermissionDenied("اجازه لغو ندارید.")
        allowed = (
            ["pending", "approved"]
            if user.role == "owner"
            else ["pending", "approved", "assigned"]
        )
        if shipment.status not in allowed:
            raise ValidationError("این بار در مرحله قابل لغو نیست.")
        if not note.strip():
            raise ValidationError("دلیل لغو الزامی است.")
    else:
        rule = TRANSITIONS.get(target)
        if not rule or user.role not in rule[1]:
            raise PermissionDenied("مجوز این تغییر وضعیت را ندارید.")
        if shipment.status not in rule[0]:
            raise ValidationError("ترتیب مراحل حمل رعایت نشده است.")
        if target == "arrived_pickup" and shipment.status == "on_hold" and user.role != "operator":
            raise PermissionDenied("خروج از توقف بازرسی فقط توسط اپراتور انجام می‌شود.")
        if (
            target in ["en_route_pickup", "in_transit"]
            and shipment.sensitive
            and not shipment.inspector_id
        ):
            raise ValidationError("برای بار حساس، تخصیص متصدی الزامی است.")
        if target == "in_transit":
            waybill = Waybill.objects.filter(shipment=shipment).first()
            if waybill and (not waybill.verified_at or not waybill.photo):
                raise ValidationError(
                    "تا ورود کد و مشاهده عکس بارنامه، حرکت شروع نمی‌شود."
                )
        if target in ["in_transit", "completed"]:
            stage = "loading" if target == "in_transit" else "delivery"
            latest = shipment.inspections.filter(stage=stage).first()
            if not latest or not latest.passed:
                raise ValidationError("تأیید بازرسی این مرحله الزامی است.")
    shipment.status = target
    shipment.save(update_fields=["status", "updated_at"])
    if target == "approved" and shipment.offer_expires_at is None:
        shipment.offer_expires_at = timezone.now() + timedelta(hours=6)
        shipment.save(update_fields=["offer_expires_at", "updated_at"])
    if target == "completed":
        Invoice.objects.get_or_create(
            shipment=shipment, defaults={"amount": shipment.price}
        )
    event(shipment, user, note or shipment.get_status_display())
    if target == "approved":
        from .driver_flow import notify_matching_drivers

        notify_matching_drivers(shipment)
    return shipment


@transaction.atomic
def assign(shipment_id, user, driver, inspector, amount=None):
    if user.role != "operator":
        raise PermissionDenied()
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    # Lock the driver as well so simultaneous assignments cannot double-book a vehicle.
    driver = User.objects.select_for_update().get(pk=driver.pk)
    if shipment.status != "approved":
        raise ValidationError("ابتدا بار را تأیید کنید.")
    if driver.role != "driver" or not driver.is_active or not driver.verified:
        raise ValidationError("راننده باید فعال و احراز شده باشد.")
    if not driver_documents_valid(driver):
        raise ValidationError("پرونده و اعتبار مدارک راننده باید تأیید شده باشد.")
    if inspector.role != "inspector" or not inspector.is_active:
        raise ValidationError("متصدی معتبر انتخاب کنید.")
    if not hasattr(driver, "vehicle") or not driver.vehicle.available:
        raise ValidationError("ناوگان راننده آماده نیست.")
    if (
        driver.vehicle.kind != shipment.vehicle_type
        or driver.vehicle.capacity < shipment.weight
    ):
        raise ValidationError("نوع یا ظرفیت خودرو با بار مطابقت ندارد.")
    if Shipment.objects.filter(driver=driver, status__in=ACTIVE_TRIP).exists():
        raise ValidationError("راننده یک سفر فعال دارد.")
    shipment.driver = driver
    shipment.inspector = inspector
    shipment.status = "assigned"
    if amount is not None:
        shipment.price = amount
    shipment.save()
    event(shipment, user, "راننده و متصدی به محموله تخصیص داده شدند.")
    return shipment
