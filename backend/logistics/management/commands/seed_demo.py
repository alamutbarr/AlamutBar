import os
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.conf import settings
from django.db import transaction
from django.utils import timezone
from logistics.models import *


class Command(BaseCommand):
    help = "Create idempotent fictional demo data; requires DEMO_ENABLED=1."

    @transaction.atomic
    def handle(self, *args, **options):
        if not settings.DEMO_ENABLED:
            raise CommandError(
                "Demo seeding is disabled. Set DEMO_ENABLED=1 only in a development environment."
            )
        password = os.getenv("DEMO_PASSWORD", "AlamutDemo!2026")
        users = {}
        specs = [
            ("owner", "آرمان", "رضایی", "09120000001", "صنایع پارس (نمونه)"),
            ("driver", "مهدی", "احمدی", "09120000002", ""),
            ("operator", "سارا", "محمدی", "09120000003", "الموت"),
            ("inspector", "علی", "کریمی", "09120000004", "الموت"),
        ]
        for role, first, last, phone, company in specs:
            user, created = User.objects.get_or_create(
                username=role + ".demo",
                defaults={
                    "role": role,
                    "first_name": first,
                    "last_name": last,
                    "phone": phone,
                    "company": company,
                    "verified": True,
                },
            )
            if created:
                user.set_password(password)
                user.save()
            users[role] = user
        owner = users["owner"]
        if not owner.national_id:
            owner.national_id = "1234567891"
            owner.postal_code = "1419733111"
            owner.save(update_fields=["national_id", "postal_code"])
        OwnerIdentity.objects.get_or_create(
            user=owner,
            defaults={"id_type": "national_card", "status": "approved"},
        )
        Vehicle.objects.get_or_create(
            driver=users["driver"],
            defaults={
                "kind": "trailer",
                "plate": "۲۳ ع ۴۵۶ ایران ۱۲",
                "capacity": 24,
                "license_number": "DEMO-DRIVER-001",
            },
        )
        second, created = User.objects.get_or_create(
            username="driver2.demo",
            defaults={
                "role": "driver",
                "first_name": "حسین",
                "last_name": "نوری",
                "phone": "09120000005",
                "verified": True,
            },
        )
        if created:
            second.set_password(password)
            second.save()
        Vehicle.objects.get_or_create(
            driver=second,
            defaults={
                "kind": "truck",
                "plate": "۴۵ ب ۱۲۳ ایران ۲۱",
                "capacity": 12,
                "license_number": "DEMO-DRIVER-002",
            },
        )
        for demo_driver in [users["driver"], second]:
            DriverProfile.objects.get_or_create(
                user=demo_driver,
                defaults={
                    "status": "approved",
                    "license_expiry": timezone.localdate() + timedelta(days=365),
                    "insurance_expiry": timezone.localdate() + timedelta(days=365),
                    "review_note": "پرونده نمونه؛ این تأیید برای نمایش محیط آزمایشی است.",
                },
            )
        samples = [
            (
                "ورق فولادی بسته‌بندی شده",
                "نیشابور",
                "تهران",
                18,
                "trailer",
                18500000,
                "in_transit",
            ),
            (
                "قطعات صنعتی و تجهیزات",
                "مشهد",
                "اصفهان",
                8,
                "truck",
                12400000,
                "pending",
            ),
            (
                "پالت محصولات بسته‌بندی",
                "تهران",
                "شیراز",
                16,
                "trailer",
                23000000,
                "approved",
            ),
            (
                "مواد اولیه کارخانه",
                "یزد",
                "نیشابور",
                20,
                "trailer",
                16400000,
                "approved",
            ),
            ("تجهیزات خط تولید", "اصفهان", "تبریز", 10, "truck", 19800000, "completed"),
            (
                "محموله محصولات صنعتی",
                "نیشابور",
                "کرج",
                12,
                "trailer",
                14500000,
                "completed",
            ),
            (
                "کالای بسته‌بندی صادراتی",
                "مشهد",
                "بندرعباس",
                22,
                "trailer",
                32000000,
                "pending",
            ),
            (
                "قطعات یدکی ماشین‌آلات",
                "تهران",
                "قزوین",
                3,
                "truck",
                6500000,
                "cancelled",
            ),
        ]
        for i, (title, origin, destination, weight, kind, price, state) in enumerate(
            samples
        ):
            shipment, created = Shipment.objects.get_or_create(
                code=f"AL-DEMO0000{i + 1}",
                defaults={
                    "title": title,
                    "owner": users["owner"],
                    "origin": origin,
                    "destination": destination,
                    "origin_address": origin
                    + "، شهرک صنعتی، انبار شماره ۱ (نشانی نمونه)",
                    "destination_address": destination
                    + "، مرکز توزیع، درب شماره ۲ (نشانی نمونه)",
                    "recipient_name": "گیرنده آزمایشی",
                    "recipient_phone": "09120000006",
                    "weight": weight,
                    "vehicle_type": kind,
                    "cargo_value": 200000000,
                    "price": price,
                    "pickup_date": timezone.localdate() + timedelta(days=i + 1),
                    "status": state,
                    "notes": "این محموله صرفاً داده نمونه برای ارزیابی سامانه است.",
                    "driver": users["driver"]
                    if state in ["in_transit", "completed"]
                    else None,
                    "inspector": users["inspector"]
                    if state in ["in_transit", "completed"]
                    else None,
                },
            )
            if not created:
                continue
            for step in [
                "pending",
                "approved",
                "assigned",
                "loading",
                "in_transit",
                "delivered",
                "completed",
            ]:
                if state == "cancelled":
                    ShipmentEvent.objects.create(
                        shipment=shipment,
                        actor=users["operator"],
                        status="cancelled",
                        note="لغو درخواست آزمایشی توسط صاحب بار",
                    )
                    break
                ShipmentEvent.objects.create(
                    shipment=shipment,
                    actor=users["operator"],
                    status=step,
                    note="مرحله نمونه برای نمایش گردش حمل",
                )
                if step == state:
                    break
            if state in ["in_transit", "completed"]:
                Inspection.objects.create(
                    shipment=shipment,
                    inspector=users["inspector"],
                    stage="loading",
                    packaging_ok=True,
                    weight_ok=True,
                    vehicle_ok=True,
                    seal_number="DEMO-SEAL-" + str(i + 1),
                    passed=True,
                )
            if state == "completed":
                Inspection.objects.create(
                    shipment=shipment,
                    inspector=users["inspector"],
                    stage="delivery",
                    packaging_ok=True,
                    weight_ok=True,
                    vehicle_ok=True,
                    seal_number="DEMO-SEAL-" + str(i + 1),
                    passed=True,
                )
                Invoice.objects.create(
                    shipment=shipment,
                    amount=price,
                    status="paid" if i == 4 else "unpaid",
                    reference="DEMO-PAYMENT-001" if i == 4 else "",
                    paid_at=timezone.now() if i == 4 else None,
                )
            Notification.objects.create(
                user=users["owner"],
                shipment=shipment,
                title=shipment.code + " · " + shipment.get_status_display(),
            )
        if not Ticket.objects.filter(
            user=users["owner"], subject="هماهنگی زمان بارگیری (نمونه)"
        ).exists():
            ticket = Ticket.objects.create(
                user=users["owner"], subject="هماهنگی زمان بارگیری (نمونه)"
            )
            TicketMessage.objects.create(
                ticket=ticket,
                author=users["owner"],
                body="سلام، برای هماهنگی ساعت بارگیری راهنمایی می‌خواهم. این پیام آزمایشی است.",
            )
            TicketMessage.objects.create(
                ticket=ticket,
                author=users["operator"],
                body="سلام، لطفاً کد محموله و بازه زمانی مورد نظر را اعلام کنید تا هماهنگ کنیم.",
            )
        self.stdout.write(
            self.style.SUCCESS(
                "Demo accounts and fictional shipments are ready. Existing records were preserved."
            )
        )
