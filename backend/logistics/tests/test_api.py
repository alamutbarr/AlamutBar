import tempfile, shutil
from datetime import timedelta
from django.test import TestCase, override_settings
from django.core.cache import cache
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from logistics.models import *


@override_settings(ROOT_URLCONF="config.urls")
class FreightTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.users = {}
        for i, role in enumerate(["owner", "driver", "operator", "inspector"]):
            cls.users[role] = User.objects.create_user(
                username=role,
                password="StrongTest!2026",
                role=role,
                phone=f"0912000000{i}",
                first_name=role,
                verified=True,
            )
        cls.other = User.objects.create_user(
            username="other", role="owner", phone="09120000009"
        )
        DriverProfile.objects.create(
            user=cls.users["driver"],
            status="approved",
            license_expiry=timezone.localdate() + timedelta(days=365),
            insurance_expiry=timezone.localdate() + timedelta(days=365),
        )
        Vehicle.objects.create(
            driver=cls.users["driver"],
            kind="trailer",
            plate="test-plate",
            capacity=24,
            license_number="test-license",
        )

    def setUp(self):
        cache.clear()
        self.client = APIClient()
        self.as_role("owner")

    def as_role(self, role):
        self.client.force_authenticate(self.users[role])

    def payload(self, **kwargs):
        return {
            "title": "Test cargo",
            "origin": "تهران",
            "destination": "مشهد",
            "origin_address": "Warehouse A",
            "destination_address": "Warehouse B",
            "recipient_name": "Test recipient",
            "recipient_phone": "09120000008",
            "weight": "10.00",
            "vehicle_type": "trailer",
            "price": 10000000,
            "cargo_value": 100000000,
            "pickup_date": str(timezone.localdate() + timedelta(days=2)),
            **kwargs,
        }

    def shipment(self, **kwargs):
        return Shipment.objects.create(
            owner=self.users["owner"], **self.payload(**kwargs)
        )

    def post(self, path, data):
        return self.client.post("/api/" + path, data, format="json")

    def test_create_persists_event_notification_audit(self):
        r = self.post("shipments/", self.payload())
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(r.data["status"], "pending")
        s = Shipment.objects.get(pk=r.data["id"])
        self.assertEqual(s.owner, self.users["owner"])
        self.assertEqual(s.events.count(), 1)
        self.assertTrue(Notification.objects.filter(shipment=s, user=s.owner).exists())
        self.assertTrue(AuditLog.objects.filter(action="shipment.pending").exists())

    def test_owner_cannot_impersonate_or_set_status(self):
        r = self.post(
            "shipments/",
            self.payload(
                owner=self.other.pk, status="completed", driver=self.users["driver"].pk
            ),
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["owner"], self.users["owner"].pk)
        self.assertEqual(r.data["status"], "pending")
        self.assertIsNone(r.data["driver"])

    def test_driver_cannot_create(self):
        self.as_role("driver")
        self.assertEqual(self.post("shipments/", self.payload()).status_code, 403)

    def test_inspector_cannot_create(self):
        self.as_role("inspector")
        self.assertEqual(self.post("shipments/", self.payload()).status_code, 403)

    def test_invalid_amount_and_weight(self):
        for data in [
            self.payload(price=0),
            self.payload(weight=0),
            self.payload(price=-1),
            self.payload(cargo_value=-1),
        ]:
            self.assertEqual(self.post("shipments/", data).status_code, 400)

    def test_past_pickup_rejected(self):
        self.assertEqual(
            self.post(
                "shipments/",
                self.payload(pickup_date=str(timezone.localdate() - timedelta(days=1))),
            ).status_code,
            400,
        )

    def test_same_cities_rejected(self):
        self.assertEqual(
            self.post("shipments/", self.payload(destination="تهران")).status_code, 400
        )

    def test_bad_recipient_phone(self):
        self.assertEqual(
            self.post("shipments/", self.payload(recipient_phone="123")).status_code,
            400,
        )

    def test_owner_cannot_see_other_owner(self):
        s = self.shipment()
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/shipments/{s.pk}/").status_code, 404)
        self.assertEqual(self.client.get("/api/shipments/").data["count"], 0)

    def test_inspector_only_assigned(self):
        s = self.shipment()
        self.as_role("inspector")
        self.assertEqual(self.client.get(f"/api/shipments/{s.pk}/").status_code, 404)

    def test_driver_market_redacts_contacts_and_documents(self):
        s = self.shipment(status="approved")
        self.as_role("driver")
        r = self.client.get(f"/api/shipments/{s.pk}/")
        self.assertEqual(r.status_code, 200)
        for key in [
            "origin_address",
            "destination_address",
            "recipient_phone",
            "recipient_name",
            "documents",
            "notes",
        ]:
            self.assertNotIn(key, r.data)

    def test_driver_cannot_see_pending(self):
        s = self.shipment()
        self.as_role("driver")
        self.assertEqual(self.client.get(f"/api/shipments/{s.pk}/").status_code, 404)

    def test_expired_driver_keeps_assigned_trip_but_loses_market(self):
        driver = self.users["driver"]
        market = self.shipment(status="approved")
        assigned = self.shipment(status="assigned", driver=driver)
        DriverProfile.objects.filter(user=driver).update(
            license_expiry=timezone.localdate()
        )
        driver.refresh_from_db()
        self.as_role("driver")
        self.assertFalse(self.client.get("/api/auth/me/").data["driver_market_enabled"])
        self.assertEqual(self.client.get(f"/api/shipments/{market.pk}/").status_code, 404)
        self.assertEqual(self.client.get(f"/api/shipments/{assigned.pk}/").status_code, 200)

    def test_edit_only_pending(self):
        s = self.shipment()
        url = f"/api/shipments/{s.pk}/"
        r = self.client.patch(url, {"title": "Updated"}, format="json")
        self.assertEqual(r.status_code, 200)
        s.status = "approved"
        s.save()
        self.assertEqual(
            self.client.patch(url, {"title": "No"}, format="json").status_code, 403
        )

    def test_no_delete_endpoint(self):
        self.assertEqual(
            self.client.delete(f"/api/shipments/{self.shipment().pk}/").status_code, 405
        )

    def test_owner_cannot_approve(self):
        s = self.shipment()
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "approved"}
            ).status_code,
            403,
        )

    def test_skipping_stages_rejected(self):
        s = self.shipment()
        self.as_role("operator")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "delivered"}
            ).status_code,
            400,
        )

    def assign(self, s):
        self.as_role("operator")
        return self.post(
            f"shipments/{s.pk}/assign/",
            {
                "driver": self.users["driver"].pk,
                "inspector": self.users["inspector"].pk,
            },
        )

    def test_assign_requires_approval(self):
        self.assertEqual(self.assign(self.shipment()).status_code, 400)

    def test_assign_requires_verified_driver(self):
        self.users["driver"].verified = False
        self.users["driver"].save()
        self.assertEqual(self.assign(self.shipment(status="approved")).status_code, 400)

    def test_assign_rejects_capacity(self):
        self.assertEqual(
            self.assign(self.shipment(status="approved", weight=30)).status_code, 400
        )

    def test_assign_rejects_kind(self):
        self.assertEqual(
            self.assign(
                self.shipment(status="approved", vehicle_type="truck")
            ).status_code,
            400,
        )

    def test_assign_rejects_unavailable(self):
        Vehicle.objects.filter(driver=self.users["driver"]).update(available=False)
        self.assertEqual(self.assign(self.shipment(status="approved")).status_code, 400)

    def test_double_booking_rejected(self):
        self.assertEqual(self.assign(self.shipment(status="approved")).status_code, 200)
        self.assertEqual(self.assign(self.shipment(status="approved")).status_code, 400)

    def test_owner_cannot_assign(self):
        s = self.shipment(status="approved")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/assign/",
                {
                    "driver": self.users["driver"].pk,
                    "inspector": self.users["inspector"].pk,
                },
            ).status_code,
            403,
        )

    def test_offer_unique_and_private(self):
        s = self.shipment(status="approved")
        self.as_role("driver")
        url = f"shipments/{s.pk}/offer/"
        self.assertEqual(self.post(url, {"amount": 9000000}).status_code, 201)
        self.assertEqual(self.post(url, {"amount": 9000000}).status_code, 400)
        self.assertEqual(self.assign(s).status_code, 200)
        s.refresh_from_db()
        self.assertEqual(s.price, 9000000)

    def test_unverified_driver_cannot_offer(self):
        self.users["driver"].verified = False
        self.users["driver"].save()
        self.as_role("driver")
        s = self.shipment(status="approved")
        self.assertEqual(
            self.post(f"shipments/{s.pk}/offer/", {"amount": 5000}).status_code, 403
        )

    def test_driver_cannot_cancel_market_cargo(self):
        s = self.shipment(status="approved")
        self.as_role("driver")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "cancelled", "note": "no"}
            ).status_code,
            403,
        )

    def test_cancellation_requires_reason(self):
        s = self.shipment()
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "cancelled"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/",
                {"status": "cancelled", "note": "Changed plan"},
            ).status_code,
            200,
        )

    def test_owner_cannot_cancel_in_transit(self):
        s = self.shipment(status="in_transit")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "cancelled", "note": "no"}
            ).status_code,
            400,
        )

    def inspection(self, s, stage="loading", passed=True):
        self.as_role("inspector")
        return self.post(
            f"shipments/{s.pk}/inspect/",
            {
                "stage": stage,
                "packaging_ok": passed,
                "weight_ok": True,
                "vehicle_ok": True,
                "seal_number": "SEAL-001",
            },
        )

    def test_full_freight_flow_and_settlement(self):
        s = self.shipment()
        self.as_role("operator")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "approved"}
            ).status_code,
            200,
        )
        self.assertEqual(self.assign(s).status_code, 200)
        self.as_role("driver")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "loading"}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "in_transit"}
            ).status_code,
            400,
        )
        self.assertEqual(self.inspection(s).status_code, 201)
        self.as_role("driver")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "in_transit"}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "delivered"}
            ).status_code,
            200,
        )
        self.as_role("owner")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "completed"}
            ).status_code,
            400,
        )
        self.assertEqual(self.inspection(s, "delivery").status_code, 201)
        self.as_role("owner")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "completed"}
            ).status_code,
            200,
        )
        invoice = Invoice.objects.get(shipment=s)
        self.assertEqual(invoice.amount, s.price)
        self.assertEqual(
            self.post(
                f"invoices/{invoice.pk}/settle/", {"reference": "BANK-001"}
            ).status_code,
            403,
        )
        self.as_role("operator")
        self.assertEqual(
            self.post(f"invoices/{invoice.pk}/settle/", {"reference": "a"}).status_code,
            400,
        )
        self.assertEqual(
            self.post(
                f"invoices/{invoice.pk}/settle/", {"reference": "BANK-001"}
            ).status_code,
            200,
        )
        self.assertEqual(
            self.post(
                f"invoices/{invoice.pk}/settle/", {"reference": "BANK-001"}
            ).status_code,
            400,
        )
        self.assertEqual(Invoice.objects.filter(shipment=s).count(), 1)

    def test_latest_failed_inspection_blocks_movement(self):
        s = self.shipment(
            status="loading",
            driver=self.users["driver"],
            inspector=self.users["inspector"],
        )
        self.inspection(s)
        self.inspection(s, passed=False)
        self.as_role("driver")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "in_transit"}
            ).status_code,
            400,
        )

    def test_inspection_cannot_fake_passed(self):
        s = self.shipment(status="loading", inspector=self.users["inspector"])
        r = self.inspection(s, passed=False)
        self.assertFalse(r.data["passed"])

    def test_inspection_wrong_phase_rejected(self):
        s = self.shipment(status="assigned", inspector=self.users["inspector"])
        self.assertEqual(self.inspection(s).status_code, 400)

    def test_inspection_only_inspector(self):
        s = self.shipment(status="loading", inspector=self.users["inspector"])
        self.as_role("operator")
        self.assertEqual(self.post(f"shipments/{s.pk}/inspect/", {}).status_code, 403)

    @override_settings(MEDIA_ROOT=tempfile.gettempdir() + "/alamut-tests-media")
    def test_upload_download_is_private(self):
        s = self.shipment()
        file = SimpleUploadedFile(
            "receipt.pdf",
            b"%PDF-1.4\nminimal test document",
            content_type="application/pdf",
        )
        r = self.client.post(
            f"/api/shipments/{s.pk}/documents/", {"file": file}, format="multipart"
        )
        self.assertEqual(r.status_code, 201, r.data)
        url = r.data["url"]
        self.assertEqual(self.client.get(url).status_code, 200)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url).status_code, 404)
        shutil.rmtree(tempfile.gettempdir() + "/alamut-tests-media", ignore_errors=True)

    def test_file_signature_and_extension_checked(self):
        s = self.shipment()
        for name, body in [
            ("evil.pdf", b"<script>bad</script>"),
            ("evil.html", b"%PDF-1.4"),
            ("evil.png", b"not png"),
        ]:
            r = self.client.post(
                f"/api/shipments/{s.pk}/documents/",
                {"file": SimpleUploadedFile(name, body)},
                format="multipart",
            )
            self.assertEqual(r.status_code, 400)

    def test_market_driver_cannot_upload(self):
        s = self.shipment(status="approved")
        self.as_role("driver")
        self.assertEqual(
            self.client.post(
                f"/api/shipments/{s.pk}/documents/",
                {"file": SimpleUploadedFile("x.pdf", b"%PDF-1.4")},
                format="multipart",
            ).status_code,
            403,
        )

    def test_ticket_scope_reply_and_close(self):
        r = self.post(
            "tickets/",
            {"subject": "Help", "body": "Need assistance", "priority": "urgent"},
        )
        self.assertEqual(r.status_code, 201)
        pk = r.data["id"]
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(f"/api/tickets/{pk}/").status_code, 404)
        self.as_role("operator")
        self.assertEqual(
            self.post(f"tickets/{pk}/reply/", {"body": "We are here"}).status_code, 200
        )
        self.as_role("owner")
        self.assertEqual(self.post(f"tickets/{pk}/close/", {}).status_code, 200)
        self.assertEqual(
            self.post(f"tickets/{pk}/reply/", {"body": "closed"}).status_code, 400
        )

    def test_notifications_scoped_and_read(self):
        Notification.objects.create(user=self.other, title="Private")
        Notification.objects.create(user=self.users["owner"], title="Mine")
        self.assertEqual(self.client.get("/api/notifications/").data["count"], 1)
        self.post("notifications/read_all/", {})
        self.assertTrue(Notification.objects.get(title="Mine").read)
        self.assertFalse(Notification.objects.get(title="Private").read)

    def test_team_and_operations_operator_only(self):
        for path in ["team/", "operations/"]:
            self.assertEqual(self.client.get("/api/" + path).status_code, 403)
        self.as_role("operator")
        self.assertEqual(self.client.get("/api/team/").status_code, 200)

    def test_verify_cannot_change_role(self):
        self.as_role("operator")
        r = self.post(
            f"team/{self.users['driver'].pk}/verify/",
            {"verified": False, "role": "operator"},
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["role"], "driver")

    def test_profile_role_is_readonly(self):
        r = self.client.patch(
            "/api/auth/me/",
            {"role": "operator", "verified": True, "first_name": "Updated"},
            format="json",
        )
        self.assertEqual(r.data["role"], "owner")
        self.assertEqual(r.data["first_name"], "Updated")

    def test_password_requires_current(self):
        self.assertEqual(
            self.post(
                "auth/password/",
                {"old_password": "bad", "new_password": "StrongNew!2026"},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.post(
                "auth/password/",
                {"old_password": "StrongTest!2026", "new_password": "123"},
            ).status_code,
            400,
        )

    def test_dashboard_is_scoped(self):
        self.shipment()
        Shipment.objects.create(owner=self.other, **self.payload())
        self.assertEqual(self.client.get("/api/dashboard/").data["total"], 1)

    def test_tracking_does_not_disclose_contacts(self):
        s = self.shipment()
        self.client.force_authenticate(None)
        r = self.client.get("/api/tracking/", {"code": s.code})
        self.assertEqual(r.status_code, 200)
        self.assertEqual(
            set(r.data), {"code", "origin", "destination", "status", "updated_at"}
        )

    def test_export_scope_and_formula_injection(self):
        self.shipment(title="=IMPORTXML(1)")
        Shipment.objects.create(owner=self.other, **self.payload(title="Secret cargo"))
        r = self.client.get("/api/shipments/export/")
        text = r.content.decode("utf-8-sig")
        self.assertIn("'=IMPORTXML", text)
        self.assertNotIn("Secret cargo", text)

    def test_search_and_filter(self):
        self.shipment(status="approved")
        self.shipment(status="pending", title="Another")
        self.assertEqual(
            self.client.get("/api/shipments/?status=approved").data["count"], 1
        )
        self.assertEqual(self.client.get("/api/shipments/?q=Another").data["count"], 1)

    def test_public_contact_validation(self):
        self.client.force_authenticate(None)
        self.assertEqual(
            self.post(
                "contact/", {"name": "Test", "phone": "bad", "message": "Hello"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.post(
                "contact/", {"name": "Test", "phone": "09120000008", "message": "Hello"}
            ).status_code,
            201,
        )

    def test_no_anonymous_operations(self):
        self.client.force_authenticate(None)
        for path in [
            "shipments/",
            "dashboard/",
            "invoices/",
            "tickets/",
            "notifications/",
            "team/",
            "operations/",
        ]:
            self.assertIn(self.client.get("/api/" + path).status_code, [401, 403])


@override_settings(DEMO_ENABLED=False)
class AuthTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="test-owner",
            password="StrongTest!2026",
            role="owner",
            phone="09120000000",
        )
        self.client = APIClient(enforce_csrf_checks=True)

    def login(self, **kwargs):
        token = self.client.get("/api/auth/csrf/").data["csrfToken"]
        return self.client.post(
            "/api/auth/login/",
            {"username": "test-owner", "password": "StrongTest!2026", **kwargs},
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )

    def test_login_requires_csrf_even_anonymous(self):
        self.assertEqual(
            self.client.post(
                "/api/auth/login/",
                {"username": "test-owner", "password": "StrongTest!2026"},
            ).status_code,
            403,
        )

    def test_session_login_and_logout(self):
        self.assertEqual(self.login().status_code, 200)
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 200)
        token = self.client.get("/api/auth/csrf/").data["csrfToken"]
        self.assertEqual(
            self.client.post(
                "/api/auth/logout/", {}, HTTP_X_CSRFTOKEN=token
            ).status_code,
            200,
        )
        self.assertEqual(self.client.get("/api/auth/me/").status_code, 403)

    def test_role_mismatch(self):
        self.assertEqual(self.login(role="operator").status_code, 403)

    def test_invalid_password(self):
        self.assertEqual(self.login(password="bad").status_code, 400)

    def test_public_registration_cannot_escalate(self):
        token = self.client.get("/api/auth/csrf/").data["csrfToken"]
        r = self.client.post(
            "/api/auth/register/",
            {
                "username": "new",
                "phone": "09120000001",
                "password": "StrongRegister!2026",
                "role": "operator",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(r.status_code, 400)

    def test_register_owner_works_unverified(self):
        token = self.client.get("/api/auth/csrf/").data["csrfToken"]
        r = self.client.post(
            "/api/auth/register/",
            {
                "username": "new",
                "phone": "09120000001",
                "password": "StrongRegister!2026",
                "role": "owner",
            },
            format="json",
            HTTP_X_CSRFTOKEN=token,
        )
        self.assertEqual(r.status_code, 201)
        self.assertFalse(r.data["verified"])

    def test_disabled_demo(self):
        self.assertFalse(self.client.get("/api/auth/csrf/").data["demo_enabled"])

    def test_mutation_requires_csrf_after_login(self):
        self.login()
        self.assertEqual(
            self.client.patch(
                "/api/auth/me/", {"first_name": "No"}, format="json"
            ).status_code,
            403,
        )

    def test_login_throttle(self):
        for _ in range(10):
            self.login(password="bad")
        self.assertEqual(self.login(password="bad").status_code, 429)
