import base64, hashlib, time
import pyotp
from cryptography.fernet import Fernet, InvalidToken
from django.conf import settings
from django.db import transaction
from django.contrib.auth.forms import PasswordResetForm, SetPasswordForm
from django.contrib.auth.tokens import default_token_generator
from django.utils.http import urlsafe_base64_decode
from django.utils.encoding import force_str
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import csrf_protect
from rest_framework import serializers
from rest_framework.views import APIView
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from rest_framework.decorators import api_view
from rest_framework.exceptions import ValidationError
from drf_spectacular.utils import extend_schema
from drf_spectacular.types import OpenApiTypes
from .models import User, AccountSecurity
from .services import audit


def cipher():
    return Fernet(
        base64.urlsafe_b64encode(
            hashlib.sha256(settings.SECURITY_ENCRYPTION_KEY.encode()).digest()
        )
    )


def encrypt(secret):
    return cipher().encrypt(secret.encode()).decode()


def decrypt(secret):
    try:
        return cipher().decrypt(secret.encode()).decode()
    except InvalidToken:
        raise ValidationError(
            "پیکربندی ورود دومرحله‌ای قابل خواندن نیست؛ با مدیر سامانه تماس بگیرید."
        )


def valid_counter(secret, code, last=-1):
    if (
        not isinstance(code, str)
        or len(code) != 6
        or not code.isascii()
        or not code.isdigit()
    ):
        return None
    counter = int(time.time()) // 30
    totp = pyotp.TOTP(secret)
    for candidate in [counter, counter - 1, counter + 1]:
        if candidate > last and pyotp.utils.strings_equal(
            totp.at(candidate * 30), code
        ):
            return candidate
    return None


@transaction.atomic
def verify_login(user, code):
    security = (
        AccountSecurity.objects.select_for_update()
        .filter(user=user, enabled=True)
        .first()
    )
    if not security:
        return
    counter = valid_counter(decrypt(security.secret), code, security.last_counter)
    if counter is None:
        raise ValidationError("کد دومرحله‌ای معتبر و استفاده‌نشده وارد کنید.")
    security.last_counter = counter
    security.save(update_fields=["last_counter", "updated_at"])


@extend_schema(responses=OpenApiTypes.OBJECT)
@api_view(["GET"])
def security_status(request):
    return Response(
        {
            "mfa_enabled": AccountSecurity.objects.filter(
                user=request.user, enabled=True
            ).exists(),
            "recovery_delivery_configured": bool(settings.EMAIL_HOST),
            "recovery_email_set": bool(request.user.email),
        }
    )


class MFARequest(serializers.Serializer):
    password = serializers.CharField(required=False)
    code = serializers.RegexField(r"^\d{6}$", required=False)


@extend_schema(request=MFARequest, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
@transaction.atomic
def mfa_setup(request):
    data = MFARequest(data=request.data)
    data.is_valid(raise_exception=True)
    if not request.user.check_password(data.validated_data.get("password", "")):
        raise ValidationError("رمز فعلی صحیح نیست.")
    user = User.objects.select_for_update().get(pk=request.user.pk)
    obj, _ = AccountSecurity.objects.get_or_create(user=user)
    if obj.enabled:
        raise ValidationError("ورود دومرحله‌ای فعال است.")
    secret = pyotp.random_base32()
    obj.pending_secret = encrypt(secret)
    obj.save()
    return Response(
        {
            "secret": secret,
            "uri": pyotp.TOTP(secret).provisioning_uri(
                name=user.username, issuer_name="Alamut"
            ),
        }
    )


@extend_schema(request=MFARequest, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
@transaction.atomic
def mfa_enable(request):
    User.objects.select_for_update().get(pk=request.user.pk)
    obj = AccountSecurity.objects.select_for_update().filter(user=request.user).first()
    data = MFARequest(data=request.data)
    data.is_valid(raise_exception=True)
    if not obj or not obj.pending_secret:
        raise ValidationError("ابتدا کلید فعال‌سازی ایجاد کنید.")
    counter = valid_counter(
        decrypt(obj.pending_secret), data.validated_data.get("code", "")
    )
    if counter is None:
        raise ValidationError("کد تأیید صحیح نیست.")
    obj.secret = obj.pending_secret
    obj.pending_secret = ""
    obj.enabled = True
    obj.last_counter = counter
    obj.save()
    audit(request.user, "security.mfa_enabled", request.user)
    return Response({"detail": "ورود دومرحله‌ای فعال شد."})


@extend_schema(request=MFARequest, responses=OpenApiTypes.OBJECT)
@api_view(["POST"])
@transaction.atomic
def mfa_disable(request):
    data = MFARequest(data=request.data)
    data.is_valid(raise_exception=True)
    if not request.user.check_password(data.validated_data.get("password", "")):
        raise ValidationError("رمز فعلی صحیح نیست.")
    verify_login(request.user, data.validated_data.get("code", ""))
    AccountSecurity.objects.filter(user=request.user).update(
        enabled=False, secret="", pending_secret="", last_counter=-1
    )
    audit(request.user, "security.mfa_disabled", request.user)
    return Response({"detail": "ورود دومرحله‌ای غیرفعال شد."})


class RecoveryRequest(serializers.Serializer):
    email = serializers.EmailField()


class PortalPasswordResetForm(PasswordResetForm):
    def __init__(self, *args, role=None, **kwargs):
        super().__init__(*args, **kwargs)
        self.role = role

    def get_users(self, email):
        return (user for user in super().get_users(email) if not self.role or user.role == self.role)


@method_decorator(csrf_protect, name="dispatch")
class RecoveryStart(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RecoveryRequest, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        from .views import LoginThrottle

        for throttle in [LoginThrottle()]:
            if not throttle.allow_request(request, self):
                self.throttled(request, throttle.wait())
        data = RecoveryRequest(data=request.data)
        data.is_valid(raise_exception=True)
        origin = settings.ROLE_ORIGINS.get(getattr(request, "portal_role", None), settings.APP_PUBLIC_URL)
        if settings.EMAIL_HOST or settings.DEBUG:
            form = PortalPasswordResetForm(data.validated_data, role=getattr(request, "portal_role", None))
            if form.is_valid():
                form.save(
                    domain_override=origin.split("://")[-1].rstrip(
                        "/"
                    ),
                    use_https=origin.startswith("https://"),
                    from_email=settings.DEFAULT_FROM_EMAIL,
                    email_template_name="registration/recovery_email.txt",
                    subject_template_name="registration/recovery_subject.txt",
                )
        return Response(
            {
                "detail": "اگر حسابی با این ایمیل وجود داشته باشد و سرویس ارسال فعال باشد، راهنمای بازیابی ارسال می‌شود."
            }
        )


class RecoveryConfirmRequest(serializers.Serializer):
    uid = serializers.CharField()
    token = serializers.CharField()
    new_password = serializers.CharField(write_only=True)


@method_decorator(csrf_protect, name="dispatch")
class RecoveryConfirm(APIView):
    permission_classes = [AllowAny]

    @extend_schema(request=RecoveryConfirmRequest, responses=OpenApiTypes.OBJECT)
    def post(self, request):
        data = RecoveryConfirmRequest(data=request.data)
        data.is_valid(raise_exception=True)
        d = data.validated_data
        try:
            user = User.objects.get(pk=force_str(urlsafe_base64_decode(d["uid"])))
        except (ValueError, TypeError, OverflowError, User.DoesNotExist):
            raise ValidationError("پیوند بازیابی معتبر نیست.")
        role = getattr(request, "portal_role", None)
        if (role and user.role != role) or not default_token_generator.check_token(user, d["token"]):
            raise ValidationError("پیوند بازیابی نامعتبر یا منقضی است.")
        with transaction.atomic():
            user = User.objects.select_for_update().get(pk=user.pk)
            if not default_token_generator.check_token(user, d["token"]):
                raise ValidationError("پیوند قبلاً استفاده شده است.")
            form = SetPasswordForm(
                user,
                {
                    "new_password1": d["new_password"],
                    "new_password2": d["new_password"],
                },
            )
            if not form.is_valid():
                raise ValidationError(form.errors)
            form.save()
            audit(user, "security.recovery", user)
        return Response(
            {
                "detail": "رمز جدید ذخیره شد. دوباره وارد شوید؛ ورود دومرحله‌ای در صورت فعال بودن همچنان لازم است."
            }
        )
