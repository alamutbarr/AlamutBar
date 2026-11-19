from django.conf import settings
from django.db import migrations, models
import django.db.models.deletion
import logistics.models


class Migration(migrations.Migration):

    dependencies = [
        ("logistics", "0012_owner_map_kyc_chat"),
        migrations.swappable_dependency(settings.AUTH_USER_MODEL),
    ]

    operations = [
        migrations.AddField(
            model_name="shipment",
            name="waybill_code",
            field=models.CharField(blank=True, default="", max_length=5, verbose_name="کد پیامک بارنامه"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="waybill_sent_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="زمان ارسال کد بارنامه"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="waybill_verified_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="زمان تأیید کد بارنامه"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="waybill_photo",
            field=models.ImageField(blank=True, null=True, upload_to=logistics.models.waybill_path, verbose_name="عکس بارنامه"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="delivery_otp",
            field=models.CharField(blank=True, default="", max_length=6, verbose_name="کد تحویل"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="delivery_otp_verified_at",
            field=models.DateTimeField(blank=True, null=True, verbose_name="زمان تأیید کد تحویل"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="penalty_amount",
            field=models.PositiveBigIntegerField(default=0, verbose_name="جریمه تأخیر (تومان)"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="delay_minutes",
            field=models.PositiveIntegerField(default=0, verbose_name="دقیقه تأخیر"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="force_majeure",
            field=models.BooleanField(default=False, verbose_name="فورس‌ماژور"),
        ),
        migrations.AddField(
            model_name="shipment",
            name="force_majeure_reason",
            field=models.CharField(blank=True, default="", max_length=500, verbose_name="دلیل فورس‌ماژور"),
        ),
        migrations.CreateModel(
            name="OperationalAlert",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("kind", models.CharField(choices=[("gps_cut", "قطع GPS"), ("route_deviation", "انحراف از مسیر"), ("delay", "تأخیر اعزام"), ("inspector_absent", "غیبت متصدی"), ("other", "سایر")], max_length=24, verbose_name="نوع")),
                ("severity", models.CharField(choices=[("warning", "هشدار"), ("critical", "بحرانی")], default="warning", max_length=12, verbose_name="شدت")),
                ("message", models.CharField(max_length=300, verbose_name="شرح")),
                ("is_resolved", models.BooleanField(default=False, verbose_name="رفع شده")),
                ("resolution", models.CharField(blank=True, max_length=500, verbose_name="اقدام")),
                ("created_at", models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")),
                ("resolved_at", models.DateTimeField(blank=True, null=True, verbose_name="زمان رفع")),
                ("resolved_by", models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name="resolved_alerts", to=settings.AUTH_USER_MODEL, verbose_name="رفع‌کننده")),
                ("shipment", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="alerts", to="logistics.shipment", verbose_name="بار")),
            ],
            options={
                "verbose_name": "هشدار عملیات",
                "verbose_name_plural": "هشدارهای عملیات",
                "ordering": ["-created_at"],
            },
        ),
    ]
