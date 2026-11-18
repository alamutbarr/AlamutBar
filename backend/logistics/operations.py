"""Driver onboarding, customer relations, operational monitoring and bookkeeping."""

from datetime import timedelta
from io import BytesIO
from PIL import Image, UnidentifiedImageError
from django.db import transaction
from django.db.models import Sum, Q, Count, OuterRef, Subquery
from django.http import FileResponse
from django.shortcuts import get_object_or_404
from django.utils import timezone
from rest_framework import serializers, viewsets
from rest_framework.permissions import BasePermission
from rest_framework.decorators import api_view, action
from rest_framework.response import Response
from rest_framework.exceptions import PermissionDenied, ValidationError
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from .models import *
from .services import audit, notify
from .permissions import RolePermission

REQUIRED_CREDENTIALS = {"national_card", "license", "vehicle_card", "insurance"}


class OperatorOnly(RolePermission):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and request.user.role == "operator"


def validate_upload(file):
    if not file or file.size > 10 * 1024 * 1024:
        raise ValidationError("فایل باید حداکثر ۱۰ مگابایت باشد.")
    ext = file.name.rsplit(".", 1)[-1].lower()
    data = file.read()
    file.seek(0)
    if ext == "pdf":
        if not data.startswith(b"%PDF-") or b"%%EOF" not in data[-2048:]:
            raise ValidationError("ساختار PDF معتبر نیست.")
    elif ext in ["jpg", "jpeg", "png"]:
        try:
            with Image.open(BytesIO(data)) as image:
                if (
                    image.format not in ["JPEG", "PNG"]
                    or image.width * image.height > 30_000_000
                ):
                    raise ValueError()
                if (ext == "png") != (image.format == "PNG"):
                    raise ValueError()
                image.verify()
        except (
            UnidentifiedImageError,
            OSError,
            ValueError,
            Image.DecompressionBombError,
        ):
            raise ValidationError("تصویر معتبر PNG یا JPG انتخاب کنید.")
    else:
        raise ValidationError("فقط PDF، PNG و JPG پذیرفته می‌شود.")
    return file


class ProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = DriverProfile
        exclude = ["user"]
        read_only_fields = [
            "id",
            "status",
            "review_note",
            "reviewed_by",
            "submitted_at",
            "updated_at",
        ]

    def validate_national_id(self, value):
        if not value:
            return value
        if (
            len(value) != 10
            or not value.isascii()
            or not value.isdigit()
            or len(set(value)) == 1
        ):
            raise serializers.ValidationError("کد ملی ۱۰ رقمی معتبر وارد کنید.")
        total = sum(int(value[i]) * (10 - i) for i in range(9)) % 11
        if int(value[9]) != (total if total < 2 else 11 - total):
            raise serializers.ValidationError("کد ملی معتبر نیست.")
        return value

    def validate_birth_date(self, value):
        today = timezone.localdate()
        if value:
            age = (
                today.year
                - value.year
                - ((today.month, today.day) < (value.month, value.day))
            )
            if not 18 <= age <= 100:
                raise serializers.ValidationError(
                    "سن راننده باید بین ۱۸ و ۱۰۰ سال باشد."
                )
        return value

    def validate(self, data):
        for key in ["license_expiry", "insurance_expiry"]:
            if data.get(key) and data[key] <= timezone.localdate():
                raise serializers.ValidationError(
                    {key: "تاریخ اعتبار باید در آینده باشد."}
                )
        return data


def credential_data(doc):
    return {
        "id": doc.pk,
        "kind": doc.kind,
        "label": doc.get_kind_display(),
        "status": doc.status,
        "note": doc.note,
        "name": doc.original_name,
        "uploaded_at": doc.uploaded_at,
        "url": f"/api/credentials/{doc.pk}/download/",
    }


def profile_data(user):
    profile, _ = DriverProfile.objects.get_or_create(user=user)
    from .serializers import UserSerializer, VehicleSerializer

    return {
        "user": UserSerializer(user).data,
        "profile": ProfileSerializer(profile).data,
        "vehicle": VehicleSerializer(user.vehicle).data
        if hasattr(user, "vehicle")
        else None,
        "documents": [credential_data(d) for d in user.credentials.all()],
        "required_documents": list(sorted(REQUIRED_CREDENTIALS)),
    }


def invalidate(user, profile):
    user.verified = False
    user.save(update_fields=["verified"])
    profile.status = "draft"
    profile.reviewed_by = None
    profile.save()


@extend_schema(request=ProfileSerializer, responses=OpenApiTypes.OBJECT)
@api_view(["GET", "PATCH"])
def onboarding(request, driver_id=None):
    if request.user.role == "operator" and driver_id:
        user = get_object_or_404(User, pk=driver_id, role="driver")
    elif request.user.role == "driver" and (
        driver_id is None or driver_id == request.user.pk
    ):
        user = request.user
    else:
        raise PermissionDenied()
    if request.method == "PATCH":
        if user.pk != request.user.pk:
            raise PermissionDenied()
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            profile, _ = DriverProfile.objects.get_or_create(user=user)
            serializer = ProfileSerializer(profile, data=request.data, partial=True)
            serializer.is_valid(raise_exception=True)
            serializer.save()
            invalidate(user, profile)
            audit(user, "driver.profile", profile)
    return Response(profile_data(user))


@extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
@transaction.atomic
def credential_upload(request):
    if request.user.role != "driver":
        raise PermissionDenied()
    user = User.objects.select_for_update().get(pk=request.user.pk)
    kind = request.data.get("kind")
    if kind not in dict(DriverCredential.KINDS):
        raise ValidationError("نوع مدرک معتبر نیست.")
    file = validate_upload(request.FILES.get("file"))
    doc, _ = DriverCredential.objects.update_or_create(
        driver=user,
        kind=kind,
        defaults={
            "file": file,
            "original_name": file.name[:180],
            "status": "pending",
            "note": "",
        },
    )
    profile, _ = DriverProfile.objects.get_or_create(user=user)
    invalidate(user, profile)
    audit(user, "credential.upload", doc)
    return Response(credential_data(doc), status=201)


@extend_schema(responses=OpenApiTypes.BINARY)
@api_view(["GET"])
def credential_download(request, pk):
    doc = get_object_or_404(DriverCredential, pk=pk)
    if (
        not request.user.is_superuser
        and request.user.role != "operator"
        and doc.driver_id != request.user.pk
    ):
        raise PermissionDenied()
    try:
        return FileResponse(
            doc.file.open("rb"), as_attachment=True, filename=doc.original_name
        )
    except FileNotFoundError as error:
        from rest_framework.exceptions import NotFound

        raise NotFound("فایل این مدرک پیدا نشد.") from error


@extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
@transaction.atomic
def onboarding_submit(request):
    if request.user.role != "driver":
        raise PermissionDenied()
    user = User.objects.select_for_update().get(pk=request.user.pk)
    p = get_object_or_404(DriverProfile, user=user)
    if p.status == "submitted":
        return Response(profile_data(user))
    if p.status == "approved":
        raise ValidationError(
            "برای بررسی دوباره، ابتدا اطلاعات یا مدارک را به‌روز کنید."
        )
    fields = [
        "national_id",
        "birth_date",
        "license_expiry",
        "insurance_expiry",
        "emergency_name",
        "emergency_phone",
        "address",
    ]
    if any(not getattr(p, key) for key in fields):
        raise ValidationError("تمام اطلاعات هویتی و تماس اضطراری را تکمیل کنید.")
    if not hasattr(user, "vehicle"):
        raise ValidationError("اطلاعات خودرو را تکمیل کنید.")
    valid_uploads = user.credentials.exclude(status="rejected").values_list(
        "kind", flat=True
    )
    if REQUIRED_CREDENTIALS - set(valid_uploads):
        raise ValidationError(
            "چهار مدرک الزامی را بارگذاری و مدارک ردشده را جایگزین کنید."
        )
    if (
        p.license_expiry <= timezone.localdate()
        or p.insurance_expiry <= timezone.localdate()
    ):
        raise ValidationError("مدارک منقضی شده‌اند.")
    claims = list(
        DriverProfile.objects.select_for_update()
        .filter(national_id=p.national_id)
        .order_by("pk")
    )
    if any(
        item.user_id != user.pk and item.status in ["submitted", "approved"]
        for item in claims
    ):
        raise ValidationError(
            "کد ملی در پرونده فعال دیگری ثبت شده است؛ با پشتیبانی تماس بگیرید."
        )
    p.status = "submitted"
    p.submitted_at = timezone.now()
    p.save()
    audit(user, "driver.submit", p)
    return Response(profile_data(user))


def reviewable_profile(driver_id, submission):
    # Driver edits, document uploads, and both review paths lock the same user.
    user = get_object_or_404(
        User.objects.select_for_update(), pk=driver_id, role="driver"
    )
    profile = get_object_or_404(DriverProfile, user=user)
    if profile.status != "submitted":
        raise ValidationError("راننده باید ابتدا پرونده را ارسال کند.")
    if submission is not None and (
        profile.submitted_at is None
        or submission != profile.submitted_at.isoformat()
    ):
        raise ValidationError("نسخهٔ پرونده تغییر کرده است. مشخصات و فایل‌های جدید را دوباره بررسی کنید.")
    return profile


def apply_credential_review(credential, outcome, note):
    if outcome not in ("approved", "rejected"):
        raise ValidationError("نتیجهٔ بررسی مدرک معتبر نیست.")
    if outcome == "rejected" and len(note) < 5:
        raise ValidationError("دلیل رد هر مدرک الزامی است.")
    credential.status = outcome
    credential.note = note[:1000]
    credential.save(update_fields=["status", "note"])


@transaction.atomic
def review_single_credential(reviewer, credential, outcome, note, submission):
    profile = reviewable_profile(credential.driver_id, submission)
    current = get_object_or_404(DriverCredential, pk=credential.pk, driver=profile.user)
    apply_credential_review(current, outcome, note.strip())
    audit(reviewer, "credential.review", current, {"status": outcome})


@extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
@transaction.atomic
def review_driver(request, driver_id):
    if request.user.role != "operator" and not request.user.is_superuser:
        raise PermissionDenied()
    outcome = request.data.get("status")
    note = str(request.data.get("note", "")).strip()
    if outcome not in ["approved", "rejected"]:
        raise ValidationError("نتیجه بررسی معتبر نیست.")
    profile = reviewable_profile(driver_id, request.data.get("submission"))
    user = profile.user
    if outcome == "rejected" and len(note) < 5:
        raise ValidationError("دلیل رد را کامل بنویسید.")
    docs = request.data.get("documents", [])
    if not isinstance(docs, list):
        raise ValidationError("لیست بررسی مدارک نامعتبر است.")
    for item in docs:
        if not isinstance(item, dict) or item.get("status") not in [
            "approved",
            "rejected",
        ]:
            raise ValidationError("نتیجه مدرک نامعتبر است.")
        doc_id = serializers.IntegerField(min_value=1).run_validation(item.get("id"))
        doc = get_object_or_404(DriverCredential, driver=user, pk=doc_id)
        apply_credential_review(doc, item["status"], str(item.get("note", "")).strip())
    if outcome == "approved":
        accepted = set(
            user.credentials.filter(status="approved").values_list("kind", flat=True)
        )
        if REQUIRED_CREDENTIALS - accepted:
            raise ValidationError("تمام مدارک الزامی باید جداگانه تأیید شوند.")
        if (
            not profile.license_expiry
            or not profile.insurance_expiry
            or min(profile.license_expiry, profile.insurance_expiry)
            <= timezone.localdate()
        ):
            raise ValidationError("اعتبار مدارک پایان یافته است.")
    profile.status = outcome
    profile.review_note = note[:2000]
    profile.reviewed_by = request.user
    profile.save()
    user.verified = outcome == "approved"
    user.save(update_fields=["verified"])
    audit(request.user, "driver.review", profile, {"status": outcome})
    Notification.objects.create(
        user=user, title="پرونده رانندگی: " + profile.get_status_display()
    )
    return Response(profile_data(user))


class ActivitySerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)

    class Meta:
        model = CRMActivity
        fields = ["id", "kind", "body", "created_at", "actor_name"]
        read_only_fields = ["id", "created_at"]


class LeadSerializer(serializers.ModelSerializer):
    activities = ActivitySerializer(many=True, read_only=True)
    assigned_name = serializers.CharField(
        source="assigned_to.get_full_name", read_only=True, default=""
    )
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="operator", is_active=True),
        allow_null=True,
        required=False,
    )

    class Meta:
        model = Lead
        fields = "__all__"
        read_only_fields = [
            "id",
            "created_by",
            "created_at",
            "updated_at",
            "contact_request",
        ]


class LeadViewSet(viewsets.ModelViewSet):
    permission_classes = [OperatorOnly]
    serializer_class = LeadSerializer
    queryset = Lead.objects.select_related("assigned_to").prefetch_related(
        "activities__actor"
    )
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("stage"):
            qs = qs.filter(stage=self.request.query_params["stage"])
        if self.request.query_params.get("q"):
            qs = qs.filter(
                Q(name__icontains=self.request.query_params["q"])
                | Q(company__icontains=self.request.query_params["q"])
                | Q(phone__icontains=self.request.query_params["q"])
            )
        return qs

    def perform_create(self, serializer):
        obj = serializer.save(created_by=self.request.user)
        audit(self.request.user, "crm.create", obj)

    def perform_update(self, serializer):
        previous = serializer.instance.stage
        obj = serializer.save()
        if previous != obj.stage:
            CRMActivity.objects.create(
                lead=obj,
                actor=self.request.user,
                kind="stage",
                body=f"{previous} → {obj.stage}",
            )
        audit(self.request.user, "crm.update", obj)

    @extend_schema(request=ActivitySerializer, responses=ActivitySerializer)
    @action(detail=True, methods=["post"])
    def activity(self, request, pk=None):
        obj = self.get_object()
        serializer = ActivitySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(lead=obj, actor=request.user)
        audit(request.user, "crm.activity", obj)
        return Response(serializer.data, status=201)


class FollowUpSerializer(serializers.ModelSerializer):
    assigned_to = serializers.PrimaryKeyRelatedField(
        queryset=User.objects.filter(role="operator", is_active=True)
    )
    lead_name = serializers.CharField(source="lead.name", read_only=True, default="")

    class Meta:
        model = FollowUp
        fields = "__all__"
        read_only_fields = ["id", "created_by", "created_at", "completed_at"]


class FollowUpViewSet(viewsets.ModelViewSet):
    permission_classes = [OperatorOnly]
    serializer_class = FollowUpSerializer
    queryset = FollowUp.objects.select_related("lead", "assigned_to")
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        qs = super().get_queryset()
        if self.request.query_params.get("open") == "1":
            qs = qs.filter(done=False)
        return qs

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    def perform_update(self, serializer):
        obj = serializer.save(
            completed_at=timezone.now()
            if serializer.validated_data.get("done", serializer.instance.done)
            else None
        )
        audit(self.request.user, "crm.followup", obj)


class AddressSerializer(serializers.ModelSerializer):
    class Meta:
        model = SavedAddress
        exclude = ["user"]


class AddressViewSet(viewsets.ModelViewSet):
    serializer_class = AddressSerializer
    queryset = SavedAddress.objects.none()

    def get_queryset(self):
        return (
            SavedAddress.objects.filter(user=self.request.user)
            if self.request.user.is_authenticated
            else SavedAddress.objects.none()
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


class IncidentSerializer(serializers.ModelSerializer):
    code = serializers.CharField(source="shipment.code", read_only=True)

    class Meta:
        model = Incident
        fields = "__all__"
        read_only_fields = [
            "id",
            "reporter",
            "status",
            "resolution",
            "resolved_by",
            "created_at",
            "updated_at",
        ]

    def validate_shipment(self, value):
        from .views import shipment_scope

        if (
            not shipment_scope(self.context["request"].user, market=False)
            .filter(pk=value.pk)
            .exists()
        ):
            raise serializers.ValidationError("به محموله دسترسی ندارید.")
        return value


class IncidentViewSet(viewsets.ModelViewSet):
    queryset = Incident.objects.none()
    serializer_class = IncidentSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Incident.objects.none()
        from .views import shipment_scope

        return Incident.objects.filter(
            shipment__in=shipment_scope(self.request.user, market=False)
        ).select_related("shipment", "reporter")

    @transaction.atomic
    def perform_create(self, serializer):
        Shipment.objects.select_for_update().get(
            pk=serializer.validated_data["shipment"].pk
        )
        obj = serializer.save(reporter=self.request.user)
        audit(self.request.user, "incident.create", obj)
        notify(obj.shipment, "گزارش رخداد جدید")

    @extend_schema(request=OpenApiTypes.OBJECT, responses=IncidentSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def resolve(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied()
        obj = self.get_object()
        obj = Incident.objects.select_for_update().get(pk=obj.pk)
        resolution = str(request.data.get("resolution", "")).strip()
        if obj.status == "resolved":
            raise ValidationError("رخداد قبلاً بسته شده است.")
        if len(resolution) < 10:
            raise ValidationError("شرح اقدام اصلاحی حداقل ۱۰ کاراکتر باشد.")
        obj.status = "resolved"
        obj.resolution = resolution[:3000]
        obj.resolved_by = request.user
        obj.save()
        audit(request.user, "incident.resolve", obj)
        notify(obj.shipment, "رخداد رفع شد")
        return Response(self.get_serializer(obj).data)


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
def crm_staff(request):
    if request.user.role != "operator":
        raise PermissionDenied()
    return Response(
        list(
            User.objects.filter(role="operator", is_active=True).values(
                "id", "first_name", "last_name"
            )
        )
    )


def driver_position(point):
    return {
        "id": point.pk,
        "shipment": point.shipment_id,
        "code": point.shipment.code,
        "driver": str(point.driver),
        "origin": point.shipment.origin,
        "destination": point.shipment.destination,
        "latitude": str(point.latitude),
        "longitude": str(point.longitude),
        "accuracy": point.accuracy,
        "created_at": point.created_at,
        "observed_at": point.observed_at,
        "stale": point.observed_at < timezone.now() - timedelta(minutes=5),
    }


def active_driver_positions():
    latest = (
        LocationPing.objects.filter(
            shipment__status="in_transit",
            pk=Subquery(
                LocationPing.objects.filter(shipment_id=OuterRef("shipment_id"))
                .order_by("-observed_at", "-created_at", "-pk")
                .values("pk")[:1]
            ),
        )
        .select_related("driver", "shipment")
        .order_by("shipment_id")
    )
    return [driver_position(point) for point in latest]


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
def control_room(request):
    if request.user.role != "operator":
        raise PermissionDenied()
    now = timezone.now()
    today = timezone.localdate()
    positions = active_driver_positions()
    moving = Shipment.objects.filter(status="in_transit")
    return Response(
        {
            "positions": positions,
            "moving_without_location": list(
                moving.exclude(pk__in=[point["shipment"] for point in positions]).values(
                    "id", "code", "origin", "destination"
                )
            ),
            "email_queue": OutboundEmail.objects.filter(status="pending").count(),
            "email_failed": OutboundEmail.objects.filter(status="failed").count(),
            "pending_drivers": DriverProfile.objects.filter(status="submitted").count(),
            "expired_drivers": DriverProfile.objects.filter(
                Q(license_expiry__lte=today) | Q(insurance_expiry__lte=today)
            ).count(),
            "pending_shipments": Shipment.objects.filter(status="pending").count(),
            "unassigned": Shipment.objects.filter(status="approved").count(),
            "late_pickups": list(
                Shipment.objects.filter(
                    pickup_date__lt=today,
                    status__in=["assigned", "approved", "loading"],
                ).values("id", "code", "pickup_date", "status")
            ),
            "open_incidents": Incident.objects.exclude(status="resolved").count(),
            "overdue_followups": FollowUp.objects.filter(
                done=False, due_at__lt=now
            ).count(),
            "lead_stages": list(
                Lead.objects.values("stage").annotate(count=Count("id"))
            ),
            "staff": list(
                User.objects.filter(role="operator", is_active=True).values(
                    "id", "first_name", "last_name"
                )
            ),
            "driver_queue": [
                {
                    "id": p.user_id,
                    "name": str(p.user),
                    "status": p.status,
                    "submitted_at": p.submitted_at,
                }
                for p in DriverProfile.objects.select_related("user")
                .filter(status__in=["submitted", "rejected"])
                .order_by("-submitted_at")[:100]
            ],
        }
    )


class PaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = PaymentRecord
        fields = ["id", "amount", "reference", "created_at"]
        read_only_fields = ["id", "created_at"]
        extra_kwargs = {"reference": {"min_length": 5}}


@extend_schema(request=PaymentSerializer, responses=PaymentSerializer)
@api_view(["POST"])
@transaction.atomic
def record_payment(request, pk):
    if request.user.role != "operator":
        raise PermissionDenied()
    invoice = get_object_or_404(Invoice.objects.select_for_update(), pk=pk)
    serializer = PaymentSerializer(data=request.data)
    serializer.is_valid(raise_exception=True)
    paid = invoice.payments.aggregate(n=Sum("amount"))["n"] or (
        invoice.amount if invoice.status == "paid" else 0
    )
    if serializer.validated_data["amount"] > invoice.amount - paid:
        raise ValidationError("مبلغ بیشتر از مانده صورتحساب است.")
    if invoice.payments.filter(
        reference=serializer.validated_data["reference"]
    ).exists():
        raise ValidationError("این مرجع قبلاً ثبت شده است.")
    obj = serializer.save(invoice=invoice, actor=request.user)
    if paid + obj.amount == invoice.amount:
        invoice.status = "paid"
        invoice.reference = obj.reference
        invoice.paid_at = timezone.now()
        invoice.save()
    audit(
        request.user,
        "invoice.payment",
        invoice,
        {"amount": obj.amount, "reference": obj.reference},
    )
    return Response(serializer.data, status=201)
