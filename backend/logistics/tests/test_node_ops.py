import base64
from datetime import timedelta
from django.core.files.uploadedfile import SimpleUploadedFile
from django.utils import timezone
from logistics.models import Inspection, LocationPing, OperationalAlert, Shipment
from logistics.services import penalty_amount
from logistics.tests.test_api import FreightTests


class NodeOperatorFeaturesTests(FreightTests):
    def test_waybill_blocks_transit_until_code_and_photo(self):
        s = self.shipment(
            status="loading",
            driver=self.users["driver"],
            inspector=self.users["inspector"],
        )
        self.inspection(s)
        self.as_role("driver")
        blocked = self.post(f"shipments/{s.pk}/transition/", {"status": "in_transit"})
        self.assertEqual(blocked.status_code, 400)
        self.as_role("driver")
        self.assertEqual(
            self.post(f"shipments/{s.pk}/waybill/", {"action": "send"}).status_code,
            403,
        )
        sent = self.issue_waybill(s)
        self.assertEqual(sent.status_code, 200)
        self.as_role("driver")
        hidden = self.client.get(f"/api/shipments/{s.pk}/")
        self.assertNotIn("waybill_code", hidden.data)
        self.assertEqual(
            self.post(f"shipments/{s.pk}/transition/", {"status": "in_transit"}).status_code,
            200,
        )

    def test_penalty_caps_at_fifteen_percent_and_force_majeure_zeroes_it(self):
        self.assertEqual(penalty_amount(90, 1_000_000), 150_000)
        self.assertEqual(penalty_amount(90, 1_000_000, force_majeure=True), 0)
        s = self.shipment(status="in_transit", price=1_000_000, driver=self.users["driver"])
        self.as_role("operator")
        saved = self.post(
            f"shipments/{s.pk}/penalty/",
            {"delay_minutes": 90, "force_majeure": False},
        )
        self.assertEqual(saved.status_code, 200)
        self.assertEqual(saved.data["penalty_amount"], 150_000)
        zero = self.post(
            f"shipments/{s.pk}/penalty/",
            {"delay_minutes": 90, "force_majeure": True, "reason": "سیل جاده"},
        )
        self.assertEqual(zero.data["penalty_amount"], 0)

    def test_replace_driver_returns_the_load_to_assignment(self):
        s = self.shipment(status="assigned", driver=self.users["driver"])
        self.as_role("operator")
        result = self.post(f"shipments/{s.pk}/replace/", {"reason": "خودرو خراب شد"})
        self.assertEqual(result.status_code, 200)
        self.assertEqual(result.data["status"], "approved")
        self.assertIsNone(result.data["driver"])

    def test_operator_note_is_an_event(self):
        s = self.shipment()
        self.as_role("operator")
        result = self.post(f"shipments/{s.pk}/note/", {"body": "تماس با صاحب بار"})
        self.assertEqual(result.status_code, 200)
        self.assertIn("تماس با صاحب بار", result.data["events"][0]["note"])

    def test_gps_cut_alert_opens_and_resolves(self):
        s = self.shipment(status="in_transit", driver=self.users["driver"])
        LocationPing.objects.create(
            shipment=s,
            driver=self.users["driver"],
            latitude="35.700000",
            longitude="51.400000",
            observed_at=timezone.now() - timedelta(minutes=30),
        )
        self.as_role("operator")
        listed = self.client.get("/api/alerts/")
        self.assertEqual(listed.status_code, 200)
        match = [row for row in listed.data if row["kind"] == "gps_cut" and row["shipment"] == s.pk]
        self.assertEqual(len(match), 1)
        self.assertEqual(match[0]["severity"], "critical")
        closed = self.post(f"alerts/{match[0]['id']}/resolve/", {"resolution": "راننده دوباره آنلاین شد"})
        self.assertEqual(closed.status_code, 200)
        self.assertTrue(OperationalAlert.objects.get(pk=match[0]["id"]).is_resolved)

    def test_dossier_downloads_for_operator(self):
        s = self.shipment()
        self.as_role("owner")
        self.assertEqual(self.client.get(f"/api/shipments/{s.pk}/dossier/").status_code, 403)
        self.as_role("operator")
        response = self.client.get(f"/api/shipments/{s.pk}/dossier/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("پرونده محموله", response.content.decode())

    def test_delivery_otp_is_hidden_from_the_driver(self):
        s = self.shipment(
            status="in_transit",
            driver=self.users["driver"],
            inspector=self.users["inspector"],
            waybill_verified_at=timezone.now(),
        )
        s.waybill_photo = SimpleUploadedFile(
            "waybill.png",
            base64.b64decode(
                "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=="
            ),
            content_type="image/png",
        )
        s.save(update_fields=["waybill_photo"])
        Inspection.objects.create(
            shipment=s,
            inspector=self.users["inspector"],
            stage="delivery",
            packaging_ok=True,
            weight_ok=True,
            vehicle_ok=True,
            seal_number="SEAL",
            passed=True,
        )
        self.as_role("driver")
        moved = self.post(f"shipments/{s.pk}/transition/", {"status": "delivered"})
        self.assertEqual(moved.status_code, 200)
        self.assertNotIn("delivery_otp", moved.data)
        self.as_role("owner")
        seen = self.client.get(f"/api/shipments/{s.pk}/")
        self.assertEqual(len(seen.data["delivery_otp"]), 6)
