from datetime import timedelta
from unittest.mock import patch
import pyotp
from django.test import TestCase, Client, override_settings
from django.core.cache import cache
from django.urls import reverse
from django.utils import timezone
from logistics.models import User, Shipment, AuditLog, Article, Lead, AccountSecurity
from logistics.security import decrypt


ORIGINS = {role: f"https://{role}.example.test" for role in ("owner", "driver", "inspector")}
ORIGINS["operator"] = "https://admin.example.test"


@override_settings(MULTI_APP=True, SITE_PUBLIC_URL="https://www.example.test", ROLE_ORIGINS=ORIGINS,
                   ALLOWED_HOSTS=[".example.test", "testserver"], SECURE_SSL_REDIRECT=False)
class HostIsolationTests(TestCase):
    def setUp(self):
        cache.clear()
        self.owner = User.objects.create_user(username="owner", password="StrongTest!2026", role="owner", phone="09120008761")
        self.driver = User.objects.create_user(username="driver", password="StrongTest!2026", role="driver", phone="09120008762")

    def test_public_host_only_exposes_public_api(self):
        for path in ["/api/auth/me/", "/api/shipments/", "/api/editorial/articles/", "/django-admin/", "/api/articles-extra/"]:
            self.assertEqual(self.client.get(path, HTTP_HOST="www.example.test").status_code, 404, path)
        self.assertEqual(self.client.get("/api/articles/", HTTP_HOST="www.example.test").status_code, 200)

    def test_unknown_host_and_admin_on_driver_host_are_rejected(self):
        self.assertEqual(self.client.get("/api/auth/csrf/", HTTP_HOST="evil.example.test").status_code, 421)
        self.assertEqual(self.client.get("/django-admin/", HTTP_HOST="driver.example.test").status_code, 404)

    def test_owner_cookie_cannot_authenticate_on_driver_host_even_if_replayed(self):
        self.client.force_login(self.owner)
        self.assertEqual(self.client.get("/api/auth/me/", HTTP_HOST="owner.example.test").status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/", HTTP_HOST="driver.example.test").status_code, 403)

    def test_sibling_origin_cannot_mutate(self):
        self.client.force_login(self.driver)
        response = self.client.post("/api/auth/logout/", HTTP_HOST="driver.example.test", HTTP_ORIGIN=ORIGINS["owner"])
        self.assertEqual(response.status_code, 403)

    def test_login_and_registration_must_match_host_role(self):
        response = self.client.post("/api/auth/login/", {"username": "owner", "password": "StrongTest!2026", "role": "owner"}, HTTP_HOST="driver.example.test")
        self.assertEqual(response.status_code, 403)
        response = self.client.post("/api/auth/register/", {"username": "new-owner", "password": "StrongTest!2026", "role": "owner", "phone": "09120008763"}, HTTP_HOST="driver.example.test")
        self.assertEqual(response.status_code, 403)
        self.assertFalse(User.objects.filter(username="new-owner").exists())


@override_settings(MULTI_APP=False, SECURE_SSL_REDIRECT=False)
class DjangoOperationsTests(TestCase):
    def setUp(self):
        self.operator = User.objects.create_user(username="staff", password="StrongTest!2026", role="operator", phone="09120008770", is_staff=True)
        self.owner = User.objects.create_user(username="owner", role="owner", phone="09120008771")
        self.shipment = Shipment.objects.create(owner=self.owner, title="Test cargo", origin="تهران", destination="قزوین", weight=5, price=10000000, cargo_value=90000000, vehicle_type="truck", pickup_date=timezone.localdate() + timedelta(days=4))
        self.client.force_login(self.operator)
        self.url = reverse("admin:alamut_operations")

    def test_console_renders_and_handles_bad_driver_id(self):
        self.assertContains(self.client.get(self.url), self.shipment.code)
        self.assertEqual(self.client.get(self.url + "?driver=bad").status_code, 200)

    def test_console_transition_uses_domain_rules_and_audit(self):
        self.client.post(self.url, {"action": "transition", "record": self.shipment.pk, "status": "completed"})
        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, "pending")
        self.client.post(self.url, {"action": "transition", "record": self.shipment.pk, "status": "approved"})
        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, "approved")
        self.assertTrue(AuditLog.objects.filter(action="shipment.approved").exists())

    def test_capability_cannot_be_bypassed_by_posting_hidden_action(self):
        self.operator.capabilities = ["content"]
        self.operator.save()
        self.client.post(self.url, {"action": "transition", "record": self.shipment.pk, "status": "approved"})
        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, "pending")
        self.assertEqual(self.client.get(f"/django-admin/logistics/shipment/{self.shipment.pk}/change/").status_code, 403)

    def test_raw_model_admin_cannot_skip_workflow(self):
        response = self.client.post(f"/django-admin/logistics/shipment/{self.shipment.pk}/change/", {"status": "completed"})
        self.assertEqual(response.status_code, 403)
        self.shipment.refresh_from_db()
        self.assertEqual(self.shipment.status, "pending")

    def test_console_requires_csrf(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.operator)
        self.assertEqual(client.post(self.url, {"action": "transition", "record": self.shipment.pk, "status": "approved"}).status_code, 403)

    def test_content_admin_validates_publish_rules(self):
        response = self.client.post("/django-admin/logistics/article/add/", {"title": "Test article", "slug": "test-article", "summary": "Test summary", "body": "short", "category": "حمل", "status": "published", "_save": "Save"})
        self.assertEqual(response.status_code, 200)
        self.assertFalse(Article.objects.filter(slug="test-article").exists())

    def test_crm_admin_creates_audited_lead(self):
        response = self.client.post("/django-admin/logistics/lead/add/", {"name": "Test lead", "phone": "09120008772", "stage": "new", "source": "manual", "_save": "Save"})
        self.assertEqual(response.status_code, 302)
        lead = Lead.objects.get(name="Test lead")
        self.assertEqual(lead.created_by, self.operator)
        self.assertTrue(AuditLog.objects.filter(action="lead.create", object_id=str(lead.pk)).exists())

    @patch("logistics.security.time.time", return_value=1_800_000_000)
    def test_admin_enrollment_protects_the_admin_login(self, mocked_time):
        path = reverse("admin:alamut_security")
        setup = self.client.post(path, {"action": "setup", "password": "StrongTest!2026"})
        self.assertEqual(setup.status_code, 200)
        self.assertIn("no-store", setup["Cache-Control"])
        account = AccountSecurity.objects.get(user=self.operator)
        codes = pyotp.TOTP(decrypt(account.pending_secret))
        result = self.client.post(path, {"action": "enable", "code": codes.at(mocked_time.return_value - 30)})
        self.assertEqual(result.status_code, 302)
        self.client.logout()
        credentials = {"username": self.operator.username, "password": "StrongTest!2026"}
        self.assertEqual(self.client.post(reverse("admin:login"), credentials).status_code, 200)
        credentials["code"] = codes.at(mocked_time.return_value)
        self.assertEqual(self.client.post(reverse("admin:login"), credentials).status_code, 302)
