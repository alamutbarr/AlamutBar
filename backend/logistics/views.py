import csv, io
from django.conf import settings
from django.contrib.auth import authenticate, login, logout, update_session_auth_hash
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError as DjangoValidationError
from django.db import transaction, connection
from django.db.models import Q, Sum, Count
from django.http import FileResponse, HttpResponse
from django.middleware.csrf import get_token
from django.shortcuts import get_object_or_404
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import viewsets, status
from rest_framework.decorators import (
    api_view,
    permission_classes,
    action,
)
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.exceptions import ValidationError, PermissionDenied
from rest_framework.throttling import AnonRateThrottle, UserRateThrottle
from rest_framework.views import APIView
from drf_spectacular.utils import extend_schema, OpenApiParameter
from drf_spectacular.types import OpenApiTypes
from .schema import *
from .models import *
from .serializers import *
from .driver_flow import (
    accept_shipment,
    add_delivery_photo,
    complete_delivery,
    decline_shipment,
    issue_waybill,
    list_messages,
    nearby_market,
    places_payload,
    post_message,
    request_delivery_code,
    request_phone_code,
    save_waybill_photo,
    search_market,
    verify_phone_code,
    verify_waybill,
    driver_summary,
)
from .services import (
    GPS_STATUSES,
    assign,
    audit,
    driver_documents_valid,
    driver_market_enabled,
    event,
    transition,
)


class LoginThrottle(AnonRateThrottle):
    scope = "login"


class ContactThrottle(AnonRateThrottle):
    scope = "contact"


@extend_schema(responses=CsrfResponse, auth=[])
@api_view(["GET"])
@permission_classes([AllowAny])
def csrf(request):
    return Response(
        {"csrfToken": get_token(request), "demo_enabled": settings.DEMO_ENABLED}
    )


@method_decorator(csrf_protect, name="dispatch")
class LoginView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(request=LoginRequest, responses=UserSerializer)
    def post(self, request):
        data = LoginRequest(data=request.data)
        data.is_valid(raise_exception=True)
        user = authenticate(
            request,
            username=data.validated_data["username"],
            password=data.validated_data["password"],
        )
        if not user:
            return Response({"detail": "نام کاربری یا رمز عبور صحیح نیست."}, status=400)
        if getattr(request, "portal_role", None) and request.portal_role != user.role:
            raise PermissionDenied("این حساب به برنامهٔ انتخاب‌شده دسترسی ندارد.")
        role = data.validated_data.get("role")
        if role and role != user.role:
            return Response(
                {"detail": "این حساب به پنل انتخاب‌شده دسترسی ندارد."}, status=403
            )
        from .security import verify_login

        verify_login(user, data.validated_data.get("code", ""))
        login(request, user)
        audit(user, "auth.login", user)
        return Response(UserSerializer(user).data)


@method_decorator(csrf_protect, name="dispatch")
class RegisterView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(request=RegistrationSerializer, responses={201: UserSerializer})
    def post(self, request):
        serializer = RegistrationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        if getattr(request, "portal_role", None) and request.portal_role != serializer.validated_data["role"]:
            raise PermissionDenied("نقش ثبت‌نام با برنامه مطابقت ندارد.")
        user = serializer.save()
        login(request, user)
        return Response(UserSerializer(user).data, status=201)


@extend_schema(request=None, responses=DetailResponse)
@api_view(["POST"])
def signout(request):
    logout(request)
    return Response({"detail": "خارج شدید."})


@extend_schema(request=UserSerializer, responses=UserSerializer)
@api_view(["GET", "PATCH"])
def me(request):
    if request.method == "PATCH":
        serializer = UserSerializer(request.user, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit(request.user, "profile.update", request.user)
    return Response(UserSerializer(request.user).data)


@extend_schema(request=PasswordRequest, responses=DetailResponse)
@api_view(["POST"])
def password(request):
    serializer = PasswordRequest(data=request.data)
    serializer.is_valid(raise_exception=True)
    if not request.user.check_password(serializer.validated_data["old_password"]):
        raise ValidationError("رمز فعلی صحیح نیست.")
    new = serializer.validated_data["new_password"]
    try:
        validate_password(new, request.user)
    except DjangoValidationError as exc:
        raise ValidationError(exc.messages)
    request.user.set_password(new)
    request.user.save(update_fields=["password"])
    update_session_auth_hash(request, request.user)
    audit(request.user, "auth.password", request.user)
    return Response({"detail": "رمز عبور تغییر کرد."})


@extend_schema(responses=HealthResponse, auth=[])
@api_view(["GET"])
@permission_classes([AllowAny])
def health(request):
    try:
        with connection.cursor() as cursor:
            cursor.execute("SELECT 1")
    except Exception:
        return Response({"status": "unavailable"}, status=503)
    return Response(
        {"status": "ok", "service": "alamut-api", "database": connection.vendor}
    )


def shipment_scope(user, market=True):
    qs = Shipment.objects.select_related(
        "owner", "driver", "inspector", "rating"
    ).prefetch_related(
        "events__actor",
        "offers__driver",
        "inspections__inspector",
        "documents",
        "locations",
    )
    if user.role == "owner":
        return qs.filter(owner=user)
    if user.role == "driver":
        if market and driver_market_enabled(user):
            return qs.filter(Q(driver=user) | Q(status="approved"))
        return qs.filter(driver=user)
    if user.role == "inspector":
        return qs.filter(inspector=user)
    if user.role == "operator":
        return qs
    return qs.none()


class ShipmentViewSet(viewsets.ModelViewSet):
    queryset = Shipment.objects.none()
    serializer_class = ShipmentSerializer
    http_method_names = ["get", "post", "patch", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Shipment.objects.none()
        qs = shipment_scope(self.request.user)
        params = self.request.query_params
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("q"):
            qs = qs.filter(
                Q(code__icontains=params["q"])
                | Q(title__icontains=params["q"])
                | Q(origin__icontains=params["q"])
                | Q(destination__icontains=params["q"])
            )
        if params.get("mine") == "1" and self.request.user.role == "driver":
            qs = qs.filter(driver=self.request.user)
        if self.request.user.role == "driver":
            qs = qs.exclude(passes__driver=self.request.user).exclude(
                Q(status="approved") & Q(offer_expires_at__lt=timezone.now())
            )
            tab = params.get("tab")
            if tab == "offered":
                qs = qs.filter(status="approved")
            elif tab == "active":
                qs = qs.filter(driver=self.request.user).exclude(
                    status__in=["pending", "approved", "delivered", "completed", "cancelled"]
                )
            elif tab == "history":
                qs = qs.filter(
                    driver=self.request.user,
                    status__in=["delivered", "completed", "cancelled"],
                )
        return qs

    @transaction.atomic
    def perform_create(self, serializer):
        if self.request.user.role not in ["owner", "operator"]:
            raise PermissionDenied("ثبت بار فقط برای صاحب بار و اپراتور مجاز است.")
        shipment = serializer.save(owner=self.request.user)
        event(shipment, self.request.user, "درخواست حمل ثبت شد و در انتظار بررسی است.")

    @transaction.atomic
    def partial_update(self, request, *args, **kwargs):
        obj = self.get_object()
        locked = Shipment.objects.select_for_update().get(pk=obj.pk)
        if request.user.role not in ["owner", "operator"] or locked.status != "pending":
            raise PermissionDenied("ویرایش تنها پیش از تأیید بار مجاز است.")
        serializer = self.get_serializer(locked, data=request.data, partial=True)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        audit(request.user, "shipment.edit", locked)
        return Response(serializer.data)

    @extend_schema(request=TransitionRequest, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def transition(self, request, pk=None):
        shipment = self.get_object()
        if request.user.role == "driver" and shipment.driver_id != request.user.pk:
            raise PermissionDenied()
        serializer = TransitionRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        result = transition(
            shipment.pk,
            request.user,
            serializer.validated_data["status"],
            serializer.validated_data.get("note", ""),
        )
        return Response(self.get_serializer(result).data)

    @extend_schema(request=OfferSerializer, responses={201: OfferSerializer})
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def offer(self, request, pk=None):
        if request.user.role != "driver" or not request.user.verified:
            raise PermissionDenied("ثبت پیشنهاد به راننده احراز شده نیاز دارد.")
        if not driver_documents_valid(request.user):
            raise PermissionDenied("پرونده مدارک راننده باید معتبر و تأیید شده باشد.")
        obj = self.get_object()
        shipment = Shipment.objects.select_for_update().get(pk=obj.pk)
        driver = User.objects.select_for_update().get(pk=request.user.pk)
        if not driver_market_enabled(driver):
            raise PermissionDenied("پرونده مدارک راننده باید معتبر و تأیید شده باشد.")
        if shipment.status != "approved":
            raise ValidationError("این بار پیشنهاد نمی‌پذیرد.")
        if Offer.objects.filter(shipment=shipment, driver=request.user).exists():
            raise ValidationError("پیشنهاد شما قبلاً ثبت شده است.")
        serializer = OfferSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(shipment=shipment, driver=request.user)
        audit(request.user, "offer.create", shipment)
        Notification.objects.create(
            user=shipment.owner,
            shipment=shipment,
            title="پیشنهاد جدید برای " + shipment.code,
        )
        return Response(serializer.data, status=201)

    @extend_schema(request=AssignRequest, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def assign(self, request, pk=None):
        shipment = self.get_object()
        if request.user.role != "operator":
            raise PermissionDenied()
        serializer = AssignRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        driver = get_object_or_404(User, pk=serializer.validated_data["driver"])
        inspector = get_object_or_404(User, pk=serializer.validated_data["inspector"])
        offer = shipment.offers.filter(driver=driver).first()
        result = assign(
            shipment.pk,
            request.user,
            driver,
            inspector,
            offer.amount if offer else None,
        )
        return Response(self.get_serializer(result).data)

    @extend_schema(request=InspectionSerializer, responses={201: InspectionSerializer})
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def inspect(self, request, pk=None):
        obj = self.get_object()
        shipment = Shipment.objects.select_for_update().get(pk=obj.pk)
        if request.user.role != "inspector" or shipment.inspector_id != request.user.id:
            raise PermissionDenied()
        serializer = InspectionSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        data = serializer.validated_data
        allowed = (
            ["loading", "arrived_pickup", "on_hold"]
            if data["stage"] == "loading"
            else ["delivered", "near_destination"]
        )
        if shipment.status not in allowed:
            raise ValidationError("وضعیت بار با مرحله بازرسی مطابقت ندارد.")
        passed = all(data[key] for key in ["packaging_ok", "weight_ok", "vehicle_ok"])
        serializer.save(shipment=shipment, inspector=request.user, passed=passed)
        if not passed and shipment.status in [
            "arrived_pickup",
            "loading",
            "waybill",
            "in_transit",
            "near_destination",
        ]:
            shipment.status = "on_hold"
            shipment.save(update_fields=["status", "updated_at"])
        event(
            shipment,
            request.user,
            "بازرسی " + ("تأیید شد" if passed else "نیاز به اصلاح دارد"),
        )
        return Response(serializer.data, status=201)

    @extend_schema(
        request={"multipart/form-data": UploadRequest},
        responses={201: DocumentSerializer},
    )
    @action(detail=True, methods=["post"])
    def documents(self, request, pk=None):
        shipment = self.get_object()
        if request.user.role == "driver" and shipment.driver_id != request.user.pk:
            raise PermissionDenied()
        file = request.FILES.get("file")
        if not file or file.size > 10 * 1024 * 1024:
            raise ValidationError("فایل معتبر با حجم حداکثر ۱۰ مگابایت انتخاب کنید.")
        ext = file.name.rsplit(".", 1)[-1].lower()
        signature = file.read(12)
        file.seek(0)
        valid = (
            (ext == "pdf" and signature.startswith(b"%PDF-"))
            or (ext in ["jpg", "jpeg"] and signature.startswith(b"\xff\xd8\xff"))
            or (ext == "png" and signature.startswith(b"\x89PNG\r\n\x1a\n"))
        )
        if not valid:
            raise ValidationError("فقط PDF، JPG و PNG معتبر پذیرفته می‌شود.")
        doc = Document.objects.create(
            shipment=shipment, uploaded_by=request.user, file=file, name=file.name[:180]
        )
        audit(request.user, "document.upload", doc)
        return Response(DocumentSerializer(doc).data, status=201)

    @extend_schema(request=None, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def rate(self, request, pk=None):
        shipment = self.get_object()
        locked = Shipment.objects.select_for_update().get(pk=shipment.pk)
        if request.user.role != "owner" or locked.owner_id != request.user.id:
            raise PermissionDenied("فقط صاحب بار می‌تواند امتیاز بدهد.")
        if locked.status not in ["delivered", "completed"]:
            raise ValidationError("امتیازدهی پس از تحویل محموله ممکن است.")
        if ShipmentRating.objects.filter(shipment=locked).exists():
            raise ValidationError("برای این محموله قبلاً امتیاز ثبت شده است.")
        driver_score = request.data.get("driver_score")
        inspector_score = request.data.get("inspector_score") or None
        comment = (request.data.get("comment") or "").strip()
        try:
            driver_score = int(driver_score)
        except (TypeError, ValueError):
            raise ValidationError("امتیاز راننده را از ۱ تا ۵ انتخاب کنید.")
        if not 1 <= driver_score <= 5:
            raise ValidationError("امتیاز راننده را از ۱ تا ۵ انتخاب کنید.")
        if inspector_score not in [None, ""]:
            try:
                inspector_score = int(inspector_score)
            except (TypeError, ValueError):
                raise ValidationError("امتیاز متصدی را از ۱ تا ۵ انتخاب کنید.")
            if not 1 <= inspector_score <= 5:
                raise ValidationError("امتیاز متصدی را از ۱ تا ۵ انتخاب کنید.")
        else:
            inspector_score = None
        if len(comment) > 1000:
            raise ValidationError("نظر حداکثر ۱۰۰۰ نویسه است.")
        ShipmentRating.objects.create(
            shipment=locked,
            driver_score=driver_score,
            inspector_score=inspector_score,
            comment=comment,
        )
        audit(request.user, "shipment.rate", locked)
        return Response(self.get_serializer(locked).data)

    @extend_schema(request=LocationSerializer, responses={201: LocationSerializer})
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def location(self, request, pk=None):
        obj = self.get_object()
        shipment = Shipment.objects.select_for_update().get(pk=obj.pk)
        if request.user.role != "driver" or shipment.driver_id != request.user.pk:
            raise PermissionDenied("فقط راننده همین سفر می‌تواند موقعیت ثبت کند.")
        if shipment.status not in GPS_STATUSES:
            raise ValidationError("ثبت موقعیت فقط هنگام حمل مجاز است.")
        serializer = LocationSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(shipment=shipment, driver=request.user)
        return Response(serializer.data, status=201)

    @extend_schema(request=None, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def accept(self, request, pk=None):
        result = accept_shipment(request.user, self.get_object().pk)
        return Response(self.get_serializer(result).data)

    @extend_schema(request=None, responses=DetailResponse)
    @action(detail=True, methods=["post"])
    def decline(self, request, pk=None):
        decline_shipment(request.user, self.get_object().pk)
        return Response({"detail": "پیشنهاد رد شد."})

    @extend_schema(request=None, responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["post"], url_path="waybill-issue")
    def waybill_issue(self, request, pk=None):
        code = issue_waybill(request.user, self.get_object().pk)
        return Response({"detail": "کد بارنامه صادر شد.", "code": code})

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"], url_path="waybill-verify")
    def waybill_verify(self, request, pk=None):
        result = verify_waybill(request.user, self.get_object().pk, request.data.get("code"))
        return Response(self.get_serializer(result).data)

    @extend_schema(request=OpenApiTypes.BINARY, responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["post"], url_path="waybill-photo")
    def waybill_photo_upload(self, request, pk=None):
        waybill = save_waybill_photo(request.user, self.get_object().pk, request.FILES.get("file"))
        return Response({"detail": "عکس بارنامه ذخیره شد.", "name": waybill.photo_name})

    @extend_schema(request=None, responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["post"], url_path="delivery-code")
    def delivery_code(self, request, pk=None):
        request_delivery_code(request.user, self.get_object().pk)
        return Response({"detail": "کد تحویل برای گیرنده ارسال شد."})

    @extend_schema(request=OpenApiTypes.BINARY, responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["post"], url_path="delivery-photos")
    def delivery_photos(self, request, pk=None):
        photo = add_delivery_photo(request.user, self.get_object().pk, request.FILES.get("file"))
        return Response({"id": photo.pk, "count": photo.shipment.delivery_photos.count()}, status=201)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def pod(self, request, pk=None):
        result = complete_delivery(
            request.user,
            self.get_object().pk,
            request.data.get("code", ""),
            request.data.get("reason", ""),
        )
        return Response(self.get_serializer(result).data)

    @extend_schema(responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        shipment = self.get_object()
        if request.method == "POST":
            message = post_message(request.user, shipment.pk, request.data.get("body"))
            shipment = message.shipment
        rows = [
            {
                "id": item.pk,
                "body": item.body,
                "created_at": item.created_at,
                "author_name": item.sender.get_full_name() or item.sender.username,
                "role": item.sender.role,
                "mine": item.sender_id == request.user.pk,
            }
            for item in list_messages(request.user, shipment)
        ]
        return Response(rows)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["post"], url_path="location-batch")
    def location_batch(self, request, pk=None):
        shipment = self.get_object()
        if request.user.role != "driver" or shipment.driver_id != request.user.pk:
            raise PermissionDenied("فقط راننده همین سفر می‌تواند موقعیت ثبت کند.")
        if shipment.status not in GPS_STATUSES:
            raise ValidationError("ثبت موقعیت فقط هنگام حمل مجاز است.")
        points = request.data.get("points")
        if not isinstance(points, list) or not points or len(points) > 100:
            raise ValidationError("فهرست موقعیت باید بین ۱ تا ۱۰۰ نقطه باشد.")
        saved = []
        for item in points:
            serializer = LocationSerializer(data=item)
            serializer.is_valid(raise_exception=True)
            saved.append(serializer.save(shipment=shipment, driver=request.user))
        return Response(LocationSerializer(saved, many=True).data, status=201)

    @extend_schema(responses=OpenApiTypes.OBJECT)
    @action(detail=False, methods=["get"], url_path="route-search")
    def route_search(self, request):
        rows = search_market(
            request.user,
            request.query_params.get("origin", ""),
            request.query_params.get("destination", ""),
        )
        return Response(self.get_serializer(rows, many=True).data)

    @extend_schema(responses=OpenApiTypes.OBJECT)
    @action(detail=False, methods=["get"])
    def nearby(self, request):
        rows = nearby_market(
            request.user,
            request.query_params.get("lat"),
            request.query_params.get("lng"),
            request.query_params.get("destination", ""),
            request.query_params.get("band", 50),
        )
        data = []
        for item in rows:
            payload = self.get_serializer(item["shipment"]).data
            payload["distance_km"] = item["distance_km"]
            data.append(payload)
        return Response(data)

    @extend_schema(responses={(200, "text/csv"): OpenApiTypes.STR})
    @action(detail=False, methods=["get"])
    def export(self, request):
        response = HttpResponse(content_type="text/csv; charset=utf-8")
        response["Content-Disposition"] = 'attachment; filename="shipments.csv"'
        response.write("\ufeff")
        writer = csv.writer(response)
        writer.writerow(["کد", "عنوان", "مبدأ", "مقصد", "وضعیت", "کرایه (تومان)"])

        def safe(v):
            s = str(v)
            return "'" + s if s.startswith(("=", "+", "-", "@", "\t", "\r")) else s

        for s in self.get_queryset().iterator(chunk_size=100):
            writer.writerow(
                [
                    safe(v)
                    for v in [
                        s.code,
                        s.title,
                        s.origin,
                        s.destination,
                        s.get_status_display(),
                        s.price,
                    ]
                ]
            )
        return response


@extend_schema(responses={(200, "application/octet-stream"): OpenApiTypes.BINARY})
@api_view(["GET"])
def download(request, pk):
    doc = get_object_or_404(
        Document, pk=pk, shipment__in=shipment_scope(request.user, market=False)
    )
    try:
        return FileResponse(doc.file.open("rb"), as_attachment=True, filename=doc.name)
    except FileNotFoundError as error:
        from rest_framework.exceptions import NotFound

        raise NotFound("فایل این سند پیدا نشد.") from error


@extend_schema(responses={(200, "application/octet-stream"): OpenApiTypes.BINARY})
@api_view(["GET"])
def complaint_photo(request, pk):
    photo = get_object_or_404(ComplaintPhoto, pk=pk)
    if request.user.role != "operator" and photo.complaint.user_id != request.user.id:
        raise PermissionDenied()
    try:
        return FileResponse(
            photo.file.open("rb"),
            as_attachment=True,
            filename=photo.file.name.rsplit("/", 1)[-1],
        )
    except FileNotFoundError as error:
        from rest_framework.exceptions import NotFound

        raise NotFound("فایل این مدرک پیدا نشد.") from error


@extend_schema(request=VehicleSerializer, responses=VehicleSerializer)
@api_view(["GET", "PUT"])
def vehicle(request):
    if request.user.role != "driver":
        raise PermissionDenied()
    if request.method == "GET":
        obj = Vehicle.objects.filter(driver=request.user).first()
        return Response(VehicleSerializer(obj).data if obj else None)
    with transaction.atomic():
        user = User.objects.select_for_update().get(pk=request.user.pk)
        obj = Vehicle.objects.filter(driver=user).first()
        serializer = VehicleSerializer(obj, data=request.data)
        serializer.is_valid(raise_exception=True)
        changed = obj is None or any(
            getattr(obj, key) != serializer.validated_data.get(key, getattr(obj, key))
            for key in ["kind", "plate", "capacity", "license_number"]
        )
        serializer.save(driver=user)
        if changed and DriverProfile.objects.filter(user=user).exists():
            DriverProfile.objects.filter(user=user).update(status="draft")
            User.objects.filter(pk=user.pk).update(verified=False)
    return Response(serializer.data)


@extend_schema(responses=UserSerializer(many=True))
@api_view(["GET"])
def team(request):
    if request.user.role != "operator":
        raise PermissionDenied()
    users = (
        User.objects.select_related("vehicle", "driver_profile")
        .filter(is_active=True, role__in=["driver", "inspector", "owner"])
        .order_by("role", "id")
    )
    return Response(UserSerializer(users, many=True).data)


@extend_schema(request=VerifyRequest, responses=UserSerializer)
@api_view(["POST"])
def verify_user(request, pk):
    if request.user.role != "operator":
        raise PermissionDenied()
    user = get_object_or_404(User, pk=pk, role__in=["owner", "driver", "inspector"])
    if (
        user.role == "driver"
        and request.data.get("verified") is True
        and not driver_documents_valid(user)
    ):
        raise ValidationError("ابتدا پرونده مدارک راننده را بررسی و تأیید کنید.")
    if not isinstance(request.data.get("verified"), bool):
        raise ValidationError("وضعیت احراز باید منطقی باشد.")
    user.verified = request.data["verified"]
    user.save(update_fields=["verified"])
    audit(request.user, "user.verify", user, {"verified": user.verified})
    return Response(UserSerializer(user).data)


class InvoiceViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Invoice.objects.none()
    serializer_class = InvoiceSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Invoice.objects.none()
        if self.request.user.role == "inspector":
            return Invoice.objects.none()
        return (
            Invoice.objects.filter(
                shipment__in=shipment_scope(self.request.user, market=False)
            )
            .select_related("shipment")
            .order_by("-id")
        )

    @extend_schema(request=SettlementRequest, responses=InvoiceSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def settle(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied()
        obj = self.get_object()
        invoice = Invoice.objects.select_for_update().get(pk=obj.pk)
        if invoice.status == "paid":
            raise ValidationError("این صورتحساب قبلاً تسویه شده است.")
        serializer = SettlementRequest(data=request.data)
        serializer.is_valid(raise_exception=True)
        reference = serializer.validated_data["reference"]
        invoice.status = "paid"
        total = invoice.payments.aggregate(n=Sum("amount"))["n"] or 0
        if invoice.payments.filter(reference=reference).exists():
            raise ValidationError("این مرجع قبلاً ثبت شده است.")
        PaymentRecord.objects.create(
            invoice=invoice,
            amount=invoice.amount - total,
            reference=reference,
            actor=request.user,
        )
        invoice.reference = reference
        invoice.paid_at = timezone.now()
        invoice.save()
        audit(request.user, "invoice.settle", invoice, {"reference": reference})
        return Response(self.get_serializer(invoice).data)


class TicketViewSet(viewsets.ModelViewSet):
    queryset = Ticket.objects.none()
    serializer_class = TicketSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Ticket.objects.none()
        return (
            Ticket.objects.all()
            .prefetch_related("messages__author")
            .select_related("user")
            if self.request.user.role == "operator"
            else Ticket.objects.filter(user=self.request.user)
            .prefetch_related("messages__author")
            .select_related("user")
        )

    @transaction.atomic
    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @extend_schema(request=MessageSerializer, responses=TicketSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reply(self, request, pk=None):
        ticket = self.get_object()
        ticket = Ticket.objects.select_for_update().get(pk=ticket.pk)
        if ticket.status == "closed":
            raise ValidationError("تیکت بسته شده است.")
        serializer = MessageSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save(ticket=ticket, author=request.user)
        ticket.save(update_fields=["updated_at"])
        return Response(TicketSerializer(ticket).data)

    @extend_schema(request=None, responses=TicketSerializer)
    @action(detail=True, methods=["post"])
    def close(self, request, pk=None):
        ticket = self.get_object()
        ticket.status = "closed"
        ticket.save(update_fields=["status", "updated_at"])
        return Response(TicketSerializer(ticket).data)


class ComplaintViewSet(viewsets.ModelViewSet):
    queryset = Complaint.objects.none()
    serializer_class = ComplaintSerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Complaint.objects.none()
        qs = Complaint.objects.select_related("user", "shipment").prefetch_related(
            "messages__author", "photos"
        )
        if self.request.user.role == "operator":
            return qs
        return qs.filter(user=self.request.user)

    @transaction.atomic
    def perform_create(self, serializer):
        if self.request.user.role != "owner":
            raise PermissionDenied("ثبت شکایت فقط برای صاحب بار مجاز است.")
        complaint = serializer.save(user=self.request.user)
        audit(self.request.user, "complaint.create", complaint)

    @extend_schema(request=ComplaintReplySerializer, responses=ComplaintSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def reply(self, request, pk=None):
        complaint = Complaint.objects.select_for_update().get(pk=self.get_object().pk)
        if complaint.status in ["resolved", "rejected"]:
            raise ValidationError("این شکایت بسته شده است.")
        if request.user.role not in ["owner", "operator"]:
            raise PermissionDenied()
        serializer = ComplaintReplySerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        ComplaintMessage.objects.create(
            complaint=complaint,
            author=request.user,
            body=serializer.validated_data["body"],
        )
        complaint.save(update_fields=["updated_at"])
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)

    @extend_schema(request=ComplaintStatusSerializer, responses=ComplaintSerializer)
    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied("تغییر وضعیت شکایت فقط برای اپراتور است.")
        complaint = self.get_object()
        serializer = ComplaintStatusSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        complaint.status = serializer.validated_data["status"]
        complaint.save(update_fields=["status", "updated_at"])
        audit(request.user, "complaint.review", complaint, {"status": complaint.status})
        return Response(ComplaintSerializer(complaint, context={"request": request}).data)

    @extend_schema(
        request={"multipart/form-data": UploadRequest},
        responses={201: ComplaintPhotoSerializer},
    )
    @action(detail=True, methods=["post"])
    def photos(self, request, pk=None):
        complaint = self.get_object()
        if complaint.user_id != request.user.id or complaint.status != "pending":
            raise PermissionDenied("بارگذاری مدرک فقط برای شکایت باز خودتان ممکن است.")
        if complaint.photos.count() >= 10:
            raise ValidationError("حداکثر ۱۰ تصویر برای هر شکایت مجاز است.")
        file = request.FILES.get("file")
        if not file or file.size > 10 * 1024 * 1024:
            raise ValidationError("تصویر معتبر با حجم حداکثر ۱۰ مگابایت انتخاب کنید.")
        ext = file.name.rsplit(".", 1)[-1].lower()
        signature = file.read(12)
        file.seek(0)
        valid = (ext in ["jpg", "jpeg"] and signature.startswith(b"\xff\xd8\xff")) or (
            ext == "png" and signature.startswith(b"\x89PNG\r\n\x1a\n")
        )
        if not valid:
            raise ValidationError("فقط تصویر JPG و PNG معتبر پذیرفته می‌شود.")
        photo = ComplaintPhoto.objects.create(
            complaint=complaint, uploaded_by=request.user, file=file
        )
        audit(request.user, "complaint.photo", photo)
        return Response(ComplaintPhotoSerializer(photo).data, status=201)


class NotificationViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Notification.objects.none()
    serializer_class = NotificationSerializer

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return Notification.objects.none()
        return Notification.objects.filter(user=self.request.user)

    @extend_schema(request=None, responses=DetailResponse)
    @action(detail=False, methods=["post"])
    def read_all(self, request):
        self.get_queryset().update(read=True)
        return Response({"detail": "اعلان‌ها خوانده شدند."})

    @extend_schema(request=None, responses=NotificationSerializer)
    @action(detail=True, methods=["post"])
    def read(self, request, pk=None):
        notice = self.get_object()
        notice.read = True
        notice.save(update_fields=["read"])
        return Response(NotificationSerializer(notice).data)


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
def dashboard(request):
    qs = shipment_scope(request.user, market=False)
    invoices = (
        Invoice.objects.filter(shipment__in=qs)
        if request.user.role != "inspector"
        else Invoice.objects.none()
    )
    received = (
        PaymentRecord.objects.filter(invoice__in=invoices).aggregate(n=Sum("amount"))[
            "n"
        ]
        or 0
    )
    received += (
        invoices.filter(status="paid", payments__isnull=True).aggregate(
            n=Sum("amount")
        )["n"]
        or 0
    )
    outstanding = (invoices.aggregate(n=Sum("amount"))["n"] or 0) - received
    return Response(
        {
            "total": qs.count(),
            "active": qs.exclude(status__in=["completed", "cancelled"]).count(),
            "delivered": qs.filter(status__in=["delivered", "completed"]).count(),
            "pending": qs.filter(status="pending").count(),
            "revenue": received
            if request.user.role != "operator" or "finance" in request.user.capabilities
            else 0,
            "unpaid": outstanding
            if request.user.role != "operator" or "finance" in request.user.capabilities
            else 0,
            "by_status": list(qs.values("status").annotate(count=Count("id"))),
            "recent": ShipmentSerializer(
                qs[:5]
                if request.user.role != "operator"
                or "dispatch" in request.user.capabilities
                else qs.none(),
                many=True,
                context={"request": request},
            ).data,
            "notifications": Notification.objects.filter(
                user=request.user, read=False
            ).count(),
            "open_tickets": Ticket.objects.filter(
                Q() if request.user.role == "operator" else Q(user=request.user),
                status="open",
            ).count(),
            "support_phone": settings.SUPPORT_PHONE,
            "driver": driver_summary(request.user)
            if request.user.role == "driver"
            else None,
        }
    )


@method_decorator(csrf_protect, name="dispatch")
class OtpRequestView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(request=OpenApiTypes.OBJECT, responses=DetailResponse, auth=[])
    def post(self, request):
        request_phone_code(request.data.get("phone"))
        return Response({"detail": "اگر شماره در سامانه باشد، کد تأیید پیامک می‌شود."})


@method_decorator(csrf_protect, name="dispatch")
class OtpVerifyView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [LoginThrottle]

    @extend_schema(request=OpenApiTypes.OBJECT, responses=UserSerializer, auth=[])
    def post(self, request):
        user = verify_phone_code(request.data.get("phone"), request.data.get("code"))
        if getattr(request, "portal_role", None) and request.portal_role != user.role:
            raise PermissionDenied("این حساب به برنامهٔ انتخاب‌شده دسترسی ندارد.")
        role = request.data.get("role")
        if role and role != user.role:
            return Response({"detail": "این حساب به پنل انتخاب‌شده دسترسی ندارد."}, status=403)
        from .security import verify_login

        verify_login(user, request.data.get("mfa", ""))
        login(request, user)
        remember = request.data.get("remember") in [True, "true", "1", 1]
        request.session.set_expiry(60 * 60 * 24 * 30 if remember else 0)
        audit(user, "auth.otp", user)
        return Response(UserSerializer(user).data)


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
def places(request):
    return Response(places_payload(request.query_params.get("q", "")))


@extend_schema(responses=OpenApiTypes.BINARY)
@api_view(["GET"])
def waybill_download(request, pk):
    shipment = get_object_or_404(Shipment, pk=pk)
    waybill = getattr(shipment, "waybill", None)
    allowed = request.user.role == "operator" or shipment.driver_id == request.user.pk or shipment.owner_id == request.user.pk or shipment.inspector_id == request.user.pk
    if not waybill or not waybill.photo or not allowed:
        raise PermissionDenied()
    try:
        return FileResponse(waybill.photo.open("rb"), as_attachment=False, filename=waybill.photo_name or "waybill")
    except FileNotFoundError as error:
        from rest_framework.exceptions import NotFound

        raise NotFound("عکس بارنامه پیدا نشد.") from error


@extend_schema(
    parameters=[OpenApiParameter("code", str, required=True)],
    responses=TrackingResponse,
    auth=[],
)
@api_view(["GET"])
@permission_classes([AllowAny])
def track(request):
    code = request.query_params.get("code", "").strip().upper()
    obj = get_object_or_404(Shipment, code=code)
    return Response(
        {
            "code": obj.code,
            "origin": obj.origin,
            "destination": obj.destination,
            "status": obj.status,
            "updated_at": obj.updated_at,
        }
    )


@method_decorator(csrf_protect, name="dispatch")
class ContactView(APIView):
    permission_classes = [AllowAny]
    throttle_classes = [ContactThrottle]

    @extend_schema(request=ContactSerializer, responses={201: DetailResponse}, auth=[])
    def post(self, request):
        serializer = ContactSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        with transaction.atomic():
            obj = serializer.save()
            Lead.objects.create(
                name=obj.name,
                phone=obj.phone,
                description=obj.message,
                source="website",
                contact_request=obj,
            )
        return Response(
            {"detail": "درخواست شما ثبت شد؛ تیم عملیات آن را بررسی می‌کند."}, status=201
        )


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
def operations(request):
    if request.user.role != "operator":
        raise PermissionDenied()
    return Response(
        {
            "audit": list(
                AuditLog.objects.select_related("actor").values(
                    "id",
                    "action",
                    "object_id",
                    "created_at",
                    "actor__first_name",
                    "detail",
                )[:100]
            ),
            "contacts": list(
                ContactRequest.objects.order_by("-created_at").values()[:100]
            ),
        }
    )
