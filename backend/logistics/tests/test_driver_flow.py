import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import TestCase, override_settings
from django.utils import timezone
from PIL import Image

from logistics.models import SmsOutbox
from logistics.tests.test_api import FreightTests


def png():
    output = BytesIO()
    Image.new("RGB", (8, 8), "white").save(output, format="PNG")
    return SimpleUploadedFile("seal.png", output.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=tempfile.gettempdir() + "/alamut-driver-flow")
class DriverFlowTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        FreightTests.setUpTestData.__func__(cls)

    setUp = FreightTests.setUp
    as_role = FreightTests.as_role
    payload = FreightTests.payload
    shipment = FreightTests.shipment
    post = FreightTests.post
    inspection = FreightTests.inspection
    def test_accept_decline_and_one_active_trip(self):
        first = self.shipment(status="approved", vehicle_type="trailer")
        second = self.shipment(status="approved", vehicle_type="trailer")
        self.as_role("driver")
        self.assertEqual(self.post(f"shipments/{first.pk}/accept/", {}).status_code, 200)
        blocked = self.post(f"shipments/{second.pk}/accept/", {})
        self.assertEqual(blocked.status_code, 400)
        self.assertIn("یک بار فعال", str(blocked.data))
        self.assertEqual(self.post(f"shipments/{second.pk}/decline/", {}).status_code, 200)
        listed = self.client.get("/api/shipments/?tab=offered")
        self.assertNotIn(second.pk, [row["id"] for row in listed.data["results"]])

    def test_waybill_blocks_transit_until_photo(self):
        shipment = self.shipment(
            status="arrived_pickup",
            driver=self.users["driver"],
            inspector=self.users["inspector"],
        )
        self.assertEqual(self.inspection(shipment).status_code, 201)
        self.as_role("operator")
        issued = self.post(f"shipments/{shipment.pk}/waybill-issue/", {})
        self.assertEqual(issued.status_code, 200, issued.data)
        code = issued.data["code"]
        self.assertEqual(len(code), 4)
        self.as_role("driver")
        self.assertEqual(
            self.post(f"shipments/{shipment.pk}/transition/", {"status": "in_transit"}).status_code,
            400,
        )
        verified = self.post(f"shipments/{shipment.pk}/waybill-verify/", {"code": code})
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertTrue(verified.data["destination_locked"])
        self.as_role("operator")
        photo = self.client.post(
            f"/api/shipments/{shipment.pk}/waybill-photo/",
            {"file": png()},
            format="multipart",
        )
        self.assertEqual(photo.status_code, 200, photo.data)
        self.as_role("driver")
        moved = self.post(f"shipments/{shipment.pk}/transition/", {"status": "in_transit"})
        self.assertEqual(moved.status_code, 200, moved.data)
        self.assertFalse(moved.data["destination_locked"])
        self.assertIn(moved.data["destination_address"], ["Warehouse B"])

    def test_pod_requires_three_photos_and_code(self):
        shipment = self.shipment(
            status="near_destination",
            driver=self.users["driver"],
            inspector=self.users["inspector"],
        )
        self.as_role("driver")
        early = self.post(f"shipments/{shipment.pk}/pod/", {"code": "0000"})
        self.assertEqual(early.status_code, 400)
        self.post(f"shipments/{shipment.pk}/delivery-code/", {})
        sms = SmsOutbox.objects.filter(phone="09120000008").latest("id")
        code = sms.body.rsplit(":", 1)[-1].strip()
        for _ in range(3):
            uploaded = self.client.post(
                f"/api/shipments/{shipment.pk}/delivery-photos/",
                {"file": png()},
                format="multipart",
            )
            self.assertEqual(uploaded.status_code, 201, uploaded.data)
        done = self.post(f"shipments/{shipment.pk}/pod/", {"code": code})
        self.assertEqual(done.status_code, 200, done.data)
        self.assertEqual(done.data["status"], "delivered")
        self.assertEqual(done.data["pod"]["photo_count"], 3)

    def test_nearby_and_phone_login(self):
        self.shipment(status="approved", origin="تهران", destination="مشهد", vehicle_type="trailer")
        self.as_role("driver")
        nearby = self.client.get("/api/shipments/nearby/?lat=35.7&lng=51.4&band=50")
        self.assertEqual(nearby.status_code, 200, nearby.data)
        self.assertGreaterEqual(len(nearby.data), 1)
        self.assertLess(nearby.data[0]["distance_km"], 50)
        self.client.force_authenticate(user=None)
        asked = self.client.post("/api/auth/otp/request/", {"phone": "09120000001"}, format="json")
        self.assertEqual(asked.status_code, 200, asked.data)
        code = SmsOutbox.objects.filter(phone="09120000001").latest("id").body.rsplit(":", 1)[-1].strip()
        verified = self.client.post(
            "/api/auth/otp/verify/",
            {"phone": "09120000001", "code": code, "remember": True, "role": "driver"},
            format="json",
        )
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertEqual(verified.data["role"], "driver")

    def test_sensitive_load_needs_inspector_before_move(self):
        shipment = self.shipment(status="assigned", driver=self.users["driver"], sensitive=True)
        self.as_role("driver")
        blocked = self.post(f"shipments/{shipment.pk}/transition/", {"status": "en_route_pickup"})
        self.assertEqual(blocked.status_code, 400)
        shipment.inspector = self.users["inspector"]
        shipment.save(update_fields=["inspector"])
        self.assertEqual(
            self.post(f"shipments/{shipment.pk}/transition/", {"status": "en_route_pickup"}).status_code,
            200,
        )

    def test_chat_between_driver_and_operator(self):
        shipment = self.shipment(status="assigned", driver=self.users["driver"])
        self.as_role("driver")
        sent = self.post(f"shipments/{shipment.pk}/messages/", {"body": "به بارگیری نزدیک می‌شوم"})
        self.assertEqual(sent.status_code, 200, sent.data)
        self.assertEqual(sent.data[-1]["body"], "به بارگیری نزدیک می‌شوم")
        self.as_role("owner")
        self.assertEqual(self.client.get(f"/api/shipments/{shipment.pk}/messages/").status_code, 403)
