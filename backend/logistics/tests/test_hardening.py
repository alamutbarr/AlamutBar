from datetime import timedelta
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient
from logistics.models import User, Shipment, Invoice, Vehicle


class BoundaryTests(TestCase):
    def setUp(self):
        self.owner = User.objects.create_user(
            username="o", role="owner", phone="09120000001"
        )
        self.driver = User.objects.create_user(
            username="d", role="driver", phone="09120000002", verified=True
        )
        self.operator = User.objects.create_user(
            username="op", role="operator", phone="09120000003"
        )
        self.inspector = User.objects.create_user(
            username="i", role="inspector", phone="09120000004"
        )
        self.shipment = Shipment.objects.create(
            owner=self.owner,
            driver=self.driver,
            inspector=self.inspector,
            title="Test",
            origin="A",
            destination="B",
            origin_address="A1",
            destination_address="B1",
            recipient_name="R",
            recipient_phone="09120000005",
            weight=1,
            vehicle_type="truck",
            price=5000,
            pickup_date=timezone.localdate() + timedelta(days=1),
            status="in_transit",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.driver)

    def post(self, action, data):
        return self.client.post(
            f"/api/shipments/{self.shipment.pk}/{action}/", data, format="json"
        )

    def test_driver_location_saved(self):
        r = self.post(
            "location",
            {"latitude": "36.123456", "longitude": "50.123456", "accuracy": 10},
        )
        self.assertEqual(r.status_code, 201, r.data)
        self.assertEqual(self.shipment.locations.count(), 1)

    def test_location_range_validation(self):
        for data in [
            {"latitude": 91, "longitude": 0},
            {"latitude": 0, "longitude": 181},
            {"latitude": "NaN", "longitude": 0},
            {"latitude": 0, "longitude": 0, "accuracy": -1},
        ]:
            self.assertEqual(self.post("location", data).status_code, 400)

    def test_location_owner_forbidden(self):
        self.client.force_authenticate(self.owner)
        self.assertEqual(
            self.post("location", {"latitude": 0, "longitude": 0}).status_code, 403
        )

    def test_location_only_while_in_transit(self):
        self.shipment.status = "delivered"
        self.shipment.save()
        self.assertEqual(
            self.post("location", {"latitude": 0, "longitude": 0}).status_code, 400
        )

    def test_invalid_transition_type_does_not_crash(self):
        self.assertEqual(
            self.post("transition", {"status": ["completed"]}).status_code, 400
        )

    def test_invalid_assignment_type_does_not_crash(self):
        self.client.force_authenticate(self.operator)
        self.assertEqual(
            self.post("assign", {"driver": "oops", "inspector": None}).status_code, 400
        )

    def test_invalid_verify_type_rejected(self):
        self.client.force_authenticate(self.operator)
        r = self.client.post(
            f"/api/team/{self.driver.pk}/verify/", {"verified": "yes"}, format="json"
        )
        self.assertEqual(r.status_code, 400)

    def test_inspector_cannot_read_financial_records(self):
        Invoice.objects.create(shipment=self.shipment, amount=5000)
        self.client.force_authenticate(self.inspector)
        self.assertEqual(self.client.get("/api/invoices/").data["count"], 0)
        self.assertEqual(self.client.get("/api/dashboard/").data["unpaid"], 0)

    def test_vehicle_read_and_update(self):
        self.assertIsNone(self.client.get("/api/vehicle/").data)
        data = {
            "kind": "truck",
            "plate": "boundary",
            "capacity": "10.00",
            "license_number": "L1",
            "available": True,
        }
        self.assertEqual(
            self.client.put("/api/vehicle/", data, format="json").status_code, 200
        )
        self.assertEqual(self.client.get("/api/vehicle/").data["plate"], "boundary")
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get("/api/vehicle/").status_code, 403)

    def test_password_change_success(self):
        self.driver.set_password("CurrentStrong!2026")
        self.driver.save()
        r = self.client.post(
            "/api/auth/password/",
            {
                "old_password": "CurrentStrong!2026",
                "new_password": "AnotherStrong!2026",
            },
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.driver.refresh_from_db()
        self.assertTrue(self.driver.check_password("AnotherStrong!2026"))

    def test_health_reports_database(self):
        r = self.client.get("/api/health/")
        self.assertEqual(r.status_code, 200)
        self.assertEqual(r.data["service"], "alamut-api")

    def test_operator_operations_available(self):
        self.client.force_authenticate(self.operator)
        r = self.client.get("/api/operations/")
        self.assertEqual(r.status_code, 200)
        self.assertIn("audit", r.data)
