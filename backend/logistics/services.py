from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import ValidationError, PermissionDenied
from .models import *


def audit(user, action, obj, detail=None):
    AuditLog.objects.create(
        actor=user, action=action, object_id=str(obj.pk), detail=detail or {}
    )


def notify(shipment, title, body=""):
    ids = {shipment.owner_id, shipment.driver_id, shipment.inspector_id} - {None}
    Notification.objects.bulk_create(
        [
            Notification(
                user_id=i,
                shipment=shipment,
                title=f"{shipment.code} · {title}",
                body=body[:500],
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


def national_id_ok(value):
    if not value or len(value) != 10 or not value.isdigit() or len(set(value)) == 1:
        return False
    total = sum(int(value[i]) * (10 - i) for i in range(9)) % 11
    return int(value[9]) == (total if total < 2 else 11 - total)


def owner_ready(user):
    if user.role != "owner":
        return True
    if not national_id_ok(user.national_id):
        return False
    postal = user.postal_code or ""
    if not (len(postal) == 10 and postal.isdigit()):
        return False
    try:
        identity = user.owner_identity
    except OwnerIdentity.DoesNotExist:
        identity = None
    if identity is not None:
        return identity.status == "approved"
    from django.conf import settings

    return bool(settings.DEMO_ENABLED and user.username.endswith(".demo"))


def owner_block_message(user):
    if owner_ready(user):
        return ""
    if not national_id_ok(user.national_id):
        return "برای ثبت بار، کد ملی معتبر لازم است."
    postal = user.postal_code or ""
    if not (len(postal) == 10 and postal.isdigit()):
        return "برای ثبت بار، کد پستی ۱۰ رقمی لازم است."
    return "تا تأیید احراز هویت، ثبت بار ممکن نیست."


def driver_market_enabled(user):
    return (
        user.role == "driver"
        and user.is_active
        and user.verified
        and driver_documents_valid(user)
    )


TRANSITIONS = {
    "approved": ("pending", {"operator"}),
    "loading": ("assigned", {"driver", "operator"}),
    "in_transit": ("loading", {"driver", "operator"}),
    "delivered": ("in_transit", {"driver", "operator"}),
    "completed": ("delivered", {"owner", "operator"}),
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
        shipment.cancel_reason = note.strip()[:1000]
    else:
        rule = TRANSITIONS.get(target)
        if not rule or user.role not in rule[1]:
            raise PermissionDenied("مجوز این تغییر وضعیت را ندارید.")
        if shipment.status != rule[0]:
            raise ValidationError("ترتیب مراحل حمل رعایت نشده است.")
        if target in ["in_transit", "completed"]:
            stage = "loading" if target == "in_transit" else "delivery"
            latest = shipment.inspections.filter(stage=stage).first()
            if not latest or not latest.passed:
                raise ValidationError("تأیید بازرسی این مرحله الزامی است.")
    shipment.status = target
    shipment.save(update_fields=["status", "updated_at", "cancel_reason"])
    if target == "completed":
        Invoice.objects.get_or_create(
            shipment=shipment, defaults={"amount": shipment.price}
        )
    event(shipment, user, note or shipment.get_status_display())
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
    if Shipment.objects.filter(
        driver=driver, status__in=["assigned", "loading", "in_transit", "delivered"]
    ).exists():
        raise ValidationError("راننده یک سفر فعال دارد.")
    shipment.driver = driver
    shipment.inspector = inspector
    shipment.status = "assigned"
    if amount is not None:
        shipment.price = amount
    shipment.save()
    event(shipment, user, "راننده و متصدی به محموله تخصیص داده شدند.")
    return shipment
