from django.contrib import admin, messages
from django.contrib.auth.admin import UserAdmin
from django.core.exceptions import PermissionDenied, ValidationError
from django.shortcuts import redirect
from django.template.response import TemplateResponse
from django.urls import reverse
from django.utils import timezone
from django.utils.html import format_html
from .admin_site import OPERATION_MODELS, call_api, operation_url, review_payload
from rest_framework.exceptions import ValidationError as ReviewValidationError
from .operations import REQUIRED_CREDENTIALS, driver_position, review_single_credential
from .services import audit
from .models import *


class CapabilityAdmin(admin.ModelAdmin):
    capability = None

    def allowed(self, request):
        return request.user.is_superuser or (
            request.user.is_staff
            and request.user.role == "operator"
            and self.capability in request.user.capabilities
        )

    def has_module_permission(self, request):
        return self.allowed(request)

    def has_view_permission(self, request, obj=None):
        return self.allowed(request)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False

    def has_delete_permission(self, request, obj=None):
        return False

    def get_readonly_fields(self, request, obj=None):
        return [
            field.name
            for field in self.model._meta.fields
            if not field.auto_created and field.name not in (self.exclude or ())
        ]

    def render_change_form(self, request, context, **kwargs):
        record = context.get("original")
        if record and request.user.role == "operator" and self.model._meta.model_name in OPERATION_MODELS:
            context["operation_url"] = operation_url(self.model._meta.model_name, record.pk)
        return super().render_change_form(request, context, **kwargs)


@admin.register(DriverProfile)
class DriverProfileAdmin(CapabilityAdmin):
    capability = "verification"
    list_display = ("user", "status", "submitted_at", "reviewed_by", "updated_at")
    list_filter = ("status",)
    list_select_related = ("user", "reviewed_by")
    list_per_page = 50
    ordering = ("-submitted_at", "-pk")
    search_fields = (
        "user__first_name",
        "user__last_name",
        "user__phone",
        "user__username",
        "national_id",
    )

    def change_view(self, request, object_id, form_url="", extra_context=None):
        profile = self.get_object(request, object_id)
        if profile is None:
            return super().change_view(request, object_id, form_url, extra_context)
        if not self.has_view_permission(request, profile):
            raise PermissionDenied

        form = request.POST
        if request.method == "POST":
            result = call_api(
                request.user,
                f"/api/drivers/{profile.user_id}/review/",
                {**review_payload(form), "submission": form.get("submission", "")},
            )
            if result.status_code < 400:
                messages.success(
                    request, "نتیجهٔ بررسی پرونده ثبت شد و به راننده اطلاع داده شد."
                )
                return redirect("admin:logistics_driverprofile_change", profile.pk)
            errors = (
                result.data
                if isinstance(result.data, list)
                else [result.data.get("detail")]
            )
            for error in filter(None, errors):
                messages.error(request, error)
            if not any(errors):
                messages.error(
                    request,
                    "نتیجهٔ بررسی ثبت نشد. صفحه را تازه و پرونده را دوباره بررسی کنید.",
                )
            profile.refresh_from_db()
            if profile.submitted_at and form.get("submission") != profile.submitted_at.isoformat():
                form = {}

        driver = profile.user
        vehicle = getattr(driver, "vehicle", None)
        uploaded = {document.kind: document for document in driver.credentials.all()}
        documents = [
            {
                "label": label,
                "required": kind in REQUIRED_CREDENTIALS,
                "file": document,
                "decision": form.get(f"document_{document.pk}") if document else "",
                "reason": form.get(f"reason_{document.pk}", "") if document else "",
            }
            for kind, label in DriverCredential.KINDS
            if (document := uploaded.get(kind)) or kind in REQUIRED_CREDENTIALS
        ]
        return TemplateResponse(
            request,
            "admin/alamut_driver_review.html",
            {
                **self.admin_site.each_context(request),
                "opts": self.model._meta,
                "title": str(profile),
                "profile": profile,
                "driver": driver,
                "vehicle": vehicle,
                "documents": documents,
                "can_review": profile.status == "submitted",
                "submission": profile.submitted_at.isoformat() if profile.submitted_at else "",
                "decision": form.get("status", ""),
                "note": form.get("note", ""),
                **(extra_context or {}),
            },
        )


@admin.register(DriverCredential)
class DriverCredentialAdmin(CapabilityAdmin):
    capability = "verification"
    list_display = ("kind", "driver", "status", "uploaded_at")
    list_filter = ("kind", "status")
    list_select_related = ("driver",)
    search_fields = ("driver__first_name", "driver__last_name", "driver__phone")
    def change_view(self, request, object_id, form_url="", extra_context=None):
        if not self.has_view_permission(request):
            raise PermissionDenied
        credential = self.get_object(request, object_id)
        if credential is None:
            return super().change_view(request, object_id, form_url, extra_context)
        profile = getattr(credential.driver, "driver_profile", None)
        note = ""
        if request.method == "POST":
            note = request.POST.get("note", "")
            try:
                review_single_credential(
                    request.user, credential, request.POST.get("status"), note,
                    request.POST.get("submission", ""),
                )
            except ReviewValidationError as error:
                for detail in error.detail:
                    messages.error(request, detail)
                if profile:
                    profile.refresh_from_db()
                credential.refresh_from_db()
            else:
                messages.success(request, "نتیجهٔ بررسی مدرک ثبت شد.")
                return redirect("admin:logistics_drivercredential_change", credential.pk)
        return TemplateResponse(
            request, "admin/alamut_credential_review.html", {
                **self.admin_site.each_context(request),
                "title": credential.get_kind_display(),
                "opts": self.model._meta,
                "credential": credential,
                "profile": profile,
                "can_review": bool(profile and profile.status == "submitted"),
                "submission": profile.submitted_at.isoformat() if profile and profile.submitted_at else "",
                "note": note if request.method == "POST" else credential.note,
                **(extra_context or {}),
            }
        )


@admin.register(LocationPing)
class LocationPingAdmin(CapabilityAdmin):
    capability = "monitoring"
    list_display = ("driver", "shipment", "observed_at", "accuracy")
    list_select_related = ("driver", "shipment")
    search_fields = ("driver__first_name", "driver__last_name", "shipment__code")
    change_list_template = "admin/alamut_location_list.html"
    change_form_template = "admin/alamut_location_detail.html"

    def render_change_form(self, request, context, **kwargs):
        context["map_points"] = [driver_position(context["original"])]
        return super().render_change_form(request, context, **kwargs)


@admin.register(Document)
class ShipmentDocumentAdmin(CapabilityAdmin):
    capability = "dispatch"
    list_display = ("name", "shipment", "uploaded_by", "created_at")
    list_select_related = ("shipment", "uploaded_by")
    search_fields = ("name", "shipment__code")
    exclude = ("file",)

    def get_readonly_fields(self, request, obj=None):
        return [*super().get_readonly_fields(request, obj), "download"]

    @admin.display(description="فایل سند")
    def download(self, obj):
        return format_html(
            '<a href="{}">دانلود فایل سند</a>',
            reverse("shipment-document-download", args=[obj.pk]),
        )


@admin.register(User)
class AlamutUserAdmin(UserAdmin):
    def has_module_permission(self, request):
        return request.user.is_superuser

    def has_view_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_add_permission(self, request):
        return request.user.is_superuser

    def has_change_permission(self, request, obj=None):
        return request.user.is_superuser

    def has_delete_permission(self, request, obj=None):
        return False

    add_fieldsets = UserAdmin.add_fieldsets + (
        (
            "مشخصات همکاری",
            {
                "fields": (
                    "phone",
                    "first_name",
                    "last_name",
                    "role",
                    "company",
                    "verified",
                )
            },
        ),
    )
    fieldsets = UserAdmin.fieldsets + (
        (
            "الموت",
            {
                "fields": (
                    "role",
                    "phone",
                    "company",
                    "national_id",
                    "postal_code",
                    "verified",
                    "capabilities",
                )
            },
        ),
    )
    list_display = ["username", "phone", "role", "verified", "is_active"]
    list_filter = ["role", "verified", "is_active"]


for capability, models in {
    "dispatch": [
        Vehicle,
        Shipment,
        Offer,
        ShipmentEvent,
        Inspection,
        Incident,
    ],
    "finance": [Invoice, PaymentRecord],
    "monitoring": [Notification, AuditLog],
    "crm": [ContactRequest, CRMActivity],
}.items():
    for model in models:
        admin.site.register(
            model,
            type(
                model.__name__ + "ReadOnlyAdmin",
                (CapabilityAdmin,),
                {
                    "capability": capability,
                    "list_per_page": 50,
                    **({"change_form_template": "admin/alamut_record_detail.html"} if model._meta.model_name in OPERATION_MODELS else {}),
                },
            ),
        )

for model in [
    Ticket,
    TicketMessage,
    Complaint,
    ComplaintMessage,
    ComplaintPhoto,
    ShipmentRating,
    ShipmentMessage,
    OwnerIdentity,
    OwnerKycFile,
]:
    admin.site.register(
        model,
        type(
            model.__name__ + "ReadOnlyAdmin",
            (CapabilityAdmin,),
            {
                **({"change_form_template": "admin/alamut_record_detail.html"} if model is Ticket else {}),
                "allowed": lambda self, request: (
                    request.user.is_staff and request.user.role == "operator"
                )
            },
        ),
    )
admin.site.site_header = "مدیریت الموت"
admin.site.site_title = "الموت"


class EditableCapabilityAdmin(CapabilityAdmin):
    serializer_class = None

    def has_add_permission(self, request):
        return self.allowed(request)

    def has_change_permission(self, request, obj=None):
        return self.allowed(request)

    def get_readonly_fields(self, request, obj=None):
        return [
            field.name
            for field in self.model._meta.fields
            if not field.auto_created
            and (not field.editable or field.name in {"created_by", "completed_at"})
        ]

    def get_form(self, request, obj=None, **kwargs):
        base = super().get_form(request, obj, **kwargs)
        serializer_class = self.serializer_class

        class ValidatedForm(base):
            def clean(self):
                cleaned = super().clean()
                payload = {
                    key: value.pk if hasattr(value, "pk") else value
                    for key, value in cleaned.items()
                }
                serializer = serializer_class(
                    obj, data=payload, partial=bool(obj), context={"request": request}
                )
                if not serializer.is_valid():
                    raise ValidationError(str(serializer.errors))
                return cleaned

        return ValidatedForm

    def save_model(self, request, obj, form, change):
        if not change:
            obj.created_by = request.user
        if (
            isinstance(obj, Article)
            and obj.status == "published"
            and not obj.published_at
        ):
            obj.published_at = timezone.now()
        if isinstance(obj, FollowUp):
            obj.completed_at = timezone.now() if obj.done else None
        super().save_model(request, obj, form, change)
        audit(
            request.user,
            self.model._meta.model_name + (".update" if change else ".create"),
            obj,
        )


from .operations import LeadSerializer, FollowUpSerializer
from .editorial import ArticleSerializer


@admin.register(Lead)
class LeadAdmin(EditableCapabilityAdmin):
    capability = "crm"
    change_form_template = "admin/alamut_record_detail.html"
    serializer_class = LeadSerializer
    list_display = ["name", "phone", "stage", "assigned_to", "updated_at"]
    list_filter = ["stage"]
    search_fields = ["name", "phone", "company"]


@admin.register(FollowUp)
class FollowUpAdmin(EditableCapabilityAdmin):
    capability = "crm"
    serializer_class = FollowUpSerializer
    list_display = ["title", "assigned_to", "due_at", "done"]
    list_filter = ["done"]


@admin.register(OutboundEmail)
class OutboundEmailAdmin(CapabilityAdmin):
    capability = "monitoring"
    list_display = [
        "identifier",
        "status",
        "attempts",
        "next_attempt",
        "last_error",
        "created_at",
    ]
    exclude = ["payload"]
    readonly_fields = [
        "status",
        "attempts",
        "next_attempt",
        "last_error",
        "created_at",
        "updated_at",
    ]

    def has_add_permission(self, request):
        return False

    @admin.display(description="شناسه", ordering="pk")
    def identifier(self, obj):
        return obj.pk


@admin.register(AccountSecurity)
class AccountSecurityAdmin(CapabilityAdmin):
    def allowed(self, request):
        return request.user.is_superuser

    def get_readonly_fields(self, request, obj=None):
        return ["user", "enabled", "updated_at"]

    list_display = ["user", "enabled", "updated_at"]
    exclude = ["secret", "pending_secret", "last_counter"]
    readonly_fields = ["user", "updated_at"]

    def has_add_permission(self, request):
        return False


@admin.register(Article)
class ArticleAdmin(EditableCapabilityAdmin):
    capability = "content"
    serializer_class = ArticleSerializer
    list_display = ["title", "category", "status", "published_at"]
    list_filter = ["status", "category"]
    search_fields = ["title", "summary"]
    prepopulated_fields = {"slug": ("title",)}
