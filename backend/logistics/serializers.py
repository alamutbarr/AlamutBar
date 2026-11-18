from django.contrib.auth.password_validation import validate_password
from django.db import transaction
from django.utils import timezone
from rest_framework import serializers
from drf_spectacular.utils import extend_schema_field
from drf_spectacular.types import OpenApiTypes
from .models import *
from .services import driver_market_enabled, national_id_ok


def clean_national_id(value):
    if not value:
        return ""
    if not national_id_ok(value):
        raise serializers.ValidationError("کد ملی ۱۰ رقمی معتبر وارد کنید.")
    return value


class UserSerializer(serializers.ModelSerializer):
    name = serializers.CharField(source="get_full_name", read_only=True)
    vehicle = serializers.SerializerMethodField()
    driver_market_enabled = serializers.SerializerMethodField()
    avatar_url = serializers.SerializerMethodField()
    kyc_status = serializers.SerializerMethodField()

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        if getattr(self.instance, "role", None) == "owner":
            self.fields["phone"].read_only = True

    def get_avatar_url(self, obj) -> str:
        return "/api/auth/avatar/" if obj.avatar else ""

    def get_kyc_status(self, obj) -> str:
        try:
            return obj.owner_identity.status
        except OwnerIdentity.DoesNotExist:
            return "missing"

    def get_driver_market_enabled(self, obj) -> bool:
        return driver_market_enabled(obj)

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_vehicle(self, obj):
        if obj.role != "driver" or not hasattr(obj, "vehicle"):
            return None
        return {
            "kind": obj.vehicle.kind,
            "plate": obj.vehicle.plate,
            "capacity": str(obj.vehicle.capacity),
            "available": obj.vehicle.available,
        }

    class Meta:
        model = User
        fields = [
            "id",
            "username",
            "name",
            "first_name",
            "last_name",
            "phone",
            "email",
            "company",
            "national_id",
            "postal_code",
            "role",
            "verified",
            "driver_market_enabled",
            "capabilities",
            "vehicle",
            "avatar_url",
            "kyc_status",
        ]
        read_only_fields = ["id", "username", "role", "verified", "capabilities"]

    def validate_national_id(self, value):
        value = clean_national_id(value)
        if (
            value
            and User.objects.exclude(pk=getattr(self.instance, "pk", None))
            .filter(national_id=value)
            .exists()
        ):
            raise serializers.ValidationError("این کد ملی قبلاً ثبت شده است.")
        return value

    def validate_postal_code(self, value):
        if value and (len(value) != 10 or not value.isdigit()):
            raise serializers.ValidationError("کد پستی ۱۰ رقمی وارد کنید.")
        return value


class RegistrationSerializer(serializers.ModelSerializer):
    role = serializers.ChoiceField(
        choices=[("owner", "صاحب بار"), ("driver", "راننده")]
    )
    password = serializers.CharField(write_only=True, validators=[validate_password])

    class Meta:
        model = User
        fields = [
            "username",
            "password",
            "first_name",
            "last_name",
            "phone",
            "email",
            "role",
            "company",
        ]

    def validate_role(self, value):
        if value not in ["owner", "driver"]:
            raise serializers.ValidationError(
                "ثبت‌نام عمومی تنها برای صاحب بار و راننده است."
            )
        return value

    def validate(self, data):
        if data["role"] == "driver":
            required = {
                field: "این فیلد الزامی است."
                for field in ("first_name", "last_name")
                if not data.get(field)
            }
            if required:
                raise serializers.ValidationError(required)
        return data

    @transaction.atomic
    def create(self, data):
        user = User.objects.create_user(**data)
        if user.role == "driver":
            DriverProfile.objects.create(user=user)
        return user


class VehicleSerializer(serializers.ModelSerializer):
    class Meta:
        model = Vehicle
        exclude = ["driver"]
        read_only_fields = ["id"]


class EventSerializer(serializers.ModelSerializer):
    actor_name = serializers.CharField(source="actor.get_full_name", read_only=True)

    class Meta:
        model = ShipmentEvent
        fields = ["id", "status", "note", "created_at", "actor_name"]


class OfferSerializer(serializers.ModelSerializer):
    driver_name = serializers.CharField(source="driver.get_full_name", read_only=True)

    class Meta:
        model = Offer
        fields = ["id", "driver", "driver_name", "amount", "note", "created_at"]
        read_only_fields = ["id", "driver", "created_at"]


class InspectionSerializer(serializers.ModelSerializer):
    inspector_name = serializers.CharField(
        source="inspector.get_full_name", read_only=True
    )

    class Meta:
        model = Inspection
        fields = [
            "id",
            "stage",
            "packaging_ok",
            "weight_ok",
            "vehicle_ok",
            "seal_number",
            "notes",
            "passed",
            "created_at",
            "inspector_name",
        ]
        read_only_fields = ["id", "passed", "created_at"]


class DocumentSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj) -> str:
        return f"/api/documents/{obj.id}/download/"

    class Meta:
        model = Document
        fields = ["id", "name", "url", "created_at"]


class LocationSerializer(serializers.ModelSerializer):
    def validate_observed_at(self, value):
        from datetime import timedelta

        now = timezone.now()
        if value > now + timedelta(minutes=2) or value < now - timedelta(days=7):
            raise serializers.ValidationError("زمان اندازه‌گیری موقعیت معتبر نیست.")
        return value

    class Meta:
        model = LocationPing
        fields = [
            "id",
            "latitude",
            "longitude",
            "accuracy",
            "observed_at",
            "created_at",
        ]
        read_only_fields = ["id", "created_at"]


class ShipmentSerializer(serializers.ModelSerializer):
    owner_name = serializers.CharField(source="owner.get_full_name", read_only=True)
    driver_name = serializers.CharField(
        source="driver.get_full_name", read_only=True, default=""
    )
    inspector_name = serializers.CharField(
        source="inspector.get_full_name", read_only=True, default=""
    )
    events = EventSerializer(many=True, read_only=True)
    offers = serializers.SerializerMethodField()
    inspections = InspectionSerializer(many=True, read_only=True)
    documents = DocumentSerializer(many=True, read_only=True)
    locations = serializers.SerializerMethodField()

    @extend_schema_field(LocationSerializer(many=True))
    def get_locations(self, obj):
        return LocationSerializer(obj.locations.all()[:50], many=True).data

    @extend_schema_field(OfferSerializer(many=True))
    def get_offers(self, obj):
        offers = obj.offers.all()
        if self.context["request"].user.role == "driver":
            offers = offers.filter(driver=self.context["request"].user)
        return OfferSerializer(offers, many=True).data

    def to_representation(self, obj):
        data = super().to_representation(obj)
        user = self.context["request"].user
        if user.role == "driver" and obj.driver_id != user.id:
            for key in [
                "origin_address",
                "destination_address",
                "recipient_name",
                "recipient_phone",
                "owner_name",
                "events",
                "documents",
                "inspections",
                "locations",
                "notes",
                "recipient_national_id",
                "recipient_postal_code",
                "origin_lat",
                "origin_lng",
                "destination_lat",
                "destination_lng",
            ]:
                data.pop(key, None)
        if user.role == "driver":
            data.pop("recipient_national_id", None)
        try:
            rating = obj.rating
        except ShipmentRating.DoesNotExist:
            rating = None
        data["rating"] = (
            {
                "driver_score": rating.driver_score,
                "inspector_score": rating.inspector_score,
                "comment": rating.comment,
                "created_at": rating.created_at,
            }
            if rating
            else None
        )
        return data

    def to_internal_value(self, data):
        if isinstance(data, dict):
            data = data.copy()
            for key in (
                "package_count",
                "length_m",
                "width_m",
                "height_m",
                "origin_lat",
                "origin_lng",
                "destination_lat",
                "destination_lng",
                "operator_price",
            ):
                if data.get(key) == "":
                    data[key] = None
        return super().to_internal_value(data)

    def _handling(self, value, label):
        if value not in {"", "forklift", "crane", "manual", "ramp", "other"}:
            raise serializers.ValidationError(label + " معتبر نیست.")
        return value

    def validate_loading_method(self, value):
        return self._handling(value, "روش بارگیری")

    def validate_unloading_method(self, value):
        return self._handling(value, "روش تخلیه")

    def validate_recipient_national_id(self, value):
        return clean_national_id(value)

    def validate_recipient_postal_code(self, value):
        if value and (len(value) != 10 or not value.isdigit()):
            raise serializers.ValidationError("کد پستی ۱۰ رقمی وارد کنید.")
        return value

    def validate_pickup_window(self, value):
        allowed = {"08-12", "12-16", "16-20", "20-24"}
        parts = [part for part in value.split(",") if part]
        if any(part not in allowed for part in parts):
            raise serializers.ValidationError("بازه بارگیری معتبر نیست.")
        return ",".join(dict.fromkeys(parts))

    def validate_cargo_note(self, value):
        return value.strip()

    def validate_pickup_date(self, value):
        if value < timezone.localdate():
            raise serializers.ValidationError("تاریخ بارگیری نمی‌تواند در گذشته باشد.")
        return value

    def validate(self, data):
        origin = data.get("origin", getattr(self.instance, "origin", None))
        destination = data.get(
            "destination", getattr(self.instance, "destination", None)
        )
        if origin == destination:
            raise serializers.ValidationError("مبدأ و مقصد باید متفاوت باشند.")
        return data

    class Meta:
        model = Shipment
        fields = "__all__"
        read_only_fields = [
            "id",
            "code",
            "owner",
            "driver",
            "inspector",
            "status",
            "created_at",
            "updated_at",
            "cancel_reason",
            "operator_price",
            "price_status",
            "hold_resume",
        ]


class InvoiceSerializer(serializers.ModelSerializer):
    paid_total = serializers.SerializerMethodField()
    balance = serializers.SerializerMethodField()
    payments = serializers.SerializerMethodField()

    def get_paid_total(self, obj) -> int:
        from django.db.models import Sum

        return obj.payments.aggregate(n=Sum("amount"))["n"] or (
            obj.amount if obj.status == "paid" else 0
        )

    def get_balance(self, obj) -> int:
        return obj.amount - self.get_paid_total(obj)

    @extend_schema_field(OpenApiTypes.OBJECT)
    def get_payments(self, obj):
        return list(obj.payments.values("id", "amount", "reference", "created_at"))

    code = serializers.CharField(source="shipment.code", read_only=True)
    route = serializers.SerializerMethodField()

    def get_route(self, obj) -> str:
        return obj.shipment.origin + " ← " + obj.shipment.destination

    class Meta:
        model = Invoice
        fields = [
            "id",
            "shipment",
            "code",
            "route",
            "amount",
            "status",
            "reference",
            "paid_at",
            "created_at",
            "paid_total",
            "balance",
            "payments",
        ]


class MessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    role = serializers.CharField(source="author.role", read_only=True)

    class Meta:
        model = TicketMessage
        fields = ["id", "author_name", "role", "body", "created_at"]


class TicketSerializer(serializers.ModelSerializer):
    messages = MessageSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    body = serializers.CharField(write_only=True, max_length=4000)

    class Meta:
        model = Ticket
        fields = [
            "id",
            "subject",
            "priority",
            "status",
            "created_at",
            "updated_at",
            "messages",
            "user_name",
            "body",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def create(self, data):
        body = data.pop("body")
        ticket = Ticket.objects.create(**data)
        TicketMessage.objects.create(ticket=ticket, author=data["user"], body=body)
        return ticket


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = ["id", "title", "body", "shipment", "read", "created_at"]


class ContactSerializer(serializers.ModelSerializer):
    class Meta:
        model = ContactRequest
        fields = ["name", "phone", "message"]


class ComplaintMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    role = serializers.CharField(source="author.role", read_only=True)

    class Meta:
        model = ComplaintMessage
        fields = ["id", "author_name", "role", "body", "created_at"]


class ComplaintPhotoSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj) -> str:
        return f"/api/complaint-photos/{obj.id}/download/"

    class Meta:
        model = ComplaintPhoto
        fields = ["id", "url", "created_at"]


class ComplaintSerializer(serializers.ModelSerializer):
    messages = ComplaintMessageSerializer(many=True, read_only=True)
    photos = ComplaintPhotoSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)
    shipment_code = serializers.CharField(
        source="shipment.code", read_only=True, default=""
    )

    class Meta:
        model = Complaint
        fields = [
            "id",
            "type",
            "shipment",
            "shipment_code",
            "description",
            "status",
            "created_at",
            "updated_at",
            "user_name",
            "messages",
            "photos",
        ]
        read_only_fields = ["id", "status", "created_at", "updated_at"]

    def validate_description(self, value):
        value = value.strip()
        if len(value) < 10:
            raise serializers.ValidationError("شرح شکایت را کامل‌تر بنویسید.")
        return value

    def validate_shipment(self, shipment):
        user = self.context["request"].user
        if shipment and user.role != "operator" and shipment.owner_id != user.id:
            raise serializers.ValidationError("این محموله متعلق به شما نیست.")
        return shipment


class ComplaintReplySerializer(serializers.Serializer):
    body = serializers.CharField(max_length=4000)

    def validate_body(self, value):
        value = value.strip()
        if not value:
            raise serializers.ValidationError("متن پیام را بنویسید.")
        return value


class ComplaintStatusSerializer(serializers.Serializer):
    status = serializers.ChoiceField(
        choices=["pending", "reviewed", "resolved", "rejected"]
    )


class ShipmentMessageSerializer(serializers.ModelSerializer):
    author_name = serializers.CharField(source="author.get_full_name", read_only=True)
    role = serializers.CharField(source="author.role", read_only=True)

    class Meta:
        model = ShipmentMessage
        fields = ["id", "author_name", "role", "body", "created_at"]


class OwnerKycFileSerializer(serializers.ModelSerializer):
    url = serializers.SerializerMethodField()

    def get_url(self, obj) -> str:
        return f"/api/owner-kyc/{obj.id}/download/"

    class Meta:
        model = OwnerKycFile
        fields = ["id", "slot", "url", "created_at"]


class OwnerIdentitySerializer(serializers.ModelSerializer):
    files = OwnerKycFileSerializer(many=True, read_only=True)
    user_name = serializers.CharField(source="user.get_full_name", read_only=True)

    class Meta:
        model = OwnerIdentity
        fields = [
            "id",
            "id_type",
            "status",
            "note",
            "updated_at",
            "user_name",
            "files",
        ]
        read_only_fields = ["id", "status", "note", "updated_at"]
