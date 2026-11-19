import tempfile
from io import BytesIO

from django.core.files.uploadedfile import SimpleUploadedFile
from django.test import override_settings
from PIL import Image

from logistics.models import Inspection, Shipment, SmsOutbox, User
from logistics.tests.test_api import FreightTests


def png():
    output = BytesIO()
    Image.new("RGB", (8, 8), "white").save(output, format="PNG")
    return SimpleUploadedFile("seal.png", output.getvalue(), content_type="image/png")


@override_settings(MEDIA_ROOT=tempfile.gettempdir() + "/alamut-inspector-flow")
class InspectorAndCrossPanelTests(FreightTests):
    def test_define_inspector_otp_and_photo_keeps_checklist(self):
        self.as_role("operator")
        created = self.post(
            "inspectors/",
            {"full_name": "متصدی میدان", "phone": "09125550001", "notes": "پایانه"},
        )
        self.assertEqual(created.status_code, 201, created.data)
        self.assertEqual(created.data["phone"], "09125550001")
        person = User.objects.get(phone="09125550001")
        shipment = self.shipment(
            status="loading",
            driver=self.users["driver"],
            inspector=person,
            requires_inspector=True,
        )
        self.client.force_authenticate(user=None)
        asked = self.client.post("/api/auth/otp/request/", {"phone": "09125550001"}, format="json")
        self.assertEqual(asked.status_code, 200, asked.data)
        code = SmsOutbox.objects.filter(phone="09125550001").latest("id").body.rsplit(":", 1)[-1].strip()
        verified = self.client.post(
            "/api/auth/otp/verify/",
            {"phone": "09125550001", "code": code, "role": "inspector"},
            format="json",
        )
        self.assertEqual(verified.status_code, 200, verified.data)
        self.assertEqual(verified.data["role"], "inspector")
        draft = self.post(
            f"shipments/{shipment.pk}/inspection-report/",
            {
                "stage": "loading",
                "checklist": [
                    {"key": "vehicle_present", "label": "خودرو", "checked": True, "note": "حاضر"},
                    {"key": "seal", "label": "پلمب", "checked": False, "note": ""},
                ],
                "finalize": False,
            },
        )
        self.assertEqual(draft.status_code, 200, draft.data)
        photo = self.client.post(
            f"/api/shipments/{shipment.pk}/inspection-photos/",
            {"file": png(), "kind": "seal"},
            format="multipart",
        )
        self.assertEqual(photo.status_code, 200, photo.data)
        self.assertEqual(len(photo.data["photos"]), 1)
        kept = next(row for row in photo.data["checklist"] if row["key"] == "vehicle_present")
        self.assertTrue(kept["checked"])
        self.assertEqual(kept["note"], "حاضر")

    def test_stopped_inspection_holds_the_load_for_driver_and_owner(self):
        shipment = self.shipment(
            status="loading",
            driver=self.users["driver"],
            inspector=self.users["inspector"],
        )
        self.as_role("inspector")
        self.post(
            f"shipments/{shipment.pk}/inspection-report/",
            {"stage": "loading", "checklist": [], "finalize": False},
        )
        self.client.post(
            f"/api/shipments/{shipment.pk}/inspection-photos/",
            {"file": png(), "kind": "cargo"},
            format="multipart",
        )
        sent = self.post(
            f"shipments/{shipment.pk}/inspection-report/",
            {"stage": "loading", "finalize": True, "seal_number": "PL-1"},
        )
        self.assertEqual(sent.status_code, 200, sent.data)
        report = Inspection.objects.get(shipment=shipment, stage="loading")
        self.as_role("operator")
        decided = self.post(
            f"inspections/{report.pk}/decision/",
            {"decision": "stopped", "note": "پلمب مخدوش است"},
        )
        self.assertEqual(decided.status_code, 200, decided.data)
        self.assertEqual(decided.data["status"], "on_hold")
        self.as_role("driver")
        driver_view = self.client.get(f"/api/shipments/{shipment.pk}/")
        self.assertEqual(driver_view.data["status"], "on_hold")
        self.as_role("owner")
        owner_view = self.client.get(f"/api/shipments/{shipment.pk}/")
        self.assertEqual(owner_view.data["status"], "on_hold")
        self.assertEqual(owner_view.data["status"], driver_view.data["status"])

    def test_deactivating_inspector_unassigns_open_loads(self):
        self.as_role("operator")
        created = self.post(
            "inspectors/",
            {"full_name": "متصدی موقت", "phone": "09125550002"},
        )
        person = User.objects.get(pk=created.data["id"])
        shipment = self.shipment(status="assigned", driver=self.users["driver"], inspector=person)
        updated = self.client.patch(
            f"/api/inspectors/{person.pk}/",
            {"is_active": False},
            format="json",
        )
        self.assertEqual(updated.status_code, 200, updated.data)
        self.assertGreaterEqual(updated.data["unassigned"], 1)
        shipment.refresh_from_db()
        self.assertIsNone(shipment.inspector_id)
        self.assertFalse(person.__class__.objects.get(pk=person.pk).is_active)

    def test_channels_stay_separate_and_one_load_matches_across_panels(self):
        shipment = self.shipment(status="assigned", driver=self.users["driver"], inspector=self.users["inspector"])
        self.as_role("owner")
        owner_note = self.post(f"shipments/{shipment.pk}/messages/", {"body": "ساعت بارگیری"})
        self.assertEqual(owner_note.status_code, 201, owner_note.data)
        self.as_role("driver")
        driver_seen = self.client.get(f"/api/shipments/{shipment.pk}/messages/")
        self.assertEqual(driver_seen.status_code, 200, driver_seen.data)
        self.assertEqual(driver_seen.data, [])
        driver_note = self.post(f"shipments/{shipment.pk}/messages/", {"body": "در راهم"})
        self.assertEqual(driver_note.status_code, 200, driver_note.data)
        self.assertEqual(driver_note.data[-1]["body"], "در راهم")
        self.as_role("owner")
        hidden = self.client.get(f"/api/shipments/{shipment.pk}/messages/")
        self.assertEqual(hidden.status_code, 403)
        owner_channel = self.client.get(
            f"/api/shipments/{shipment.pk}/messages/?channel=owner_operator"
        )
        self.assertEqual(owner_channel.data[-1]["body"], "ساعت بارگیری")
        self.assertNotIn("در راهم", [row["body"] for row in owner_channel.data])
        self.as_role("driver")
        for status in ("en_route_pickup", "arrived_pickup", "loading"):
            moved = self.post(f"shipments/{shipment.pk}/transition/", {"status": status})
            self.assertEqual(moved.status_code, 200, moved.data)
        self.as_role("inspector")
        self.client.post(
            f"/api/shipments/{shipment.pk}/inspection-photos/",
            {"file": png(), "kind": "lashing"},
            format="multipart",
        )
        self.post(
            f"shipments/{shipment.pk}/inspection-report/",
            {"stage": "loading", "checklist": [], "finalize": True},
        )
        report = Inspection.objects.filter(shipment=shipment, stage="loading").latest("id")
        self.as_role("operator")
        cleared = self.post(
            f"inspections/{report.pk}/decision/",
            {"decision": "approved", "note": "بار سالم است"},
        )
        self.assertEqual(cleared.status_code, 200, cleared.data)
        self.assertEqual(cleared.data["status"], "loading")
        issued = self.post(f"shipments/{shipment.pk}/waybill-issue/", {})
        self.assertEqual(issued.status_code, 200, issued.data)
        self.as_role("driver")
        verified = self.post(
            f"shipments/{shipment.pk}/waybill-verify/",
            {"code": issued.data["code"]},
        )
        self.assertEqual(verified.status_code, 200, verified.data)
        self.as_role("operator")
        photo = self.client.post(
            f"/api/shipments/{shipment.pk}/waybill-photo/",
            {"file": png()},
            format="multipart",
        )
        self.assertEqual(photo.status_code, 200, photo.data)
        self.as_role("driver")
        transit = self.post(f"shipments/{shipment.pk}/transition/", {"status": "in_transit"})
        self.assertEqual(transit.status_code, 200, transit.data)
        self.assertEqual(transit.data["status"], "in_transit")
        self.as_role("owner")
        same = self.client.get(f"/api/shipments/{shipment.pk}/")
        self.assertEqual(same.data["status"], "in_transit")
        self.assertEqual(Shipment.objects.get(pk=shipment.pk).status, "in_transit")
