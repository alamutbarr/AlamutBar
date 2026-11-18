"""Driver accept, waybill, proof of delivery, chat, search and phone login."""

import hashlib
import math
import secrets
from datetime import timedelta

from django.conf import settings
from django.core.signing import Signer, BadSignature
from django.db import transaction
from django.db.models import Q
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import (
    DeliveryPhoto,
    DeliveryProof,
    DriverPass,
    Notification,
    PhoneLoginCode,
    Shipment,
    ShipmentMessage,
    SmsOutbox,
    User,
    Vehicle,
    Waybill,
)
from .places import CITIES, lookup
from .services import (
    ACTIVE_TRIP,
    GPS_STATUSES,
    audit,
    driver_market_enabled,
    event,
)

ONE_ACTIVE = "شما هم‌اکنون یک بار فعال دارید. تا پایان یا لغو آن مأموریت نمی‌توانید بار دیگری را قبول کنید."
DOCS_REQUIRED = "تا وقتی مدارک ارسالی از پنل ادمین تأیید نشده، نمی‌توانید باری را قبول کنید."


def _hash(code):
    return hashlib.sha256(f"{settings.SECRET_KEY}:{code}".encode()).hexdigest()


def _sign(code):
    return Signer().sign(code)


def reveal_code(signed):
    if not signed:
        return ""
    try:
        return Signer().unsign(signed)
    except BadSignature:
        return ""


def _codes_match(signed, provided):
    expected = reveal_code(signed)
    return bool(expected) and secrets.compare_digest(expected, str(provided or "").strip())


def queue_sms(phone, body):
    SmsOutbox.objects.create(phone=phone, body=body[:500])


def notify_matching_drivers(shipment):
    drivers = User.objects.filter(
        role="driver",
        is_active=True,
        verified=True,
        vehicle__kind=shipment.vehicle_type,
        vehicle__available=True,
    )
    rows = []
    for driver in drivers:
        if not driver_market_enabled(driver):
            continue
        rows.append(
            Notification(
                user=driver,
                shipment=shipment,
                kind="offer",
                title=f"پیشنهاد مأموریت {shipment.code}",
                body=f"{shipment.origin} به {shipment.destination}",
            )
        )
    if rows:
        Notification.objects.bulk_create(rows)


def _active_exists(driver, except_id=None):
    qs = Shipment.objects.filter(driver=driver, status__in=ACTIVE_TRIP)
    if except_id:
        qs = qs.exclude(pk=except_id)
    return qs.exists()


def _lock_market(shipment_id):
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    return shipment


@transaction.atomic
def accept_shipment(user, shipment_id):
    if user.role != "driver":
        raise PermissionDenied()
    driver = User.objects.select_for_update().get(pk=user.pk)
    if not driver_market_enabled(driver):
        raise PermissionDenied(DOCS_REQUIRED)
    shipment = _lock_market(shipment_id)
    if shipment.status != "approved":
        raise ValidationError("این بار دیگر قابل قبول نیست.")
    if shipment.offer_expires_at and shipment.offer_expires_at <= timezone.now():
        raise ValidationError("مهلت قبول این پیشنهاد تمام شده است.")
    if DriverPass.objects.filter(shipment=shipment, driver=driver).exists():
        raise ValidationError("این پیشنهاد را رد کرده‌اید.")
    if _active_exists(driver):
        raise ValidationError(ONE_ACTIVE)
    vehicle = Vehicle.objects.filter(driver=driver).first()
    if not vehicle or not vehicle.available:
        raise ValidationError("ناوگان شما آماده دریافت بار نیست.")
    if vehicle.kind != shipment.vehicle_type or vehicle.capacity < shipment.weight:
        raise ValidationError("نوع یا ظرفیت خودرو با این بار مطابقت ندارد.")
    shipment.driver = driver
    shipment.status = "assigned"
    shipment.save(update_fields=["driver", "status", "updated_at"])
    event(shipment, driver, "راننده مأموریت را قبول کرد.")
    audit(driver, "shipment.accept", shipment)
    return shipment


@transaction.atomic
def decline_shipment(user, shipment_id):
    if user.role != "driver":
        raise PermissionDenied()
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if shipment.status != "approved" or shipment.driver_id:
        raise ValidationError("فقط پیشنهاد باز را می‌توان رد کرد.")
    DriverPass.objects.get_or_create(shipment=shipment, driver=user)
    audit(user, "shipment.decline", shipment)
    return shipment


def _driver_shipment(user, shipment_id):
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if user.role != "driver" or shipment.driver_id != user.pk:
        raise PermissionDenied("این سفر به شما تخصیص ندارد.")
    return shipment


@transaction.atomic
def issue_waybill(user, shipment_id):
    if user.role != "operator":
        raise PermissionDenied()
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if shipment.status not in ["arrived_pickup", "loading", "waybill"]:
        raise ValidationError("بارنامه بعد از رسیدن راننده به بارگیری صادر می‌شود.")
    latest = shipment.inspections.filter(stage="loading").first()
    if not latest or not latest.passed:
        raise ValidationError("ابتدا بازرسی بارگیری باید تأیید شود.")
    code = f"{secrets.randbelow(10000):04d}"
    waybill, _ = Waybill.objects.get_or_create(shipment=shipment)
    waybill.code_signed = _sign(code)
    waybill.sms_sent_at = timezone.now()
    waybill.verified_at = None
    waybill.save()
    if shipment.status != "waybill":
        shipment.status = "waybill"
        shipment.save(update_fields=["status", "updated_at"])
        event(shipment, user, "کد بارنامه برای راننده ارسال شد.")
    if shipment.driver_id:
        queue_sms(shipment.driver.phone, f"کد بارنامه {shipment.code}: {code}")
        Notification.objects.create(
            user=shipment.driver,
            shipment=shipment,
            kind="info",
            title="کد بارنامه پیامک شد",
            body="کد چهار رقمی را در صفحه سفر وارد کنید.",
        )
    audit(user, "waybill.issue", shipment)
    return code


@transaction.atomic
def verify_waybill(user, shipment_id, code):
    shipment = _driver_shipment(user, shipment_id)
    waybill = Waybill.objects.filter(shipment=shipment).first()
    if not waybill or not waybill.sms_sent_at:
        raise ValidationError("هنوز کد بارنامه صادر نشده است.")
    if not _codes_match(waybill.code_signed, code):
        raise ValidationError("کد بارنامه نادرست است.")
    waybill.verified_at = timezone.now()
    waybill.save(update_fields=["verified_at"])
    event(shipment, user, "راننده کد بارنامه را تأیید کرد.")
    return shipment


@transaction.atomic
def save_waybill_photo(user, shipment_id, uploaded):
    if user.role != "operator":
        raise PermissionDenied()
    from .operations import validate_upload

    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    waybill = Waybill.objects.filter(shipment=shipment).first()
    if not waybill or not waybill.verified_at:
        raise ValidationError("ابتدا راننده باید کد بارنامه را تأیید کند.")
    uploaded = validate_upload(uploaded)
    waybill.photo = uploaded
    waybill.photo_name = uploaded.name[:180]
    waybill.save()
    event(shipment, user, "عکس بارنامه بارگذاری شد.")
    if shipment.driver_id:
        Notification.objects.create(
            user=shipment.driver,
            shipment=shipment,
            title="عکس بارنامه آماده است",
            body="پس از دیدن عکس می‌توانید حرکت را شروع کنید.",
        )
    return waybill


@transaction.atomic
def request_delivery_code(user, shipment_id):
    shipment = _driver_shipment(user, shipment_id)
    if shipment.status != "near_destination":
        raise ValidationError("کد تحویل پس از رسیدن به مقصد صادر می‌شود.")
    code = f"{secrets.randbelow(10000):04d}"
    proof, _ = DeliveryProof.objects.get_or_create(shipment=shipment)
    proof.code_signed = _sign(code)
    proof.otp_sent_at = timezone.now()
    proof.verified = False
    proof.save()
    queue_sms(shipment.recipient_phone, f"کد تحویل بار {shipment.code}: {code}")
    Notification.objects.create(
        user=shipment.owner,
        shipment=shipment,
        title="کد تحویل برای گیرنده ارسال شد",
        body="گیرنده کد را به راننده اعلام می‌کند.",
    )
    audit(user, "delivery.otp", shipment)
    return shipment


@transaction.atomic
def add_delivery_photo(user, shipment_id, uploaded):
    shipment = _driver_shipment(user, shipment_id)
    if shipment.status != "near_destination":
        raise ValidationError("عکس تحویل فقط نزدیک مقصد ثبت می‌شود.")
    from .operations import validate_upload

    uploaded = validate_upload(uploaded)
    if shipment.delivery_photos.count() >= 5:
        raise ValidationError("حداکثر ۵ عکس تحویل ثبت می‌شود.")
    return DeliveryPhoto.objects.create(
        shipment=shipment, uploaded_by=user, file=uploaded
    )


@transaction.atomic
def complete_delivery(user, shipment_id, code="", reason=""):
    shipment = _driver_shipment(user, shipment_id)
    if shipment.status != "near_destination":
        raise ValidationError("تحویل فقط پس از رسیدن به مقصد ثبت می‌شود.")
    if shipment.delivery_photos.count() < 3:
        raise ValidationError("حداقل ۳ عکس از پلمب و بار الزامی است.")
    proof = DeliveryProof.objects.filter(shipment=shipment).first()
    reason = (reason or "").strip()
    if code:
        if not proof or not proof.otp_sent_at or not _codes_match(proof.code_signed, code):
            raise ValidationError("کد تحویل نادرست است.")
        proof.verified = True
        proof.save(update_fields=["verified"])
        note = "کد تحویل تأیید شد و تخلیه ثبت شد."
    else:
        if len(reason) < 5:
            raise ValidationError("ذکر دلیل تحویل بدون کد الزامی است.")
        if proof is None:
            proof = DeliveryProof.objects.create(shipment=shipment)
        proof.exception_reason = reason[:500]
        proof.save(update_fields=["exception_reason"])
        note = "تحویل بدون کد، با دلیل: " + reason[:180]
        if shipment.inspector_id:
            Notification.objects.create(
                user_id=shipment.inspector_id,
                shipment=shipment,
                title="تحویل بدون کد ثبت شد",
                body=reason[:180],
            )
        Notification.objects.create(
            user=shipment.owner,
            shipment=shipment,
            title="تحویل بدون کد ثبت شد",
            body=reason[:180],
        )
    shipment.status = "delivered"
    shipment.save(update_fields=["status", "updated_at"])
    event(shipment, user, note)
    return shipment


def _chat_allowed(user, shipment):
    if user.role == "operator":
        return True
    return user.role == "driver" and shipment.driver_id == user.pk


def list_messages(user, shipment):
    if not _chat_allowed(user, shipment):
        raise PermissionDenied()
    return shipment.messages.select_related("sender")


@transaction.atomic
def post_message(user, shipment_id, body):
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if not _chat_allowed(user, shipment) or not shipment.driver_id:
        raise PermissionDenied()
    body = (body or "").strip()
    if not body or len(body) > 1000:
        raise ValidationError("متن پیام باید بین ۱ تا ۱۰۰۰ نویسه باشد.")
    message = ShipmentMessage.objects.create(shipment=shipment, sender=user, body=body)
    target_id = shipment.driver_id if user.role == "operator" else None
    if user.role == "driver":
        operators = User.objects.filter(role="operator", is_active=True)[:5]
        Notification.objects.bulk_create(
            [
                Notification(
                    user=operator,
                    shipment=shipment,
                    title=f"پیام راننده در {shipment.code}",
                    body=body[:180],
                )
                for operator in operators
            ]
        )
    elif target_id:
        Notification.objects.create(
            user_id=target_id,
            shipment=shipment,
            title=f"پیام اپراتور در {shipment.code}",
            body=body[:180],
        )
    return message


def haversine(lat1, lng1, lat2, lng2):
    radius = 6371
    p1, p2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlng = math.radians(lng2 - lng1)
    a = math.sin(dphi / 2) ** 2 + math.cos(p1) * math.cos(p2) * math.sin(dlng / 2) ** 2
    return 2 * radius * math.asin(math.sqrt(a))


def shipment_origin(shipment):
    if shipment.origin_lat is not None and shipment.origin_lng is not None:
        return float(shipment.origin_lat), float(shipment.origin_lng)
    city = lookup(shipment.origin)
    if not city:
        return None
    return city["lat"], city["lng"]


def route_estimate(shipment):
    origin = shipment_origin(shipment)
    if shipment.dest_lat is not None and shipment.dest_lng is not None:
        dest = (float(shipment.dest_lat), float(shipment.dest_lng))
    else:
        city = lookup(shipment.destination)
        dest = (city["lat"], city["lng"]) if city else None
    if not origin or not dest:
        return None, None
    km = round(haversine(origin[0], origin[1], dest[0], dest[1]))
    hours = max(1, round(km / 60))
    return km, hours


def search_market(user, origin="", destination=""):
    if not driver_market_enabled(user):
        raise PermissionDenied(DOCS_REQUIRED)
    qs = Shipment.objects.filter(status="approved").exclude(passes__driver=user)
    qs = qs.exclude(offer_expires_at__lt=timezone.now())
    if origin:
        qs = qs.filter(origin__icontains=origin.strip())
    if destination:
        city = lookup(destination.strip())
        if city:
            qs = qs.filter(
                Q(destination__icontains=destination.strip())
                | Q(destination__icontains=city["province"])
            )
        else:
            qs = qs.filter(destination__icontains=destination.strip())
    return qs.order_by("-created_at")[:30]


def nearby_market(user, lat, lng, dest_province="", band=50):
    if not driver_market_enabled(user):
        raise PermissionDenied(DOCS_REQUIRED)
    try:
        lat = float(lat)
        lng = float(lng)
        band = int(band)
    except (TypeError, ValueError):
        raise ValidationError("مختصات و شعاع معتبر نیست.")
    if not (-90 <= lat <= 90 and -180 <= lng <= 180):
        raise ValidationError("مختصات معتبر نیست.")
    if band not in (50, 100, 200, 500):
        band = 50
    province = lookup(dest_province)
    rows = []
    qs = (
        Shipment.objects.filter(status="approved")
        .exclude(passes__driver=user)
        .exclude(offer_expires_at__lt=timezone.now())
    )
    for shipment in qs[:200]:
        origin = shipment_origin(shipment)
        if not origin:
            continue
        distance = haversine(lat, lng, origin[0], origin[1])
        if distance > band:
            continue
        if dest_province:
            dest_city = lookup(shipment.destination)
            province_name = province["province"] if province else dest_province
            if province_name not in shipment.destination and not (
                dest_city and dest_city["province"] == province_name
            ):
                continue
        rows.append((distance, shipment))
    rows.sort(key=lambda item: item[0])
    return [{"distance_km": round(distance, 1), "shipment": shipment} for distance, shipment in rows]


def request_phone_code(phone):
    phone = str(phone or "").strip()
    if len(phone) != 11 or not phone.startswith("09") or not phone.isdigit():
        raise ValidationError("شماره موبایل معتبر نیست.")
    recent = PhoneLoginCode.objects.filter(
        phone=phone, created_at__gte=timezone.now() - timedelta(minutes=10)
    ).count()
    if recent >= 5:
        raise ValidationError("تعداد درخواست کد زیاد است. کمی بعد دوباره تلاش کنید.")
    code = f"{secrets.randbelow(10000):04d}"
    PhoneLoginCode.objects.create(
        phone=phone,
        code_hash=_hash(code),
        expires_at=timezone.now() + timedelta(minutes=2),
    )
    queue_sms(phone, f"کد ورود الموت: {code}")
    return phone


def verify_phone_code(phone, code):
    phone = str(phone or "").strip()
    record = (
        PhoneLoginCode.objects.filter(phone=phone).order_by("-created_at").first()
    )
    if not record or record.expires_at < timezone.now() or record.attempts >= 5:
        raise ValidationError("کد منقضی یا نامعتبر است.")
    record.attempts += 1
    record.save(update_fields=["attempts"])
    if not secrets.compare_digest(record.code_hash, _hash(str(code or "").strip())):
        raise ValidationError("کد واردشده اشتباه است.")
    user = User.objects.filter(phone=phone, is_active=True).first()
    if not user:
        raise ValidationError("حسابی با این شماره پیدا نشد. ابتدا ثبت‌نام کنید.")
    record.delete()
    return user


def driver_summary(user):
    if user.role != "driver":
        return None
    trips = Shipment.objects.filter(driver=user)
    scores = [
        trip.rating.driver_score
        for trip in trips.filter(rating__isnull=False).select_related("rating")
    ]
    rejected = []
    profile = getattr(user, "driver_profile", None)
    if profile:
        for doc in user.credentials.filter(status="rejected"):
            rejected.append(
                {"label": doc.get_kind_display(), "note": doc.note, "kind": doc.kind}
            )
    return {
        "offered": Shipment.objects.filter(status="approved")
        .exclude(passes__driver=user)
        .exclude(offer_expires_at__lt=timezone.now())
        .count()
        if driver_market_enabled(user)
        else 0,
        "active": trips.filter(status__in=ACTIVE_TRIP).exclude(status="delivered").count(),
        "completed": trips.filter(status__in=["delivered", "completed"]).count(),
        "rating": round(sum(scores) / len(scores), 1) if scores else None,
        "mission_count": trips.exclude(status="cancelled").count(),
        "joined": user.date_joined,
        "rejected_documents": rejected,
        "support_phone": getattr(settings, "SUPPORT_PHONE", "02112345678"),
    }


def places_payload(query=""):
    query = (query or "").strip()
    cities = CITIES
    if query:
        cities = [
            city
            for city in CITIES
            if query in city["name"] or query in city["province"]
        ]
    return {"provinces": sorted({city["province"] for city in CITIES}), "cities": cities}
