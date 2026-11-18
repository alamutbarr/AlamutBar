import django.core.validators
import django.db.models.deletion
import logistics.models
from decimal import Decimal
from django.conf import settings
from django.db import migrations, models


class Migration(migrations.Migration):
    dependencies = [
        ("logistics", "0010_persian_admin_labels"),
    ]

    operations = [
        migrations.AddField(
            model_name="user",
            name="national_id",
            field=models.CharField(
                blank=True, default="", max_length=10, verbose_name="کد ملی"
            ),
        ),
        migrations.AddField(
            model_name="user",
            name="postal_code",
            field=models.CharField(
                blank=True, default="", max_length=10, verbose_name="کد پستی"
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="cargo_type",
            field=models.CharField(
                blank=True, default="", max_length=80, verbose_name="نوع کالا"
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="packaging",
            field=models.CharField(
                blank=True, default="", max_length=80, verbose_name="بسته‌بندی"
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="package_count",
            field=models.PositiveIntegerField(
                blank=True,
                null=True,
                validators=[django.core.validators.MinValueValidator(1)],
                verbose_name="تعداد بسته",
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="length_m",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01"))
                ],
                verbose_name="طول (متر)",
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="width_m",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01"))
                ],
                verbose_name="عرض (متر)",
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="height_m",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                max_digits=6,
                null=True,
                validators=[
                    django.core.validators.MinValueValidator(Decimal("0.01"))
                ],
                verbose_name="ارتفاع (متر)",
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="urgency",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "نامشخص"),
                    ("urgent", "فوری"),
                    ("scheduled", "زمان‌بندی‌شده"),
                ],
                default="",
                max_length=12,
                verbose_name="فوریت",
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="pickup_window",
            field=models.CharField(
                blank=True,
                choices=[
                    ("", "نامشخص"),
                    ("08-12", "۸ تا ۱۲"),
                    ("12-16", "۱۲ تا ۱۶"),
                    ("16-20", "۱۶ تا ۲۰"),
                    ("20-24", "۲۰ تا ۲۴"),
                ],
                default="",
                max_length=20,
                verbose_name="بازه بارگیری",
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="loading_method",
            field=models.CharField(
                blank=True, default="", max_length=40, verbose_name="روش بارگیری"
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="unloading_method",
            field=models.CharField(
                blank=True, default="", max_length=40, verbose_name="روش تخلیه"
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="recipient_national_id",
            field=models.CharField(
                blank=True, default="", max_length=10, verbose_name="کد ملی گیرنده"
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="recipient_postal_code",
            field=models.CharField(
                blank=True, default="", max_length=10, verbose_name="کد پستی گیرنده"
            ),
        ),
        migrations.AddField(
            model_name="shipment",
            name="insurance_requested",
            field=models.BooleanField(default=False, verbose_name="درخواست بیمه"),
        ),
        migrations.CreateModel(
            name="ShipmentRating",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "driver_score",
                    models.PositiveSmallIntegerField(
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(5),
                        ],
                        verbose_name="امتیاز راننده",
                    ),
                ),
                (
                    "inspector_score",
                    models.PositiveSmallIntegerField(
                        blank=True,
                        null=True,
                        validators=[
                            django.core.validators.MinValueValidator(1),
                            django.core.validators.MaxValueValidator(5),
                        ],
                        verbose_name="امتیاز متصدی",
                    ),
                ),
                (
                    "comment",
                    models.CharField(blank=True, max_length=1000, verbose_name="نظر"),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت"),
                ),
                (
                    "shipment",
                    models.OneToOneField(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="rating",
                        to="logistics.shipment",
                        verbose_name="بار",
                    ),
                ),
            ],
            options={
                "verbose_name": "امتیاز محموله",
                "verbose_name_plural": "امتیازهای محموله",
            },
        ),
        migrations.CreateModel(
            name="Complaint",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "type",
                    models.CharField(
                        choices=[
                            ("driver", "راننده"),
                            ("dispatcher", "متصدی"),
                            ("cargo", "آسیب به کالا"),
                            ("delay", "تأخیر در حمل"),
                            ("other", "سایر موارد"),
                        ],
                        max_length=20,
                        verbose_name="موضوع",
                    ),
                ),
                ("description", models.TextField(max_length=4000, verbose_name="شرح")),
                (
                    "status",
                    models.CharField(
                        choices=[
                            ("pending", "در بررسی"),
                            ("reviewed", "بررسی شد"),
                            ("resolved", "حل شد"),
                            ("rejected", "رد شد"),
                        ],
                        default="pending",
                        max_length=12,
                        verbose_name="وضعیت",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت"),
                ),
                (
                    "updated_at",
                    models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر"),
                ),
                (
                    "shipment",
                    models.ForeignKey(
                        blank=True,
                        null=True,
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="complaints",
                        to="logistics.shipment",
                        verbose_name="بار",
                    ),
                ),
                (
                    "user",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        related_name="complaints",
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="کاربر",
                    ),
                ),
            ],
            options={
                "verbose_name": "شکایت",
                "verbose_name_plural": "شکایت‌ها",
                "ordering": ["-updated_at"],
            },
        ),
        migrations.CreateModel(
            name="ComplaintMessage",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                ("body", models.TextField(max_length=4000, verbose_name="متن")),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت"),
                ),
                (
                    "author",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="نویسنده",
                    ),
                ),
                (
                    "complaint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="messages",
                        to="logistics.complaint",
                        verbose_name="شکایت",
                    ),
                ),
            ],
            options={
                "verbose_name": "پیام شکایت",
                "verbose_name_plural": "پیام‌های شکایت",
                "ordering": ["created_at"],
            },
        ),
        migrations.CreateModel(
            name="ComplaintPhoto",
            fields=[
                (
                    "id",
                    models.BigAutoField(
                        auto_created=True,
                        primary_key=True,
                        serialize=False,
                        verbose_name="ID",
                    ),
                ),
                (
                    "file",
                    models.FileField(
                        upload_to=logistics.models.complaint_photo_path,
                        verbose_name="تصویر",
                    ),
                ),
                (
                    "created_at",
                    models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت"),
                ),
                (
                    "complaint",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="photos",
                        to="logistics.complaint",
                        verbose_name="شکایت",
                    ),
                ),
                (
                    "uploaded_by",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.PROTECT,
                        to=settings.AUTH_USER_MODEL,
                        verbose_name="بارگذاری‌کننده",
                    ),
                ),
            ],
            options={
                "verbose_name": "مدرک شکایت",
                "verbose_name_plural": "مدارک شکایت",
            },
        ),
    ]
