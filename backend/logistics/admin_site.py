import json
from urllib.parse import urlencode

from django import forms
from django.contrib import admin, messages
from django.contrib.admin.forms import AdminAuthenticationForm
from django.core.exceptions import PermissionDenied
from django.db.models import Prefetch
from django.http import Http404, JsonResponse
from django.shortcuts import get_object_or_404, redirect
from django.template.response import TemplateResponse
from django.urls import path, resolve, reverse
from rest_framework.exceptions import APIException
from rest_framework.test import APIRequestFactory, force_authenticate

from .models import (
    AccountSecurity,
    DriverProfile,
    Incident,
    Invoice,
    Lead,
    Offer,
    Shipment,
    Ticket,
    User,
)
from .services import TRANSITIONS


OPERATION_MODELS = {
    "shipment": (Shipment, "dispatch"),
    "incident": (Incident, "dispatch"),
    "invoice": (Invoice, "finance"),
    "lead": (Lead, "crm"),
    "ticket": (Ticket, None),
}
OPERATION_ACTIONS = {
    "shipment": {"transition", "assign"},
    "incident": {"resolve"},
    "invoice": {"payment"},
    "lead": {"activity"},
    "ticket": {"reply", "close"},
}


def operation_url(model_name, pk):
    return reverse("admin:alamut_operations") + "?" + urlencode({
        "section": model_name, "record": pk,
    })


def operations_for(queryset, selected, limit=50):
    return queryset.filter(pk=selected.pk) if selected is not None else queryset[:limit]


class OperatorLoginForm(AdminAuthenticationForm):
    code = forms.CharField(label="کد ورود دومرحله‌ای", required=False, max_length=6)

    def confirm_login_allowed(self, user):
        super().confirm_login_allowed(user)
        if user.role != "operator" and not user.is_superuser:
            raise forms.ValidationError("حساب مدیریت وارد کنید.")
        from .security import verify_login

        try:
            verify_login(user, self.cleaned_data.get("code", ""))
        except APIException as error:
            raise forms.ValidationError(str(error.detail)) from error


def call_api(user, api_path, data=None, method="post"):
    """Call the same role and capability checked action after the outer CSRF check."""
    request = getattr(APIRequestFactory(), method)(api_path, data, format="json")
    force_authenticate(request, user=user)
    match = resolve(api_path)
    return match.func(request, *match.args, **match.kwargs)


def review_payload(form):
    return {
        "status": form.get("status", ""),
        "note": form.get("note", ""),
        **({"submission": form["submission"]} if "submission" in form else {}),
        "documents": [
            {"id": doc_id, "status": value, "note": form.get(f"reason_{doc_id}", "")}
            for key, value in form.items()
            if key.startswith("document_") and value != "pending"
            for doc_id in [key.removeprefix("document_")]
        ],
    }


class AlamutAdminSite(admin.AdminSite):
    site_header = "مدیریت الموت"
    index_title = "پیشخوان مدیریت"
    login_form = OperatorLoginForm
    index_template = "admin/alamut_index.html"

    def get_urls(self):
        return [
            path(
                "operations/",
                self.admin_view(self.operations),
                name="alamut_operations",
            ),
            path("security/", self.admin_view(self.security), name="alamut_security"),
            path("driver-map/", self.admin_view(self.driver_map), name="alamut_driver_map"),
            path("driver-map/positions/", self.admin_view(self.driver_map_positions), name="alamut_driver_map_positions"),
        ] + super().get_urls()

    def driver_map(self, request):
        self.require_monitoring(request)
        from .operations import active_driver_positions

        return TemplateResponse(request, "admin/alamut_driver_map.html", {
            **self.each_context(request),
            "title": "نقشهٔ رانندگان در مسیر",
            "map_points": active_driver_positions(),
        })

    def driver_map_positions(self, request):
        self.require_monitoring(request)
        from .operations import active_driver_positions

        return JsonResponse({"positions": active_driver_positions()})

    @staticmethod
    def require_monitoring(request):
        user = request.user
        if not (user.is_superuser or user.role == "operator" and "monitoring" in user.capabilities):
            raise PermissionDenied

    def security(self, request):
        setup = None
        if request.method == "POST":
            action = request.POST.get("action")
            if action not in {"setup", "enable", "disable"}:
                raise PermissionDenied()
            result = call_api(
                request.user,
                f"/api/security/mfa/{action}/",
                {
                    key: request.POST[key]
                    for key in ("password", "code")
                    if key in request.POST
                },
            )
            if result.status_code >= 400:
                messages.error(request, json.dumps(result.data, ensure_ascii=False))
            elif action == "setup":
                setup = result.data
            else:
                messages.success(request, result.data["detail"])
                return redirect("admin:alamut_security")
        security = AccountSecurity.objects.filter(user=request.user).first()
        return TemplateResponse(
            request,
            "admin/alamut_security.html",
            {
                **self.each_context(request),
                "title": "امنیت حساب مدیریت",
                "setup": setup,
                "enabled": bool(security and security.enabled),
                "pending": bool(security and security.pending_secret),
            },
        )

    def operations(self, request):
        if request.user.role != "operator":
            raise PermissionDenied("برای عملیات حمل، حساب اپراتور انتخاب کنید.")
        caps = request.user.capabilities
        section = request.GET.get("section")
        selected = None
        return_to = reverse("admin:alamut_operations")
        if section is not None:
            if section not in OPERATION_MODELS:
                raise Http404
            model, capability = OPERATION_MODELS[section]
            if capability and capability not in caps:
                raise PermissionDenied
            try:
                record_id = forms.IntegerField(min_value=1, max_value=2**63 - 1).clean(request.GET.get("record"))
            except forms.ValidationError as error:
                raise Http404 from error
            selected = get_object_or_404(model, pk=record_id)
            return_to = operation_url(section, selected.pk)
        if request.method == "POST":
            try:
                identifier = forms.IntegerField(min_value=1).clean(
                    request.POST.get("record")
                )
                action = request.POST.get("action")
                payload = {
                    key: value
                    for key, value in request.POST.items()
                    if key not in {"record", "action", "csrfmiddlewaretoken"}
                }
                endpoints = {
                    "transition": f"/api/shipments/{identifier}/transition/",
                    "assign": f"/api/shipments/{identifier}/assign/",
                    "payment": f"/api/invoices/{identifier}/payments/",
                    "reply": f"/api/tickets/{identifier}/reply/",
                    "close": f"/api/tickets/{identifier}/close/",
                    "activity": f"/api/crm/leads/{identifier}/activity/",
                    "review": f"/api/drivers/{identifier}/review/",
                    "resolve": f"/api/incidents/{identifier}/resolve/",
                }
                if action not in endpoints:
                    raise forms.ValidationError("عملیات معتبر انتخاب کنید.")
                if selected and (selected.pk != identifier or action not in OPERATION_ACTIONS[section]):
                    raise forms.ValidationError("عملیات با رکورد انتخاب‌شده مطابقت ندارد.")
                if action == "review":
                    payload = review_payload(request.POST)
                result = call_api(request.user, endpoints[action], payload)
                if result.status_code < 400:
                    messages.success(request, "عملیات ثبت شد.")
                else:
                    messages.error(request, json.dumps(result.data, ensure_ascii=False))
            except forms.ValidationError as error:
                messages.error(request, " · ".join(error.messages))
            return redirect(return_to)

        from .operations import profile_data

        review = None
        if not selected and request.GET.get("driver") and "verification" in caps:
            try:
                driver_id = forms.IntegerField(min_value=1).clean(request.GET["driver"])
            except forms.ValidationError:
                driver_id = None
                messages.error(request, "شناسهٔ راننده معتبر نیست.")
            driver = User.objects.filter(pk=driver_id, role="driver").first()
            if driver:
                review = profile_data(driver)
                submitted_at = driver.driver_profile.submitted_at
                review["submission"] = submitted_at.isoformat() if submitted_at else ""
                labels = {
                    "national_id": "کد ملی",
                    "birth_date": "تاریخ تولد",
                    "license_expiry": "اعتبار گواهینامه",
                    "insurance_expiry": "اعتبار بیمه",
                    "emergency_name": "نام تماس اضطراری",
                    "emergency_phone": "تلفن اضطراری",
                    "address": "نشانی",
                }
                review["fields"] = [
                    (label, review["profile"].get(key)) for key, label in labels.items()
                ]
        monitoring = (
            call_api(request.user, "/api/control-room/", method="get").data
            if not selected and "monitoring" in caps
            else None
        )
        shipments = []
        if "dispatch" in caps and section in (None, "shipment"):
            shipments = list(operations_for(
                Shipment.objects.select_related("driver", "inspector")
                .prefetch_related(
                    Prefetch(
                        "offers",
                        queryset=Offer.objects.select_related("driver").order_by(
                            "amount", "pk"
                        ),
                    )
                )
                .order_by("-id"), selected,
            ))
            status_labels = dict(Shipment.Status.choices)
            for shipment in shipments:
                shipment.operation_statuses = [
                    (target, status_labels[target])
                    for target, (source, roles) in TRANSITIONS.items()
                    if source == shipment.status and "operator" in roles
                ]
                if shipment.status in ("pending", "approved", "assigned"):
                    shipment.operation_statuses.append(("cancelled", status_labels["cancelled"]))
        context = {
            **self.each_context(request),
            "title": f"عملیات {selected._meta.verbose_name} · {selected}" if selected else "عملیات و پیگیری حمل",
            "caps": caps,
            "section": section,
            "selected": selected,
            "shipments": shipments,
            "drivers": User.objects.filter(role="driver", verified=True)
            if shipments
            else [],
            "inspectors": User.objects.filter(role="inspector", is_active=True)
            if shipments
            else [],
            "queue": DriverProfile.objects.select_related("user").filter(
                status="submitted"
            )
            if not selected and "verification" in caps
            else [],
            "invoices": operations_for(Invoice.objects.select_related("shipment").order_by("-id"), selected)
            if "finance" in caps and section in (None, "invoice")
            else [],
            "leads": operations_for(Lead.objects.order_by("-id"), selected)
            if "crm" in caps and section in (None, "lead") else [],
            "tickets": operations_for(Ticket.objects.prefetch_related("messages__author").order_by("-id"), selected)
            if section in (None, "ticket") else [],
            "review": review,
            "monitoring": monitoring,
            "incidents": operations_for(
                Incident.objects.select_related("shipment") if selected
                else Incident.objects.select_related("shipment").exclude(status="resolved"),
                selected,
            )
            if "dispatch" in caps and section in (None, "incident")
            else [],
        }
        return TemplateResponse(request, "admin/alamut_operations.html", context)
