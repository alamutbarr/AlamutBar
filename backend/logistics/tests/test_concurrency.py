from concurrent.futures import ThreadPoolExecutor
from threading import Barrier
from unittest import skipUnless
from datetime import timedelta
from django.db import connection, close_old_connections
from django.test import TransactionTestCase
from django.utils import timezone
from rest_framework.exceptions import ValidationError
from logistics.models import User, Vehicle, Shipment, DriverProfile
from logistics.services import assign


@skipUnless(connection.vendor == "mysql", "MySQL-specific row-lock integration test")
class AssignmentConcurrencyTests(TransactionTestCase):
    def test_two_simultaneous_assignments_only_book_one_trip(self):
        owner = User.objects.create_user(
            username="owner", role="owner", phone="09120000001"
        )
        driver = User.objects.create_user(
            username="driver", role="driver", phone="09120000002", verified=True
        )
        operator = User.objects.create_user(
            username="operator", role="operator", phone="09120000003"
        )
        inspector = User.objects.create_user(
            username="inspector", role="inspector", phone="09120000004"
        )
        DriverProfile.objects.create(
            user=driver,
            status="approved",
            license_expiry=timezone.localdate() + timedelta(days=365),
            insurance_expiry=timezone.localdate() + timedelta(days=365),
        )
        Vehicle.objects.create(
            driver=driver,
            kind="truck",
            plate="concurrency",
            capacity=20,
            license_number="TEST",
        )
        shipments = [
            Shipment.objects.create(
                owner=owner,
                title="Concurrent " + str(i),
                origin="تهران",
                destination="مشهد",
                origin_address="A",
                destination_address="B",
                recipient_name="Test",
                recipient_phone="09120000005",
                weight=10,
                vehicle_type="truck",
                price=5000000,
                pickup_date=timezone.localdate() + timedelta(days=1),
                status="approved",
            )
            for i in range(2)
        ]
        barrier = Barrier(2)

        def attempt(pk):
            close_old_connections()
            try:
                barrier.wait(timeout=10)
                assign(pk, operator, driver, inspector)
                return "assigned"
            except ValidationError:
                return "blocked"
            finally:
                close_old_connections()

        with ThreadPoolExecutor(max_workers=2) as pool:
            results = list(pool.map(attempt, [s.pk for s in shipments]))
        self.assertCountEqual(results, ["assigned", "blocked"])
        self.assertEqual(
            Shipment.objects.filter(driver=driver, status="assigned").count(), 1
        )
