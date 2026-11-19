import csv, io, secrets
from django.core.cache import cache
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
from .inspector_flow import (
    create_inspector,
    decide_inspection,
    inspector_public,
    save_inspection_photo,
    save_inspection_report,
    update_inspector,
)
from .driver_flow import (
    accept_shipment,
    add_delivery_photo,
    complete_delivery,
    decline_shipment,
    driver_summary,
    issue_waybill as issue_trip_waybill,
    nearby_market,
    places_payload,
    post_message,
    request_delivery_code,
    request_phone_code,
    save_waybill_photo as save_trip_waybill_photo,
    search_market,
    verify_phone_code,
    verify_waybill,
)
from .services import (
    GPS_STATUSES,
    add_note,
    assign,
    audit,
    confirm_waybill,
    driver_documents_valid,
    driver_market_enabled,
    event,
    issue_waybill,
    owner_block_message,
    record_penalty,
    replace_driver,
    resolve_alert,
    save_waybill_photo,
    scan_alerts,
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
        blocked = owner_block_message(self.request.user)
        if blocked:
            raise ValidationError(blocked)
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

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def waybill(self, request, pk=None):
        shipment = self.get_object()
        action_name = request.data.get("action")
        if action_name == "send":
            result = issue_waybill(shipment.pk, request.user)
        elif action_name == "confirm":
            result = confirm_waybill(shipment.pk, request.user, request.data.get("code", ""))
        elif action_name == "photo":
            result = save_waybill_photo(shipment.pk, request.user, request.FILES.get("photo"))
        else:
            raise ValidationError("عملیات بارنامه نامعتبر است.")
        return Response(self.get_serializer(result).data)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def penalty(self, request, pk=None):
        shipment = self.get_object()
        result = record_penalty(
            shipment.pk,
            request.user,
            request.data.get("delay_minutes", 0),
            bool(request.data.get("force_majeure")),
            request.data.get("reason", ""),
        )
        return Response(self.get_serializer(result).data)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def replace(self, request, pk=None):
        shipment = self.get_object()
        result = replace_driver(shipment.pk, request.user, request.data.get("reason", ""))
        return Response(self.get_serializer(result).data)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    def note(self, request, pk=None):
        shipment = self.get_object()
        result = add_note(shipment.pk, request.user, request.data.get("body", ""))
        return Response(self.get_serializer(result).data)

    @extend_schema(responses={(200, "text/html"): OpenApiTypes.STR})
    @action(detail=True, methods=["get"])
    def dossier(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied("پرونده فقط برای اپراتور است.")
        shipment = self.get_object()
        rows = [
            f"کد: {shipment.code}",
            f"عنوان: {shipment.title}",
            f"مسیر: {shipment.origin} به {shipment.destination}",
            f"وضعیت: {shipment.get_status_display()}",
            f"صاحب بار: {shipment.owner.get_full_name()}",
            f"راننده: {shipment.driver.get_full_name() if shipment.driver_id else '—'}",
            f"متصدی: {shipment.inspector.get_full_name() if shipment.inspector_id else '—'}",
            f"کرایه: {shipment.price}",
            f"جریمه: {shipment.penalty_amount}",
            f"بارنامه تأیید شده: {'بله' if shipment.waybill_verified_at else 'خیر'}",
        ]
        body = "".join(f"<li>{line}</li>" for line in rows)
        html = (
            "<!doctype html><html lang='fa' dir='rtl'><meta charset='utf-8'>"
            f"<title>پرونده {shipment.code}</title><body><h1>پرونده محموله</h1><ul>{body}</ul></body></html>"
        )
        response = HttpResponse(html, content_type="text/html; charset=utf-8")
        response["Content-Disposition"] = f'attachment; filename="dossier-{shipment.code}.html"'
        return response

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
        inspection = serializer.save(
            shipment=shipment,
            inspector=request.user,
            passed=passed,
            decision="approved" if passed else "stopped",
        )
        if not passed and shipment.status in [
            "arrived_pickup",
            "loading",
            "waybill",
            "in_transit",
            "near_destination",
        ]:
            if shipment.status != "on_hold":
                shipment.hold_resume = shipment.status
            shipment.status = "on_hold"
            shipment.save(update_fields=["status", "hold_resume", "updated_at"])
            for person in (shipment.driver, shipment.owner):
                if person:
                    Notification.objects.create(
                        user=person,
                        shipment=shipment,
                        title="مأموریت موقتاً متوقف شد",
                        body="بازرسی مغایرت دارد و بار تا تصمیم مرکز عملیات متوقف است.",
                    )
        event(
            shipment,
            request.user,
            "بازرسی " + ("تأیید شد" if inspection.passed else "نیاز به اصلاح دارد"),
        )
        return Response(serializer.data, status=201)

    @extend_schema(request=OpenApiTypes.OBJECT, responses=InspectionSerializer)
    @action(detail=True, methods=["post"], url_path="inspection-report")
    def inspection_report(self, request, pk=None):
        report = save_inspection_report(request.user, self.get_object().pk, request.data)
        return Response(InspectionSerializer(report).data)

    @extend_schema(request=OpenApiTypes.BINARY, responses=InspectionSerializer)
    @action(detail=True, methods=["post"], url_path="inspection-photos")
    def inspection_photos(self, request, pk=None):
        report = save_inspection_photo(
            request.user,
            self.get_object().pk,
            request.FILES.get("file"),
            request.data.get("kind") or "cargo",
        )
        return Response(InspectionSerializer(report).data)

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

    def _message_rows(self, shipment, user, channel):
        return [
            {
                "id": item.pk,
                "body": item.body,
                "created_at": item.created_at,
                "author_name": item.author.get_full_name() or item.author.username,
                "role": item.author.role,
                "mine": item.author_id == user.pk,
            }
            for item in shipment.messages.filter(channel=channel).select_related("author")
        ]

    @extend_schema(responses=ShipmentMessageSerializer(many=True))
    @action(detail=True, methods=["get", "post"])
    def messages(self, request, pk=None):
        shipment = self.get_object()
        user = request.user
        if request.method == "GET":
            channel = request.query_params.get("channel")
            if user.role == "owner":
                if channel != "owner_operator" or shipment.owner_id != user.id:
                    raise PermissionDenied()
                return Response(self._message_rows(shipment, user, "owner_operator"))
            if user.role == "driver":
                if shipment.driver_id != user.id:
                    raise PermissionDenied()
                return Response(self._message_rows(shipment, user, "driver_operator"))
            if user.role != "operator":
                raise PermissionDenied()
            chosen = (
                channel
                if channel in ("owner_operator", "driver_operator")
                else ("driver_operator" if shipment.driver_id else "owner_operator")
            )
            return Response(self._message_rows(shipment, user, chosen))
        body = (request.data.get("body") or "").strip()
        if user.role == "owner":
            if shipment.owner_id != user.id:
                raise PermissionDenied()
            if not body or len(body) > 2000:
                raise ValidationError("متن گفتگو را بنویسید.")
            message = ShipmentMessage.objects.create(
                shipment=shipment,
                author=user,
                body=body,
                channel="owner_operator",
            )
            Notification.objects.bulk_create(
                [
                    Notification(
                        user=operator,
                        shipment=shipment,
                        title=f"{shipment.code} · پیام صاحب بار",
                        body=body[:180],
                    )
                    for operator in User.objects.filter(role="operator", is_active=True)[:15]
                ]
            )
            return Response(ShipmentMessageSerializer(message).data, status=201)
        if user.role == "driver":
            post_message(user, shipment.pk, body)
            return Response(self._message_rows(shipment, user, "driver_operator"))
        if user.role != "operator":
            raise PermissionDenied()
        channel = request.data.get("channel") or (
            "driver_operator" if shipment.driver_id else "owner_operator"
        )
        if channel not in ("owner_operator", "driver_operator"):
            raise ValidationError("کانال گفتگو نامعتبر است.")
        if channel == "driver_operator" and not shipment.driver_id:
            raise ValidationError("راننده‌ای برای این گفتگو تخصیص نیافته است.")
        if not body or len(body) > 1000:
            raise ValidationError("متن پیام باید بین ۱ تا ۱۰۰۰ نویسه باشد.")
        ShipmentMessage.objects.create(
            shipment=shipment, author=user, body=body, channel=channel
        )
        target = shipment.driver if channel == "driver_operator" else shipment.owner
        if target:
            Notification.objects.create(
                user=target,
                shipment=shipment,
                title=f"پیام اپراتور در {shipment.code}",
                body=body[:180],
            )
        return Response(self._message_rows(shipment, user, channel))

    @extend_schema(request=None, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"], url_path="operator-price")
    @transaction.atomic
    def operator_price(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied("فقط اپراتور می‌تواند قیمت نهایی پیشنهاد کند.")
        shipment = Shipment.objects.select_for_update().get(pk=self.get_object().pk)
        if shipment.status not in ["pending", "approved", "assigned"]:
            raise ValidationError("در این مرحله قیمت قابل پیشنهاد نیست.")
        try:
            amount = int(request.data.get("amount"))
        except (TypeError, ValueError):
            raise ValidationError("مبلغ معتبر وارد کنید.")
        if amount < 1000:
            raise ValidationError("مبلغ پیشنهاد خیلی کم است.")
        shipment.operator_price = amount
        shipment.price_status = "proposed"
        shipment.save(update_fields=["operator_price", "price_status", "updated_at"])
        Notification.objects.create(
            user=shipment.owner,
            shipment=shipment,
            title=f"{shipment.code} · قیمت نهایی پیشنهاد شد",
            body="قیمت پیشنهادی اپراتور را در جزئیات بار تأیید یا رد کنید.",
        )
        audit(request.user, "shipment.operator_price", shipment, {"amount": amount})
        return Response(self.get_serializer(shipment).data)

    @extend_schema(request=None, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"], url_path="price-response")
    @transaction.atomic
    def price_response(self, request, pk=None):
        shipment = Shipment.objects.select_for_update().get(pk=self.get_object().pk)
        if request.user.role != "owner" or shipment.owner_id != request.user.id:
            raise PermissionDenied()
        if shipment.price_status != "proposed" or not shipment.operator_price:
            raise ValidationError("پیشنهاد قیمتی برای تأیید وجود ندارد.")
        accept = request.data.get("accept") in [True, "true", "1", 1]
        shipment.price_status = "accepted" if accept else "rejected"
        if accept:
            shipment.price = shipment.operator_price
        shipment.save(update_fields=["price_status", "price", "updated_at"])
        event(
            shipment,
            request.user,
            "قیمت اپراتور تأیید شد." if accept else "قیمت اپراتور رد شد.",
        )
        return Response(self.get_serializer(shipment).data)

    @extend_schema(request=None, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def hold(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied()
        shipment = Shipment.objects.select_for_update().get(pk=self.get_object().pk)
        if shipment.status not in ["pending", "approved", "assigned"]:
            raise ValidationError("این مرحله قابل توقف نیست.")
        shipment.hold_resume = shipment.status
        shipment.status = "on_hold"
        shipment.save(update_fields=["hold_resume", "status", "updated_at"])
        event(shipment, request.user, "بار موقتاً متوقف شد.")
        return Response(self.get_serializer(shipment).data)

    @extend_schema(request=None, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"])
    @transaction.atomic
    def resume(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied()
        shipment = Shipment.objects.select_for_update().get(pk=self.get_object().pk)
        if shipment.status != "on_hold" or not shipment.hold_resume:
            raise ValidationError("این بار متوقف نیست.")
        shipment.status = shipment.hold_resume
        shipment.hold_resume = ""
        shipment.save(update_fields=["hold_resume", "status", "updated_at"])
        event(shipment, request.user, "توقف بار برداشته شد.")
        return Response(self.get_serializer(shipment).data)

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
        code = issue_trip_waybill(request.user, self.get_object().pk)
        return Response({"detail": "کد بارنامه صادر شد.", "code": code})

    @extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
    @action(detail=True, methods=["post"], url_path="waybill-verify")
    def waybill_verify(self, request, pk=None):
        result = verify_waybill(request.user, self.get_object().pk, request.data.get("code"))
        return Response(self.get_serializer(result).data)

    @extend_schema(request=OpenApiTypes.BINARY, responses=OpenApiTypes.OBJECT)
    @action(detail=True, methods=["post"], url_path="waybill-photo")
    def waybill_photo_upload(self, request, pk=None):
        waybill = save_trip_waybill_photo(
            request.user, self.get_object().pk, request.FILES.get("file")
        )
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


@extend_schema(responses={(200, "application/octet-stream"): OpenApiTypes.BINARY})
@api_view(["GET"])
def owner_kyc_download(request, pk):
    document = get_object_or_404(OwnerKycFile, pk=pk)
    if request.user.role != "operator" and document.identity.user_id != request.user.id:
        raise PermissionDenied()
    try:
        return FileResponse(document.file.open("rb"), as_attachment=True)
    except FileNotFoundError as error:
        from rest_framework.exceptions import NotFound

        raise NotFound("فایل مدرک پیدا نشد.") from error


@extend_schema(request=UploadRequest, responses=UserSerializer)
@api_view(["GET", "POST"])
def avatar(request):
    if request.method == "GET":
        if not request.user.avatar:
            raise ValidationError("تصویری ثبت نشده است.")
        try:
            return FileResponse(request.user.avatar.open("rb"))
        except FileNotFoundError as error:
            from rest_framework.exceptions import NotFound

            raise NotFound("فایل تصویر پیدا نشد.") from error
    file = request.FILES.get("file")
    if not file or file.size > 5 * 1024 * 1024:
        raise ValidationError("تصویر پروفایل حداکثر ۵ مگابایت است.")
    signature = file.read(12)
    file.seek(0)
    ext = file.name.rsplit(".", 1)[-1].lower()
    if not (
        (ext in ["jpg", "jpeg"] and signature.startswith(b"\xff\xd8\xff"))
        or (ext == "png" and signature.startswith(b"\x89PNG\r\n\x1a\n"))
    ):
        raise ValidationError("فقط JPG و PNG برای تصویر پروفایل پذیرفته می‌شود.")
    request.user.avatar = file
    request.user.save(update_fields=["avatar"])
    return Response(UserSerializer(request.user).data)


@extend_schema(request=None, responses=DetailResponse)
@api_view(["POST"])
@permission_classes([AllowAny])
def otp_start(request):
    if not settings.DEMO_ENABLED:
        raise ValidationError(
            "ورود پیامکی در این محیط فعال نیست. با نام کاربری و رمز وارد شوید."
        )
    phone = str(request.data.get("phone") or "")
    phone = phone.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    if len(phone) != 11 or not phone.startswith("09") or not phone.isdigit():
        raise ValidationError("شماره موبایل معتبر وارد کنید.")
    user = User.objects.filter(phone=phone, role="owner", is_active=True).first()
    if not user:
        return Response({"detail": "اگر این شماره برای صاحب بار باشد، کد ساخته می‌شود."})
    code = f"{secrets.randbelow(900000) + 100000}"
    cache.set("owner-otp:" + phone, code, 120)
    return Response({"detail": "کد آزمایشی ساخته شد.", "demo_code": code})


@extend_schema(request=None, responses=UserSerializer)
@api_view(["POST"])
@permission_classes([AllowAny])
def otp_confirm(request):
    if not settings.DEMO_ENABLED:
        raise ValidationError("ورود پیامکی در این محیط فعال نیست.")
    phone = str(request.data.get("phone") or "")
    phone = phone.translate(str.maketrans("۰۱۲۳۴۵۶۷۸۹٠١٢٣٤٥٦٧٨٩", "01234567890123456789"))
    code = str(request.data.get("code") or "")
    if cache.get("owner-otp:" + phone) != code:
        raise ValidationError("کد تأیید درست نیست یا منقضی شده است.")
    user = User.objects.filter(phone=phone, role="owner", is_active=True).first()
    if not user:
        raise ValidationError("حساب صاحب بار با این شماره پیدا نشد.")
    cache.delete("owner-otp:" + phone)
    login(request, user)
    audit(user, "auth.otp", user)
    return Response(UserSerializer(user).data)


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


class OwnerIdentityViewSet(viewsets.ModelViewSet):
    queryset = OwnerIdentity.objects.none()
    serializer_class = OwnerIdentitySerializer
    http_method_names = ["get", "post", "head", "options"]

    def get_queryset(self):
        if getattr(self, "swagger_fake_view", False):
            return OwnerIdentity.objects.none()
        qs = OwnerIdentity.objects.select_related("user").prefetch_related("files")
        if self.request.user.role == "operator":
            return qs
        return qs.filter(user=self.request.user)

    @transaction.atomic
    def create(self, request, *args, **kwargs):
        if request.user.role != "owner":
            raise PermissionDenied("احراز هویت صاحب بار فقط برای همین نقش است.")
        id_type = request.data.get("id_type")
        if id_type not in ["national_card", "birth_certificate"]:
            raise ValidationError("شناسنامه یا کارت ملی را انتخاب کنید.")
        identity, created = OwnerIdentity.objects.get_or_create(
            user=request.user,
            defaults={"id_type": id_type, "status": "missing"},
        )
        if identity.status == "approved":
            raise ValidationError("هویت تأییدشده را نمی‌توان عوض کرد.")
        identity.id_type = id_type
        if identity.files.exists():
            identity.status = "pending"
        identity.save()
        return Response(
            OwnerIdentitySerializer(identity).data,
            status=201 if created else 200,
        )

    @action(detail=True, methods=["post"])
    def files(self, request, pk=None):
        identity = self.get_object()
        if identity.user_id != request.user.id or identity.status == "approved":
            raise PermissionDenied()
        slot = request.data.get("slot")
        if slot not in ["document", "selfie"]:
            raise ValidationError("بخش مدرک معتبر نیست.")
        file = request.FILES.get("file")
        if not file or file.size > 8 * 1024 * 1024:
            raise ValidationError("تصویر معتبر با حجم حداکثر ۸ مگابایت انتخاب کنید.")
        signature = file.read(16)
        file.seek(0)
        ext = file.name.rsplit(".", 1)[-1].lower()
        valid = (
            (ext in ["jpg", "jpeg"] and signature.startswith(b"\xff\xd8\xff"))
            or (ext == "png" and signature.startswith(b"\x89PNG\r\n\x1a\n"))
            or (
                ext == "webp"
                and signature.startswith(b"RIFF")
                and signature[8:12] == b"WEBP"
            )
        )
        if not valid:
            raise ValidationError("فقط JPG، PNG و WEBP پذیرفته می‌شود.")
        OwnerKycFile.objects.update_or_create(
            identity=identity, slot=slot, defaults={"file": file}
        )
        identity.status = "pending"
        identity.save(update_fields=["status", "updated_at"])
        return Response(OwnerIdentitySerializer(identity).data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        if request.user.role != "operator":
            raise PermissionDenied()
        identity = self.get_object()
        status_value = request.data.get("status")
        if status_value not in ["approved", "rejected"]:
            raise ValidationError("نتیجه بررسی معتبر نیست.")
        if status_value == "approved" and identity.files.count() < 2:
            raise ValidationError("مدرک و سلفی هر دو باید بارگذاری شده باشند.")
        identity.status = status_value
        identity.note = (request.data.get("note") or "")[:500]
        identity.save(update_fields=["status", "note", "updated_at"])
        audit(request.user, "owner.kyc", identity, {"status": status_value})
        return Response(OwnerIdentitySerializer(identity).data)


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
            "open_alerts": (
                scan_alerts() if request.user.role == "operator" else 0
            ),
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
        phone = request_phone_code(request.data.get("phone"))
        payload = {"detail": "اگر شماره در سامانه باشد، کد تأیید پیامک می‌شود."}
        if settings.DEMO_ENABLED:
            from .models import SmsOutbox

            sms = SmsOutbox.objects.filter(phone=phone).order_by("-id").first()
            if sms and ":" in sms.body:
                payload["demo_code"] = sms.body.rsplit(":", 1)[-1].strip()
        return Response(payload)


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
def alerts(request):
    if request.user.role != "operator":
        raise PermissionDenied()
    scan_alerts()
    rows = OperationalAlert.objects.select_related("shipment").filter(is_resolved=False)[:100]
    return Response(
        [
            {
                "id": row.id,
                "kind": row.kind,
                "severity": row.severity,
                "message": row.message,
                "shipment": row.shipment_id,
                "code": row.shipment.code,
                "created_at": row.created_at,
            }
            for row in rows
        ]
    )


@extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
def resolve_operational_alert(request, pk):
    if request.user.role != "operator":
        raise PermissionDenied()
    row = resolve_alert(pk, request.user, request.data.get("resolution", ""))
    return Response({"id": row.id, "is_resolved": row.is_resolved})


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


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET", "POST"])
def inspectors(request):
    if request.user.role != "operator":
        raise PermissionDenied()
    if request.method == "GET":
        rows = InspectorAccount.objects.select_related("user").order_by("user__first_name")
        known = {row.user_id for row in rows}
        extra = []
        for person in User.objects.filter(role="inspector").exclude(id__in=known):
            extra.append(InspectorAccount.objects.create(user=person))
        return Response([inspector_public(row) for row in list(rows) + extra])
    account = create_inspector(
        request.user,
        request.data.get("full_name"),
        request.data.get("phone"),
        request.data.get("notes", ""),
    )
    return Response(inspector_public(account), status=201)


@extend_schema(request=OpenApiTypes.OBJECT, responses=OpenApiTypes.OBJECT)
@api_view(["PATCH"])
def inspector_detail(request, pk):
    account, unassigned = update_inspector(request.user, pk, request.data)
    payload = inspector_public(account)
    payload["unassigned"] = unassigned
    return Response(payload)


@extend_schema(request=OpenApiTypes.OBJECT, responses=ShipmentSerializer)
@api_view(["POST"])
def inspection_decision(request, pk):
    shipment = decide_inspection(
        request.user,
        pk,
        request.data.get("decision"),
        request.data.get("note"),
    )
    return Response(ShipmentSerializer(shipment, context={"request": request}).data)


@extend_schema(responses=OpenApiTypes.BINARY)
@api_view(["GET"])
def inspection_photo_download(request, pk):
    photo = get_object_or_404(InspectionPhoto.objects.select_related("inspection__shipment"), pk=pk)
    shipment = photo.inspection.shipment
    user = request.user
    allowed = user.role == "operator" or user.id in {
        shipment.owner_id,
        shipment.driver_id,
        shipment.inspector_id,
    }
    if not allowed:
        raise PermissionDenied()
    return FileResponse(photo.file.open("rb"), as_attachment=True, filename=photo.file.name.rsplit("/", 1)[-1])
