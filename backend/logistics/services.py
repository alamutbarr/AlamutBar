import secrets
from datetime import timedelta
from math import asin, cos, radians, sin, sqrt
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
        shipment.cancel_reason = note.strip()[:1000]
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
            and (shipment.sensitive or shipment.requires_inspector)
            and not shipment.inspector_id
        ):
            raise ValidationError("برای بار حساس، تخصیص متصدی الزامی است.")
        if target in ["in_transit", "completed"]:
            stage = "loading" if target == "in_transit" else "delivery"
            latest = shipment.inspections.filter(stage=stage).first()
            if not latest or not latest.passed:
                raise ValidationError("تأیید بازرسی این مرحله الزامی است.")
        if target == "in_transit" and not waybill_is_ready(shipment):
            raise ValidationError(
                "شروع حرکت پس از تأیید کد بارنامه و بارگذاری عکس آن مجاز است."
            )
    if target == "delivered" and not shipment.delivery_otp:
        shipment.delivery_otp = f"{secrets.randbelow(900000) + 100000}"
    shipment.status = target
    shipment.save(
        update_fields=["status", "updated_at", "cancel_reason", "delivery_otp"]
    )
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


def waybill_is_ready(shipment):
    record = Waybill.objects.filter(shipment=shipment).first()
    if record and record.verified_at and record.photo:
        return True
    return bool(shipment.waybill_verified_at and shipment.waybill_photo)


def _operator(user):
    if user.role != "operator":
        raise PermissionDenied("این کار فقط برای اپراتور است.")


@transaction.atomic
def issue_waybill(shipment_id, user):
    _operator(user)
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if shipment.status not in ["assigned", "loading", "arrived_pickup", "waybill"]:
        raise ValidationError("کد بارنامه پس از تخصیص راننده و پیش از حرکت صادر می‌شود.")
    if not shipment.driver_id:
        raise ValidationError("ابتدا راننده را تخصیص دهید.")
    if shipment.inspector_id or shipment.sensitive or shipment.requires_inspector:
        latest = shipment.inspections.filter(stage="loading", passed=True).first()
        if not latest:
            raise ValidationError("تا تأیید بازرسی بارگیری، بارنامه صادر نمی‌شود.")
    shipment.waybill_code = f"{secrets.randbelow(90000) + 10000}"
    shipment.waybill_sent_at = timezone.now()
    shipment.waybill_verified_at = None
    shipment.save(
        update_fields=["waybill_code", "waybill_sent_at", "waybill_verified_at"]
    )
    from .driver_flow import _sign, queue_sms

    waybill, _ = Waybill.objects.get_or_create(shipment=shipment)
    waybill.code_signed = _sign(shipment.waybill_code)
    waybill.sms_sent_at = shipment.waybill_sent_at
    waybill.verified_at = None
    waybill.save()
    if shipment.driver_id:
        queue_sms(
            shipment.driver.phone,
            f"کد بارنامه {shipment.code}: {shipment.waybill_code}",
        )
    OutboundEmail.objects.create(
        payload=f"کد بارنامه {shipment.code} برای {shipment.driver.phone}: {shipment.waybill_code}"
    )
    audit(user, "shipment.waybill_sms", shipment, {})
    event(shipment, user, "کد بارنامه برای راننده ارسال شد.")
    return shipment


@transaction.atomic
def confirm_waybill(shipment_id, user, code):
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if user.role != "driver" or shipment.driver_id != user.pk:
        raise PermissionDenied("فقط راننده همین بار کد را تأیید می‌کند.")
    if not shipment.waybill_code or shipment.waybill_code != str(code or "").strip():
        raise ValidationError("کد بارنامه نادرست است.")
    shipment.waybill_verified_at = timezone.now()
    shipment.save(update_fields=["waybill_verified_at"])
    waybill = Waybill.objects.filter(shipment=shipment).first()
    if waybill:
        waybill.verified_at = shipment.waybill_verified_at
        waybill.save(update_fields=["verified_at"])
    audit(user, "shipment.waybill_confirm", shipment, {})
    event(shipment, user, "راننده کد بارنامه را تأیید کرد.")
    return shipment


@transaction.atomic
def save_waybill_photo(shipment_id, user, photo):
    _operator(user)
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if not shipment.waybill_verified_at:
        raise ValidationError("اول راننده باید کد بارنامه را تأیید کند.")
    if not photo:
        raise ValidationError("عکس بارنامه را انتخاب کنید.")
    if photo.size > 5 * 1024 * 1024:
        raise ValidationError("حجم عکس بارنامه بیشتر از ۵ مگابایت است.")
    if photo.content_type not in ["image/jpeg", "image/png", "image/webp"]:
        raise ValidationError("عکس بارنامه باید JPG، PNG یا WEBP باشد.")
    shipment.waybill_photo = photo
    shipment.save(update_fields=["waybill_photo"])
    waybill = Waybill.objects.filter(shipment=shipment).first()
    if waybill and shipment.waybill_photo:
        shipment.waybill_photo.open("rb")
        waybill.photo.save(photo.name[:180], shipment.waybill_photo.file, save=False)
        waybill.photo_name = photo.name[:180]
        waybill.save(update_fields=["photo", "photo_name"])
        shipment.waybill_photo.close()
    audit(user, "shipment.waybill_photo", shipment, {})
    event(shipment, user, "عکس بارنامه بارگذاری شد.")
    return shipment


def penalty_amount(delay_minutes, freight, force_majeure=False):
    minutes = max(0, int(delay_minutes or 0))
    if force_majeure or minutes <= 0:
        return 0
    steps = minutes // 30
    raw = steps * 50000
    cap = round(int(freight or 0) * 0.15)
    return min(raw, cap)


@transaction.atomic
def record_penalty(shipment_id, user, delay_minutes, force_majeure=False, reason=""):
    _operator(user)
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if shipment.status not in ["in_transit", "delivered", "completed"]:
        raise ValidationError("جریمه تأخیر پس از شروع حمل ثبت می‌شود.")
    reason = str(reason or "").strip()
    if force_majeure and len(reason) < 3:
        raise ValidationError("دلیل فورس‌ماژور را بنویسید.")
    shipment.delay_minutes = max(0, int(delay_minutes or 0))
    shipment.force_majeure = bool(force_majeure)
    shipment.force_majeure_reason = reason[:500]
    shipment.penalty_amount = penalty_amount(
        shipment.delay_minutes, shipment.price, shipment.force_majeure
    )
    shipment.save(
        update_fields=[
            "delay_minutes",
            "force_majeure",
            "force_majeure_reason",
            "penalty_amount",
        ]
    )
    audit(
        user,
        "shipment.penalty",
        shipment,
        {"amount": shipment.penalty_amount, "minutes": shipment.delay_minutes},
    )
    event(
        shipment,
        user,
        "جریمه تأخیر صفر شد."
        if shipment.penalty_amount == 0
        else f"جریمه تأخیر {shipment.penalty_amount} تومان ثبت شد.",
    )
    return shipment


@transaction.atomic
def replace_driver(shipment_id, user, reason):
    _operator(user)
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if shipment.status not in ["assigned", "loading"]:
        raise ValidationError("جایگزینی راننده فقط پیش از شروع حرکت مجاز است.")
    if not shipment.driver_id:
        raise ValidationError("این بار راننده ندارد.")
    note = str(reason or "").strip()
    if len(note) < 3:
        raise ValidationError("دلیل جایگزینی راننده را بنویسید.")
    shipment.driver = None
    shipment.status = "approved"
    shipment.waybill_code = ""
    shipment.waybill_sent_at = None
    shipment.waybill_verified_at = None
    shipment.waybill_photo = None
    shipment.save(
        update_fields=[
            "driver",
            "status",
            "waybill_code",
            "waybill_sent_at",
            "waybill_verified_at",
            "waybill_photo",
        ]
    )
    audit(user, "shipment.replace_driver", shipment, {"reason": note})
    event(shipment, user, f"راننده کنار رفت و بار دوباره آماده تخصیص است. {note}")
    return shipment


@transaction.atomic
def add_note(shipment_id, user, body):
    _operator(user)
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    text = str(body or "").strip()
    if len(text) < 2:
        raise ValidationError("متن یادداشت را بنویسید.")
    event(shipment, user, text[:1000])
    audit(user, "shipment.note", shipment, {})
    return shipment


def _km(a, b):
    lat1, lon1, lat2, lon2 = [radians(float(v)) for v in (*a, *b)]
    dlat, dlon = lat2 - lat1, lon2 - lon1
    h = sin(dlat / 2) ** 2 + cos(lat1) * cos(lat2) * sin(dlon / 2) ** 2
    return 2 * 6371 * asin(sqrt(h))


def _off_route_km(point, start, end):
    length = _km(start, end)
    if length == 0:
        return _km(point, start)
    along = min(1, max(0, (_km(start, point) ** 2 + length ** 2 - _km(point, end) ** 2) / (2 * length * length)))
    # Equirectangular interpolation is enough to reject a point far from the corridor.
    lat = float(start[0]) + (float(end[0]) - float(start[0])) * along
    lng = float(start[1]) + (float(end[1]) - float(start[1])) * along
    return _km(point, (lat, lng))


def _open_alert(shipment, kind, severity, message):
    row = shipment.alerts.filter(kind=kind, is_resolved=False).first()
    if row:
        if row.message != message or row.severity != severity:
            row.message = message
            row.severity = severity
            row.save(update_fields=["message", "severity"])
        return row
    return OperationalAlert.objects.create(
        shipment=shipment, kind=kind, severity=severity, message=message[:300]
    )


def scan_alerts(now=None):
    now = now or timezone.now()
    stale = timedelta(minutes=10)
    for shipment in Shipment.objects.filter(status="in_transit").prefetch_related("locations"):
        ping = shipment.locations.order_by("-observed_at").first()
        if not ping or now - ping.observed_at > stale:
            age = "هیچ موقعیت معتبری ثبت نشده است."
            if ping:
                minutes = int((now - ping.observed_at).total_seconds() // 60)
                age = f"آخرین موقعیت معتبر {minutes} دقیقه پیش است."
            _open_alert(shipment, "gps_cut", "critical", f"قطع GPS. {age}")
        if (
            ping
            and shipment.origin_lat is not None
            and shipment.destination_lat is not None
        ):
            off = _off_route_km(
                (ping.latitude, ping.longitude),
                (shipment.origin_lat, shipment.origin_lng),
                (shipment.destination_lat, shipment.destination_lng),
            )
            if off > 10:
                severity = "critical" if off > 25 else "warning"
                _open_alert(
                    shipment,
                    "route_deviation",
                    severity,
                    f"انحراف {off:.1f} کیلومتر از مسیر.",
                )
    for shipment in Shipment.objects.filter(
        status__in=["assigned", "loading"], pickup_date__lt=timezone.localdate()
    ):
        _open_alert(
            shipment,
            "delay",
            "warning",
            f"تاریخ بارگیری {shipment.pickup_date} گذشته و بار هنوز حرکت نکرده است.",
        )
    cutoff = now - timedelta(minutes=45)
    for shipment in Shipment.objects.filter(
        status="loading", inspector__isnull=False, updated_at__lt=cutoff
    ):
        if not shipment.inspections.filter(stage="loading").exists():
            _open_alert(
                shipment,
                "inspector_absent",
                "warning",
                "متصدی برای بازرسی بارگیری حاضر نشده است.",
            )
    return OperationalAlert.objects.filter(is_resolved=False).count()


@transaction.atomic
def resolve_alert(alert_id, user, resolution):
    _operator(user)
    alert = OperationalAlert.objects.select_for_update().get(pk=alert_id)
    text = str(resolution or "").strip()
    if len(text) < 3:
        raise ValidationError("شرح اقدام برای بستن هشدار لازم است.")
    alert.is_resolved = True
    alert.resolution = text[:500]
    alert.resolved_by = user
    alert.resolved_at = timezone.now()
    alert.save(
        update_fields=["is_resolved", "resolution", "resolved_by", "resolved_at"]
    )
    audit(user, "alert.resolve", alert, {"kind": alert.kind})
    return alert
