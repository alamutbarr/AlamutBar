import re
from datetime import date, timedelta
from unittest.mock import patch
from io import BytesIO
from tempfile import TemporaryDirectory
from PIL import Image
from django.test import Client, TestCase, override_settings
from django.urls import reverse
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from rest_framework.test import APIClient
from logistics.models import *


class OperationsTests(TestCase):
    def test_admin_record_actions_are_available_beyond_the_recent_operations_list(self):
        self.operator.is_staff = True
        self.operator.save(update_fields=["is_staff"])
        client = Client()
        client.force_login(self.operator)
        old_shipment = self.shipment(status="pending")
        old_shipment.title = "بار قدیمی آزمایشی"
        old_shipment.save(update_fields=["title"])
        other_shipments = [self.shipment() for _ in range(51)]
        overview = reverse("admin:alamut_operations")
        self.assertNotContains(client.get(overview), old_shipment.title)
        invoice = Invoice.objects.create(shipment=old_shipment, amount=old_shipment.price)
        incident = Incident.objects.create(shipment=old_shipment, reporter=self.driver, kind="delay", description="رخداد نمونه")
        lead = Lead.objects.create(name="مشتری نمونه", phone="09120000100", created_by=self.operator)
        ticket = Ticket.objects.create(user=self.owner, subject="درخواست نمونه")
        records = {
            "shipment": (old_shipment, "transition"),
            "invoice": (invoice, "payment"),
            "incident": (incident, "resolve"),
            "lead": (lead, "activity"),
            "ticket": (ticket, "reply"),
        }
        for section, (record, action) in records.items():
            with self.subTest(section=section):
                detail = reverse(f"admin:logistics_{section}_change", args=[record.pk])
                target = f"{overview}?section={section}&record={record.pk}"
                self.assertContains(client.get(detail), target.replace("&", "&amp;"))
                page = client.get(target)
                self.assertContains(page, f'name="action" value="{action}"')
                self.assertNotContains(page, other_shipments[-1].title)
        shipment_target = f"{overview}?section=shipment&record={old_shipment.pk}"
        wrong_record = client.post(shipment_target, {
            "action": "transition", "record": other_shipments[-1].pk, "status": "approved",
        }, follow=True)
        self.assertContains(wrong_record, "عملیات با رکورد انتخاب‌شده مطابقت ندارد.")
        result = client.post(shipment_target, {
            "action": "transition", "record": old_shipment.pk, "status": "approved",
        }, follow=True)
        self.assertContains(result, "عملیات ثبت شد.")
        old_shipment.refresh_from_db()
        self.assertEqual(old_shipment.status, "approved")
        self.operator.capabilities = ["crm"]
        self.operator.save(update_fields=["capabilities"])
        self.assertEqual(client.get(shipment_target).status_code, 403)

    def test_admin_shipment_document_links_to_authenticated_download(self):
        self.operator.is_staff = True
        self.operator.save(update_fields=["is_staff"])
        client = Client()
        client.force_login(self.operator)
        document = Document.objects.create(
            shipment=self.shipment(), uploaded_by=self.owner,
            name="proof.png", file=self.image(),
        )
        detail = reverse("admin:logistics_document_change", args=[document.pk])
        download = reverse("shipment-document-download", args=[document.pk])
        self.assertContains(client.get(detail), download)
        self.assertNotContains(client.get(detail), document.file.url)
        response = client.get(download)
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        response.close()
        document.file.delete(save=False)
        self.assertEqual(client.get(download).status_code, 404)

    def driver_review_page(self, operator=None):
        self.prepare()
        reviewer = operator or self.operator
        reviewer.is_staff = True
        reviewer.save(update_fields=["is_staff"])
        client = Client(enforce_csrf_checks=True)
        client.force_login(reviewer)
        profile = self.driver.driver_profile
        url = reverse("admin:logistics_driverprofile_change", args=[profile.pk])
        return client, profile, url

    def csrf_token(self, page):
        return re.search(rb'name="csrfmiddlewaretoken" value="([^"]+)"', page.content)[1].decode()

    def test_admin_reviews_driver_and_downloads_private_documents(self):
        client, profile, url = self.driver_review_page()
        page = client.get(url)
        for text in ["مشخصات راننده", "مدارک بارگذاری‌شده", "تأیید پرونده", "رد پرونده", "alamut/admin/admin.css"]:
            self.assertContains(page, text)
        documents = list(self.driver.credentials.all())
        download = reverse("credential-download", args=[documents[0].pk])
        self.assertContains(page, download)
        self.assertNotContains(page, documents[0].file.url)
        response = client.get(download)
        self.assertEqual(response.status_code, 200)
        self.assertIn("attachment", response["Content-Disposition"])
        self.assertTrue(b"".join(response.streaming_content))
        response.close()
        index = client.get(reverse("admin:index"))
        self.assertContains(index, "پرونده‌های در انتظار بررسی")
        self.assertContains(index, "عملیات الموت")
        csrf = self.csrf_token(page)
        self.assertEqual(client.post(url, {"status": "approved"}).status_code, 403)
        fields = {"status": "approved", "submission": profile.submitted_at.isoformat(), "csrfmiddlewaretoken": csrf}
        rejected = client.post(url, {**fields, f"document_{documents[0].pk}": "approved"})
        self.assertContains(rejected, "تمام مدارک الزامی")
        documents[0].refresh_from_db()
        self.assertEqual(documents[0].status, "pending")
        profile.refresh_from_db()
        self.assertEqual(profile.status, "submitted")
        response = client.post(url, {
            **fields,
            **{f"document_{document.pk}": "approved" for document in documents},
        }, follow=True)
        self.assertContains(response, "نتیجهٔ بررسی پرونده ثبت شد")
        self.assertNotContains(response, 'id="review-status"')
        profile.refresh_from_db()
        self.driver.refresh_from_db()
        self.assertEqual(profile.status, "approved")
        self.assertEqual(profile.reviewed_by, self.operator)
        self.assertTrue(self.driver.verified)
        self.assertTrue(Notification.objects.filter(user=self.driver).exists())
        self.assertTrue(AuditLog.objects.filter(actor=self.operator, action="driver.review").exists())

    def test_admin_requires_rejection_reasons_and_superuser_can_review(self):
        reviewer = User.objects.create_superuser("admin", phone="09120000007", password="test-only-password")
        client, profile, url = self.driver_review_page(reviewer)
        page = client.get(url)
        self.assertEqual(page.status_code, 200)
        document = self.driver.credentials.first()
        payload = {
            "status": "rejected",
            "submission": profile.submitted_at.isoformat(),
            f"document_{document.pk}": "rejected",
            "csrfmiddlewaretoken": self.csrf_token(page),
        }
        self.assertContains(client.post(url, payload), "دلیل رد را کامل بنویسید")
        payload["note"] = "تصویر واضح نیست."
        self.assertContains(client.post(url, payload), "دلیل رد هر مدرک")
        payload[f"reason_{document.pk}"] = "عکس تار است."
        profile.submitted_at += timedelta(seconds=1)
        profile.save(update_fields=["submitted_at"])
        self.assertContains(client.post(url, payload), "نسخهٔ پرونده تغییر کرده است")
        profile.refresh_from_db()
        self.assertEqual(profile.status, "submitted")
        payload["submission"] = profile.submitted_at.isoformat()
        self.assertContains(client.post(url, payload, follow=True), "نیازمند اصلاح")
        profile.refresh_from_db()
        document.refresh_from_db()
        self.assertEqual(profile.status, "rejected")
        self.assertEqual(profile.reviewed_by, reviewer)
        self.assertEqual(profile.review_note, payload["note"])
        self.assertEqual(document.note, payload[f"reason_{document.pk}"])

    def test_admin_review_requires_verification_capability(self):
        self.operator.capabilities = ["dispatch"]
        self.operator.save(update_fields=["capabilities"])
        client, profile, url = self.driver_review_page()
        self.assertEqual(client.get(url).status_code, 403)
        document = self.driver.credentials.first()
        self.assertEqual(client.get(reverse("admin:logistics_drivercredential_change", args=[document.pk])).status_code, 403)
        self.assertEqual(client.get(reverse("credential-download", args=[document.pk])).status_code, 403)
        self.assertNotContains(client.get(reverse("admin:index")), "پرونده‌های در انتظار بررسی")
        profile.refresh_from_db()
        self.assertEqual(profile.status, "submitted")

    def test_admin_can_review_a_single_credential_before_finalizing_dossier(self):
        client, profile, _ = self.driver_review_page()
        document = self.driver.credentials.first()
        address = reverse("admin:logistics_drivercredential_change", args=[document.pk])
        page = client.get(address)
        self.assertContains(page, "تأیید مدرک")
        self.assertContains(page, "مشاهدهٔ پرونده و ثبت نتیجهٔ نهایی")
        form = {"csrfmiddlewaretoken": self.csrf_token(page), "submission": profile.submitted_at.isoformat()}
        self.assertContains(client.post(address, {**form, "status": "rejected"}), "دلیل رد هر مدرک الزامی است")
        result = client.post(address, {**form, "status": "rejected", "note": "تصویر واضح نیست."}, follow=True)
        self.assertContains(result, "نتیجهٔ بررسی مدرک ثبت شد")
        document.refresh_from_db()
        self.assertEqual(document.status, "rejected")
        self.assertEqual(document.note, "تصویر واضح نیست.")
        result = client.post(address, {**form, "status": "approved"}, follow=True)
        self.assertContains(result, "تأیید شده")
        document.refresh_from_db()
        self.assertEqual(document.status, "approved")
        self.assertEqual(self.driver.credentials.filter(status="approved").count(), 1)
        self.assertTrue(AuditLog.objects.filter(actor=self.operator, action="credential.review", object_id=str(document.pk)).exists())
        profile.refresh_from_db()
        self.driver.refresh_from_db()
        self.assertEqual(profile.status, "submitted")
        self.assertFalse(self.driver.verified)
        self.assertContains(client.post(address, {**form, "status": "rejected", "note": "نسخه قدیمی", "submission": "outdated"}), "نسخهٔ پرونده تغییر کرده")
        document.refresh_from_db()
        self.assertEqual(document.status, "approved")

    def test_admin_map_uses_latest_active_fix_and_keeps_history_private(self):
        self.operator.is_staff = True
        self.operator.save(update_fields=["is_staff"])
        self.client.force_login(self.operator)
        active = self.shipment(status="in_transit")
        completed = self.shipment(status="completed")
        latest = LocationPing.objects.create(shipment=active, driver=self.driver, latitude=35, longitude=51)
        historical = LocationPing.objects.create(
            shipment=active, driver=self.driver, latitude=36, longitude=50,
            observed_at=timezone.now() - timedelta(minutes=12),
        )
        LocationPing.objects.create(shipment=completed, driver=self.driver, latitude=37, longitude=52)
        map_url = reverse("admin:alamut_driver_map")
        feed = reverse("admin:alamut_driver_map_positions")
        history = reverse("admin:logistics_locationping_change", args=[historical.pk])
        self.assertContains(self.client.get(map_url), "alamut-map-data")
        result = self.client.get(feed)
        self.assertEqual([point["id"] for point in result.json()["positions"]], [latest.pk])
        self.assertIn("no-store", result["Cache-Control"])
        self.assertContains(self.client.get(history), "موقعیت ثبت‌شده روی نقشه")
        self.operator.capabilities = ["verification"]
        self.operator.save(update_fields=["capabilities"])
        for url in (map_url, feed, history):
            self.assertEqual(self.client.get(url).status_code, 403)

    def test_driver_age_uses_actual_birthday_not_365_day_years(self):
        self.client.force_authenticate(self.driver)
        with patch(
            "logistics.operations.timezone.localdate", return_value=date(2026, 11, 9)
        ):
            for birth, expected in [
                ("2008-11-10", 400),
                ("2008-11-09", 200),
                ("1926-11-09", 200),
                ("1925-11-09", 400),
            ]:
                with self.subTest(birth=birth):
                    response = self.client.patch(
                        "/api/onboarding/", {"birth_date": birth}, format="json"
                    )
                    self.assertEqual(response.status_code, expected)

    def test_duplicate_active_driver_identity_is_blocked(self):
        self.prepare()
        second = User.objects.create_user(
            username="second-driver", role="driver", phone="09120000009"
        )
        self.client.force_authenticate(second)
        self.put_profile()
        self.client.put(
            "/api/vehicle/",
            {
                "kind": "truck",
                "plate": "SECOND-TEST",
                "capacity": 10,
                "license_number": "OTHER",
                "available": True,
            },
            format="json",
        )
        for kind in ["national_card", "license", "vehicle_card", "insurance"]:
            self.client.post(
                "/api/onboarding/documents/",
                {"kind": kind, "file": self.image()},
                format="multipart",
            )
        r = self.post("onboarding/submit/", {})
        self.assertEqual(r.status_code, 400)
        self.assertIn("کد ملی", str(r.data))

    def test_late_arriving_old_fix_does_not_replace_newer_fix(self):
        s = self.shipment(status="in_transit")
        LocationPing.objects.create(
            shipment=s,
            driver=self.driver,
            latitude=36,
            longitude=50,
            observed_at=timezone.now() - timedelta(minutes=1),
        )
        LocationPing.objects.create(
            shipment=s,
            driver=self.driver,
            latitude=35,
            longitude=50,
            observed_at=timezone.now() - timedelta(hours=2),
        )
        self.client.force_authenticate(self.operator)
        r = self.client.get("/api/control-room/")
        self.assertEqual(r.data["positions"][0]["latitude"], "36.000000")
        self.assertFalse(r.data["positions"][0]["stale"])

    def test_availability_change_preserves_document_approval(self):
        self.prepare()
        self.review()
        self.client.force_authenticate(self.driver)
        r = self.client.put(
            "/api/vehicle/",
            {
                "kind": "truck",
                "plate": "TEST",
                "capacity": 10,
                "license_number": "TEST-LICENSE",
                "available": False,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.driver.refresh_from_db()
        self.assertTrue(self.driver.verified)

    def test_delayed_location_is_not_current_location(self):
        s = self.shipment(status="in_transit")
        old = timezone.now() - timedelta(hours=2)
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/location/",
                {"latitude": 36, "longitude": 50, "observed_at": old.isoformat()},
            ).status_code,
            201,
        )
        self.client.force_authenticate(self.operator)
        r = self.client.get("/api/control-room/")
        self.assertTrue(r.data["positions"][0]["stale"])

    def test_future_location_time_rejected(self):
        s = self.shipment(status="in_transit")
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/location/",
                {
                    "latitude": 36,
                    "longitude": 50,
                    "observed_at": (timezone.now() + timedelta(hours=1)).isoformat(),
                },
            ).status_code,
            400,
        )

    def test_restricted_operator_cannot_dispatch_or_read_finance(self):
        self.operator.capabilities = ["crm"]
        self.operator.save()
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get("/api/crm/leads/").status_code, 200)
        self.assertEqual(self.client.get("/api/shipments/").status_code, 403)
        self.assertEqual(self.client.get("/api/invoices/").status_code, 403)
        self.assertEqual(self.client.get("/api/control-room/").status_code, 403)
        self.assertEqual(self.client.get("/api/crm/staff/").status_code, 200)
        self.shipment(status="completed")
        self.assertEqual(self.client.get("/api/dashboard/").data["recent"], [])
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get("/api/crm/staff/").status_code, 403)

    def test_dispatch_permission_cannot_verify_accounts(self):
        self.operator.capabilities = ["dispatch"]
        self.operator.save()
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get("/api/team/").status_code, 200)
        self.assertEqual(
            self.post(f"team/{self.owner.pk}/verify/", {"verified": True}).status_code,
            403,
        )

    def test_capabilities_cannot_be_self_assigned(self):
        self.operator.capabilities = ["crm"]
        self.operator.save()
        self.client.force_authenticate(self.operator)
        r = self.client.patch(
            "/api/auth/me/", {"capabilities": ["finance"]}, format="json"
        )
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["capabilities"], ["crm"])

    def setUp(self):
        self.client = APIClient()
        self.tmp = TemporaryDirectory()
        self.addCleanup(self.tmp.cleanup)
        self.override = override_settings(MEDIA_ROOT=self.tmp.name)
        self.override.enable()
        self.addCleanup(self.override.disable)
        self.driver = User.objects.create_user(
            username="driver", role="driver", phone="09120000001"
        )
        self.operator = User.objects.create_user(
            username="operator", role="operator", phone="09120000002"
        )
        self.owner = User.objects.create_user(
            username="owner", role="owner", phone="09120000003"
        )
        self.other = User.objects.create_user(
            username="other", role="owner", phone="09120000004"
        )
        self.inspector = User.objects.create_user(
            username="inspector", role="inspector", phone="09120000005"
        )
        self.client.force_authenticate(self.driver)

    def post(self, path, data):
        return self.client.post("/api/" + path, data, format="json")

    def put_profile(self, **kwargs):
        return self.client.patch(
            "/api/onboarding/",
            {
                "national_id": "0000000019",
                "birth_date": "1990-01-01",
                "license_expiry": str(timezone.localdate() + timedelta(days=365)),
                "insurance_expiry": str(timezone.localdate() + timedelta(days=365)),
                "emergency_name": "Emergency test",
                "emergency_phone": "09120000006",
                "address": "Fictional test address",
                **kwargs,
            },
            format="json",
        )

    def image(self):
        output = BytesIO()
        Image.new("RGB", (2, 2), "white").save(output, format="PNG")
        return SimpleUploadedFile(
            "sample.png", output.getvalue(), content_type="image/png"
        )

    def prepare(self):
        self.put_profile()
        self.client.put(
            "/api/vehicle/",
            {
                "kind": "truck",
                "plate": "TEST",
                "capacity": 10,
                "license_number": "TEST-LICENSE",
                "available": True,
            },
            format="json",
        )
        for kind in ["national_card", "license", "vehicle_card", "insurance"]:
            r = self.client.post(
                "/api/onboarding/documents/",
                {"kind": kind, "file": self.image()},
                format="multipart",
            )
            self.assertEqual(r.status_code, 201, r.data)
        r = self.post("onboarding/submit/", {})
        self.assertEqual(r.status_code, 200, r.data)

    def review(self, status="approved", note=""):
        self.client.force_authenticate(self.operator)
        return self.post(
            f"drivers/{self.driver.pk}/review/",
            {
                "status": status,
                "note": note,
                "documents": [
                    {"id": d.pk, "status": "approved"}
                    for d in self.driver.credentials.all()
                ],
            },
        )

    def shipment(self, **kwargs):
        return Shipment.objects.create(
            owner=self.owner,
            driver=self.driver,
            inspector=self.inspector,
            title="Test freight",
            origin="A",
            destination="B",
            origin_address="A1",
            destination_address="B1",
            recipient_name="Recipient",
            recipient_phone="09120000006",
            weight=2,
            vehicle_type="truck",
            price=10000,
            pickup_date=timezone.localdate() + timedelta(days=2),
            **kwargs,
        )

    def test_profile_driver_only(self):
        self.assertEqual(self.client.get("/api/onboarding/").status_code, 200)
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get("/api/onboarding/").status_code, 403)

    def test_invalid_national_id(self):
        for value in ["123", "0000000000", "1234567890", "۱۲۳۴۵۶۷۸۹۱"]:
            self.assertEqual(self.put_profile(national_id=value).status_code, 400)

    def test_invalid_age_and_expired_dates(self):
        self.assertEqual(
            self.put_profile(birth_date=str(timezone.localdate())).status_code, 400
        )
        self.assertEqual(
            self.put_profile(license_expiry=str(timezone.localdate())).status_code, 400
        )

    def test_incomplete_submit_rejected(self):
        self.put_profile()
        self.assertEqual(self.post("onboarding/submit/", {}).status_code, 400)

    def test_cannot_bypass_review_by_verification_flag(self):
        self.client.force_authenticate(self.operator)
        self.assertEqual(
            self.post(f"team/{self.driver.pk}/verify/", {"verified": True}).status_code,
            400,
        )

    def test_complete_dossier_review(self):
        self.prepare()
        r = self.review()
        self.assertEqual(r.status_code, 200, r.data)
        self.driver.refresh_from_db()
        self.assertTrue(self.driver.verified)
        self.assertEqual(r.data["profile"]["status"], "approved")
        self.assertTrue(AuditLog.objects.filter(action="driver.review").exists())

    def test_approval_requires_individual_documents(self):
        self.prepare()
        self.client.force_authenticate(self.operator)
        r = self.post(f"drivers/{self.driver.pk}/review/", {"status": "approved"})
        self.assertEqual(r.status_code, 400)

    def test_rejection_requires_reason(self):
        self.prepare()
        self.assertEqual(self.review("rejected").status_code, 400)
        self.assertEqual(
            self.review(
                "rejected", "Please replace the insurance document"
            ).status_code,
            200,
        )

    def test_driver_cannot_review(self):
        self.prepare()
        self.assertEqual(
            self.post(
                f"drivers/{self.driver.pk}/review/", {"status": "approved"}
            ).status_code,
            403,
        )

    def test_update_invalidates_approval(self):
        self.prepare()
        self.review()
        self.client.force_authenticate(self.driver)
        self.put_profile(address="Updated test address")
        self.driver.refresh_from_db()
        self.assertFalse(self.driver.verified)
        self.assertEqual(self.driver.driver_profile.status, "draft")

    def test_vehicle_change_invalidates_approval(self):
        self.prepare()
        self.review()
        self.client.force_authenticate(self.driver)
        self.client.put(
            "/api/vehicle/",
            {
                "kind": "truck",
                "plate": "NEW",
                "capacity": 10,
                "license_number": "TEST",
                "available": True,
            },
            format="json",
        )
        self.driver.refresh_from_db()
        self.assertFalse(self.driver.verified)

    def test_document_change_invalidates_approval(self):
        self.prepare()
        self.review()
        self.client.force_authenticate(self.driver)
        self.client.post(
            "/api/onboarding/documents/",
            {"kind": "license", "file": self.image()},
            format="multipart",
        )
        self.driver.refresh_from_db()
        self.assertFalse(self.driver.verified)

    def test_credential_download_private(self):
        self.prepare()
        doc = self.driver.credentials.first()
        url = f"/api/credentials/{doc.pk}/download/"
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200)
        b"".join(r.streaming_content)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get(url).status_code, 403)
        self.client.force_authenticate(self.operator)
        r = self.client.get(url)
        self.assertEqual(r.status_code, 200)
        b"".join(r.streaming_content)

    def test_bad_file_rejected(self):
        for name, body in [
            ("x.png", b"not image"),
            ("x.pdf", b"%PDF-1.4 invalid"),
            ("x.html", b"html"),
        ]:
            r = self.client.post(
                "/api/onboarding/documents/",
                {"kind": "license", "file": SimpleUploadedFile(name, body)},
                format="multipart",
            )
            self.assertEqual(r.status_code, 400)

    def test_invalid_document_kind(self):
        self.assertEqual(
            self.client.post(
                "/api/onboarding/documents/",
                {"kind": "unknown", "file": self.image()},
                format="multipart",
            ).status_code,
            400,
        )

    def test_crm_operator_only(self):
        for p in ["crm/leads/", "crm/followups/", "control-room/"]:
            self.assertEqual(self.client.get("/api/" + p).status_code, 403)

    def test_contact_creates_lead_once(self):
        r = self.post(
            "contact/",
            {
                "name": "Fictional contact",
                "phone": "09120000007",
                "message": "Need freight",
            },
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(Lead.objects.count(), 1)
        self.assertEqual(Lead.objects.get().source, "website")

    def test_lead_activity_and_stage_history(self):
        self.client.force_authenticate(self.operator)
        r = self.post("crm/leads/", {"name": "Client", "phone": "09120000007"})
        self.assertEqual(r.status_code, 201)
        pk = r.data["id"]
        self.assertEqual(
            self.post(
                f"crm/leads/{pk}/activity/",
                {"kind": "call", "body": "Contacted client"},
            ).status_code,
            201,
        )
        self.assertEqual(
            self.client.patch(
                f"/api/crm/leads/{pk}/", {"stage": "qualified"}, format="json"
            ).status_code,
            200,
        )
        self.assertEqual(CRMActivity.objects.filter(lead_id=pk).count(), 2)

    def test_lead_assignment_to_customer_rejected(self):
        self.client.force_authenticate(self.operator)
        self.assertEqual(
            self.post(
                "crm/leads/",
                {
                    "name": "Client",
                    "phone": "09120000007",
                    "assigned_to": self.owner.pk,
                },
            ).status_code,
            400,
        )

    def test_followup_completion(self):
        self.client.force_authenticate(self.operator)
        r = self.post(
            "crm/followups/",
            {
                "title": "Call back",
                "assigned_to": self.operator.pk,
                "due_at": (timezone.now() + timedelta(hours=1)).isoformat(),
            },
        )
        self.assertEqual(r.status_code, 201)
        pk = r.data["id"]
        r = self.client.patch(
            f"/api/crm/followups/{pk}/", {"done": True}, format="json"
        )
        self.assertIsNotNone(r.data["completed_at"])
        r = self.client.patch(
            f"/api/crm/followups/{pk}/", {"done": False}, format="json"
        )
        self.assertIsNone(r.data["completed_at"])

    def test_address_book_isolation(self):
        self.client.force_authenticate(self.owner)
        r = self.post(
            "addresses/",
            {
                "label": "Test",
                "city": "A",
                "address": "Address",
                "recipient_name": "R",
                "phone": "09120000008",
            },
        )
        self.assertEqual(r.status_code, 201)
        self.client.force_authenticate(self.other)
        self.assertEqual(self.client.get("/api/addresses/").data["count"], 0)
        self.assertEqual(
            self.client.patch(
                f"/api/addresses/{r.data['id']}/", {"label": "hack"}, format="json"
            ).status_code,
            404,
        )

    def test_incident_scope_and_resolution(self):
        s = self.shipment(status="in_transit")
        self.client.force_authenticate(self.other)
        self.assertEqual(
            self.post(
                "incidents/",
                {"shipment": s.pk, "kind": "damage", "description": "Damaged cargo"},
            ).status_code,
            400,
        )
        self.client.force_authenticate(self.owner)
        r = self.post(
            "incidents/",
            {
                "shipment": s.pk,
                "kind": "damage",
                "description": "Damaged cargo",
                "severity": "critical",
            },
        )
        self.assertEqual(r.status_code, 201)
        pk = r.data["id"]
        self.assertEqual(
            self.post(
                f"incidents/{pk}/resolve/", {"resolution": "Resolved damage"}
            ).status_code,
            403,
        )
        self.client.force_authenticate(self.operator)
        self.assertEqual(
            self.post(
                f"incidents/{pk}/resolve/",
                {"resolution": "Restored and inspected by team"},
            ).status_code,
            200,
        )

    def test_critical_incident_blocks_movement(self):
        s = self.shipment(status="loading")
        Inspection.objects.create(
            shipment=s,
            inspector=self.inspector,
            stage="loading",
            packaging_ok=True,
            weight_ok=True,
            vehicle_ok=True,
            seal_number="TEST",
            passed=True,
        )
        Incident.objects.create(
            shipment=s,
            reporter=self.owner,
            kind="damage",
            severity="critical",
            description="Test issue",
        )
        self.client.force_authenticate(self.driver)
        self.assertEqual(
            self.post(
                f"shipments/{s.pk}/transition/", {"status": "in_transit"}
            ).status_code,
            400,
        )

    def test_partial_payment_and_overpayment(self):
        s = self.shipment(status="completed")
        i = Invoice.objects.create(shipment=s, amount=10000)
        self.client.force_authenticate(self.operator)
        self.assertEqual(
            self.post(
                f"invoices/{i.pk}/payments/",
                {"amount": 4000, "reference": "TEST-PART-1"},
            ).status_code,
            201,
        )
        self.assertEqual(
            self.post(
                f"invoices/{i.pk}/payments/",
                {"amount": 4000, "reference": "TEST-PART-1"},
            ).status_code,
            400,
        )
        self.assertEqual(
            self.post(
                f"invoices/{i.pk}/payments/",
                {"amount": 7000, "reference": "TEST-PART-2"},
            ).status_code,
            400,
        )
        d = self.client.get("/api/dashboard/").data
        self.assertEqual(d["revenue"], 4000)
        self.assertEqual(d["unpaid"], 6000)
        self.assertEqual(
            self.post(
                f"invoices/{i.pk}/payments/",
                {"amount": 6000, "reference": "TEST-PART-2"},
            ).status_code,
            201,
        )
        i.refresh_from_db()
        self.assertEqual(i.status, "paid")

    def test_owner_cannot_record_payment(self):
        i = Invoice.objects.create(
            shipment=self.shipment(status="completed"), amount=10000
        )
        self.client.force_authenticate(self.owner)
        self.assertEqual(
            self.post(
                f"invoices/{i.pk}/payments/",
                {"amount": 4000, "reference": "TEST-PART-1"},
            ).status_code,
            403,
        )

    def test_control_room_stale_and_missing(self):
        s = self.shipment(status="in_transit")
        s2 = self.shipment(status="in_transit")
        p = LocationPing.objects.create(
            shipment=s, driver=self.driver, latitude=36, longitude=50, accuracy=20
        )
        LocationPing.objects.filter(pk=p.pk).update(
            created_at=timezone.now() - timedelta(minutes=8),
            observed_at=timezone.now() - timedelta(minutes=8),
        )
        self.client.force_authenticate(self.operator)
        r = self.client.get("/api/control-room/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["positions"][0]["stale"])
        self.assertIn(s2.pk, [v["id"] for v in r.data["moving_without_location"]])
