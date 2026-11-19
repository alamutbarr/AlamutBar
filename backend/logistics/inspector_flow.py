"""Field inspector missions, checklist photos, and operator decisions."""

from decimal import Decimal, InvalidOperation

from django.db import transaction
from django.utils import timezone
from rest_framework.exceptions import PermissionDenied, ValidationError

from .models import Inspection, InspectionPhoto, InspectorAccount, Notification, Shipment, User
from .services import audit, event

CHECKLIST = [
    {"key": "vehicle_present", "label": "خودرو در محل بارگیری حاضر است"},
    {"key": "vehicle_match", "label": "خودرو با مأموریت می‌خواند"},
    {"key": "cargo_identity", "label": "هویت محموله با درخواست یکی است"},
    {"key": "cargo_info", "label": "اطلاعات ثبت‌شده بار درست است"},
    {"key": "seal", "label": "پلمب سالم است"},
    {"key": "lashing", "label": "مهار بار درست است"},
]
PHOTO_KINDS = {
    "seal",
    "lashing",
    "weighbridge_empty",
    "weighbridge_full",
    "cargo",
    "other",
}
OPEN_STATUSES = [
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
CLOSED = {"completed", "cancelled"}


def merge_checklist(saved):
    saved = {item.get("key"): item for item in (saved or []) if isinstance(item, dict)}
    rows = []
    for item in CHECKLIST:
        current = saved.get(item["key"], {})
        rows.append(
            {
                "key": item["key"],
                "label": item["label"],
                "checked": bool(current.get("checked")),
                "note": str(current.get("note") or "")[:300],
            }
        )
    return rows


def _inspector_shipment(user, shipment_id):
    shipment = Shipment.objects.select_for_update().get(pk=shipment_id)
    if user.role != "inspector" or shipment.inspector_id != user.id:
        raise PermissionDenied("این مأموریت به شما تخصیص ندارد.")
    return shipment


def _open_inspection(shipment, user, stage):
    report = (
        shipment.inspections.filter(stage=stage, decision="pending").order_by("-id").first()
    )
    if report:
        return report
    return Inspection.objects.create(
        shipment=shipment,
        inspector=user,
        stage=stage,
        packaging_ok=False,
        weight_ok=False,
        vehicle_ok=False,
        seal_number="",
        passed=False,
        decision="pending",
        checklist=merge_checklist([]),
    )


@transaction.atomic
def save_inspection_photo(user, shipment_id, uploaded, kind):
    shipment = _inspector_shipment(user, shipment_id)
    if kind not in PHOTO_KINDS:
        raise ValidationError("نوع عکس بازرسی معتبر نیست.")
    from .operations import validate_upload

    uploaded = validate_upload(uploaded)
    if uploaded.size > 5 * 1024 * 1024:
        raise ValidationError("حجم عکس بازرسی بیشتر از ۵ مگابایت است.")
    stage = "delivery" if shipment.status in ["near_destination", "delivered"] else "loading"
    report = _open_inspection(shipment, user, stage)
    photo = InspectionPhoto.objects.create(inspection=report, kind=kind, file=uploaded)
    audit(user, "inspection.photo", photo, {"kind": kind})
    return report


@transaction.atomic
def save_inspection_report(user, shipment_id, payload):
    shipment = _inspector_shipment(user, shipment_id)
    stage = payload.get("stage") or (
        "delivery" if shipment.status in ["near_destination", "delivered"] else "loading"
    )
    if stage not in ("loading", "delivery"):
        raise ValidationError("مرحله بازرسی معتبر نیست.")
    allowed = (
        ["loading", "arrived_pickup", "waybill", "on_hold"]
        if stage == "loading"
        else ["near_destination", "delivered", "on_hold"]
    )
    if shipment.status not in allowed:
        raise ValidationError("وضعیت بار با مرحله بازرسی مطابقت ندارد.")
    report = _open_inspection(shipment, user, stage)
    checklist = merge_checklist(payload.get("checklist"))
    report.checklist = checklist
    report.notes = str(payload.get("notes") or "")[:2000]
    report.seal_number = str(payload.get("seal_number") or report.seal_number or "")[:60]
    report.actual_cargo_type = str(payload.get("actual_cargo_type") or "")[:80]
    report.actual_vehicle = str(payload.get("actual_vehicle") or "")[:80]
    for key in ("weight_empty", "weight_full", "recorded_cargo_value"):
        raw = payload.get(key)
        if raw in (None, ""):
            continue
        try:
            setattr(
                report,
                key,
                int(raw) if key == "recorded_cargo_value" else Decimal(str(raw)),
            )
        except (InvalidOperation, TypeError, ValueError):
            raise ValidationError("مقدار وزن یا ارزش معتبر نیست.")
    if report.weight_empty is not None and report.weight_full is not None:
        report.weight_net = report.weight_full - report.weight_empty
    checked = {item["key"]: item["checked"] for item in checklist}
    report.packaging_ok = bool(checked.get("cargo_info") and checked.get("cargo_identity"))
    report.weight_ok = report.weight_net is not None or bool(checked.get("seal"))
    report.vehicle_ok = bool(checked.get("vehicle_present") and checked.get("vehicle_match"))
    report.discrepancies = [
        item["label"] for item in checklist if not item["checked"]
    ]
    manual = str(payload.get("discrepancy_note") or "").strip()
    if manual:
        report.discrepancies.append(manual[:300])
    finalize = payload.get("finalize") in [True, "true", "1", 1]
    if finalize:
        if report.photos.count() < 1:
            raise ValidationError("حداقل یک عکس بازرسی لازم است.")
        report.decision = "pending"
        report.passed = False
        event(shipment, user, "گزارش بازرسی برای مرکز عملیات ارسال شد.")
        for operator in User.objects.filter(role="operator", is_active=True)[:10]:
            Notification.objects.create(
                user=operator,
                shipment=shipment,
                title=f"گزارش بازرسی {shipment.code}",
                body="گزارش متصدی منتظر تأیید یا توقف است.",
            )
    report.save()
    audit(user, "inspection.report", report, {"finalize": finalize})
    return report


def _release(shipment, user, note):
    if shipment.status == "on_hold":
        shipment.status = shipment.hold_resume or "loading"
        shipment.hold_resume = ""
        shipment.save(update_fields=["status", "hold_resume", "updated_at"])
    event(shipment, user, note)
    if shipment.driver_id:
        Notification.objects.create(
            user_id=shipment.driver_id,
            shipment=shipment,
            title="بازرسی تأیید شد",
            body=note[:180],
        )
    if shipment.owner_id:
        Notification.objects.create(
            user_id=shipment.owner_id,
            shipment=shipment,
            title="بازرسی تأیید شد",
            body=note[:180],
        )


def _stop(shipment, user, note):
    if shipment.status != "on_hold":
        shipment.hold_resume = shipment.status
        shipment.status = "on_hold"
        shipment.save(update_fields=["status", "hold_resume", "updated_at"])
    event(shipment, user, "توقف به‌خاطر مغایرت: " + note[:180])
    for person_id in (shipment.driver_id, shipment.owner_id):
        if person_id:
            Notification.objects.create(
                user_id=person_id,
                shipment=shipment,
                title="مأموریت موقتاً متوقف شد",
                body=note[:180],
            )


@transaction.atomic
def decide_inspection(user, inspection_id, decision, note):
    if user.role != "operator":
        raise PermissionDenied()
    report = Inspection.objects.select_for_update().select_related("shipment").get(pk=inspection_id)
    if decision not in ("approved", "corrected", "stopped"):
        raise ValidationError("تصمیم بازرسی معتبر نیست.")
    note = str(note or "").strip()
    if len(note) < 3:
        raise ValidationError("یادداشت تصمیم حداقل ۳ نویسه است.")
    shipment = Shipment.objects.select_for_update().get(pk=report.shipment_id)
    report.decision = decision
    report.decision_note = note[:500]
    report.passed = decision in ("approved", "corrected")
    report.save(update_fields=["decision", "decision_note", "passed"])
    if decision == "stopped":
        _stop(shipment, user, note)
    else:
        _release(shipment, user, "بازرسی تأیید شد." if decision == "approved" else "بازرسی با اصلاح تأیید شد.")
    audit(user, "inspection.decision", report, {"decision": decision})
    return shipment


def _split_name(full_name):
    parts = [part for part in str(full_name or "").split() if part]
    if not parts:
        raise ValidationError("نام متصدی را بنویسید.")
    return parts[0][:150], " ".join(parts[1:])[:150] or "متصدی"


@transaction.atomic
def create_inspector(user, full_name, phone, notes=""):
    if user.role != "operator":
        raise PermissionDenied()
    phone = str(phone or "").strip()
    if len(phone) != 11 or not phone.startswith("09") or not phone.isdigit():
        raise ValidationError("شماره موبایل معتبر نیست.")
    if User.objects.filter(phone=phone).exists():
        raise ValidationError("این شماره قبلاً ثبت شده است.")
    first, last = _split_name(full_name)
    username = "inspector" + phone
    created = User(
        username=username,
        phone=phone,
        first_name=first,
        last_name=last,
        role="inspector",
        verified=True,
        is_active=True,
    )
    created.set_unusable_password()
    created.save()
    account = InspectorAccount.objects.create(user=created, notes=str(notes or "")[:500])
    audit(user, "inspector.create", created, {})
    return account


@transaction.atomic
def update_inspector(user, inspector_id, payload):
    if user.role != "operator":
        raise PermissionDenied()
    inspector = User.objects.select_for_update().get(pk=inspector_id, role="inspector")
    account, _ = InspectorAccount.objects.get_or_create(user=inspector)
    if "full_name" in payload:
        first, last = _split_name(payload.get("full_name"))
        inspector.first_name = first
        inspector.last_name = last
    if "phone" in payload:
        phone = str(payload.get("phone") or "").strip()
        if len(phone) != 11 or not phone.startswith("09") or not phone.isdigit():
            raise ValidationError("شماره موبایل معتبر نیست.")
        if User.objects.exclude(pk=inspector.pk).filter(phone=phone).exists():
            raise ValidationError("این شماره قبلاً ثبت شده است.")
        inspector.phone = phone
    if "notes" in payload:
        account.notes = str(payload.get("notes") or "")[:500]
    unassigned = 0
    if "is_active" in payload:
        active = payload.get("is_active") in [True, "true", "1", 1]
        inspector.is_active = active
        if not active:
            open_loads = Shipment.objects.filter(inspector=inspector).exclude(
                status__in=["completed", "cancelled"]
            )
            unassigned = open_loads.update(inspector=None, updated_at=timezone.now())
    inspector.save()
    account.save()
    audit(user, "inspector.update", inspector, {"unassigned": unassigned})
    return account, unassigned


def inspector_public(account):
    person = account.user
    return {
        "id": person.id,
        "full_name": person.get_full_name(),
        "phone": person.phone,
        "notes": account.notes,
        "is_active": person.is_active,
        "last_login": person.last_login,
    }
