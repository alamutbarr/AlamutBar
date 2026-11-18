from django.contrib import admin
from django.urls import path, include
from rest_framework.routers import DefaultRouter
from drf_spectacular.views import SpectacularAPIView, SpectacularSwaggerView
from logistics import views as v
from logistics import operations as o
from logistics import security as s
from logistics import editorial as e

router = DefaultRouter()
router.register("articles", e.PublicArticleViewSet, basename="articles")
router.register("editorial/articles", e.EditorialViewSet, basename="editorial")
router.register("shipments", v.ShipmentViewSet, basename="shipments")
router.register("invoices", v.InvoiceViewSet, basename="invoices")
router.register("tickets", v.TicketViewSet, basename="tickets")
router.register("complaints", v.ComplaintViewSet, basename="complaints")
router.register("notifications", v.NotificationViewSet, basename="notifications")
router.register("crm/leads", o.LeadViewSet, basename="leads")
router.register("crm/followups", o.FollowUpViewSet, basename="followups")
router.register("incidents", o.IncidentViewSet, basename="incidents")
router.register("addresses", o.AddressViewSet, basename="addresses")
router.register("owner-identity", v.OwnerIdentityViewSet, basename="owner-identity")
urlpatterns = [
    path("api/security/status/", s.security_status),
    path("api/security/mfa/setup/", s.mfa_setup),
    path("api/security/mfa/enable/", s.mfa_enable),
    path("api/security/mfa/disable/", s.mfa_disable),
    path("api/auth/recovery/", s.RecoveryStart.as_view()),
    path("api/auth/recovery/confirm/", s.RecoveryConfirm.as_view()),
    path("api/onboarding/", o.onboarding),
    path("api/onboarding/submit/", o.onboarding_submit),
    path("api/onboarding/documents/", o.credential_upload),
    path("api/drivers/<int:driver_id>/profile/", o.onboarding),
    path("api/drivers/<int:driver_id>/review/", o.review_driver),
    path("api/credentials/<int:pk>/download/", o.credential_download, name="credential-download"),
    path("api/control-room/", o.control_room),
    path("api/crm/staff/", o.crm_staff),
    path("api/invoices/<int:pk>/payments/", o.record_payment),
    path("django-admin/", admin.site.urls),
    path("api/", include(router.urls)),
    path("api/auth/csrf/", v.csrf),
    path("api/auth/login/", v.LoginView.as_view()),
    path("api/auth/otp/", v.otp_start),
    path("api/auth/otp/confirm/", v.otp_confirm),
    path("api/auth/avatar/", v.avatar),
    path("api/auth/register/", v.RegisterView.as_view()),
    path("api/auth/logout/", v.signout),
    path("api/auth/me/", v.me),
    path("api/auth/password/", v.password),
    path("api/health/", v.health),
    path("api/dashboard/", v.dashboard),
    path("api/vehicle/", v.vehicle),
    path("api/team/", v.team),
    path("api/team/<int:pk>/verify/", v.verify_user),
    path("api/documents/<int:pk>/download/", v.download, name="shipment-document-download"),
    path(
        "api/complaint-photos/<int:pk>/download/",
        v.complaint_photo,
        name="complaint-photo-download",
    ),
    path("api/owner-kyc/<int:pk>/download/", v.owner_kyc_download, name="owner-kyc-download"),
    path("api/tracking/", v.track),
    path("api/contact/", v.ContactView.as_view()),
    path("api/operations/", v.operations),
    path("api/schema/", SpectacularAPIView.as_view()),
    path(
        "api/docs/", SpectacularSwaggerView.as_view(url_name="schema"), name="api-docs"
    ),
]
urlpatterns[-2] = path("api/schema/", SpectacularAPIView.as_view(), name="schema")
