import uuid
from decimal import Decimal
from django.utils import timezone
from django.db import models
from django.contrib.auth.models import AbstractUser
from django.core.validators import MinValueValidator, RegexValidator, MaxValueValidator


def default_capabilities():
    return ["dispatch", "finance", "crm", "verification", "monitoring", "content"]


def validate_capabilities(value):
    from django.core.exceptions import ValidationError

    if not isinstance(value, list) or any(
        v not in default_capabilities() for v in value
    ):
        raise ValidationError(
            "سطوح مجاز: dispatch, finance, crm, verification, monitoring, content"
        )


class User(AbstractUser):
    REQUIRED_FIELDS = ["phone"]

    class Role(models.TextChoices):
        OWNER = "owner", "صاحب بار"
        DRIVER = "driver", "راننده"
        OPERATOR = "operator", "اپراتور"
        INSPECTOR = "inspector", "متصدی"

    role = models.CharField(
        max_length=16, choices=Role.choices, default=Role.OWNER, verbose_name="نقش"
    )
    phone = models.CharField(
        max_length=11,
        unique=True,
        validators=[RegexValidator(r"^09\d{9}$", "شماره همراه معتبر وارد کنید.")],
        verbose_name="شمارهٔ همراه",
    )
    company = models.CharField(max_length=120, blank=True, verbose_name="شرکت")
    national_id = models.CharField(
        max_length=10, blank=True, default="", verbose_name="کد ملی"
    )
    postal_code = models.CharField(
        max_length=10, blank=True, default="", verbose_name="کد پستی"
    )
    avatar = models.FileField(
        upload_to="avatars/", blank=True, verbose_name="تصویر پروفایل"
    )
    verified = models.BooleanField(default=False, verbose_name="تأییدشده")
    capabilities = models.JSONField(
        default=default_capabilities,
        validators=[validate_capabilities],
        verbose_name="سطوح دسترسی",
    )

    def __str__(self):
        return self.get_full_name() or self.username

    class Meta(AbstractUser.Meta):
        verbose_name = "کاربر"
        verbose_name_plural = "کاربران"


class Vehicle(models.Model):
    driver = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="vehicle",
        limit_choices_to={"role": "driver"},
        verbose_name="راننده",
    )
    kind = models.CharField(
        max_length=40,
        choices=[
            ("trailer", "تریلی"),
            ("truck", "کامیون"),
            ("pickup", "وانت"),
            ("refrigerated", "یخچال‌دار"),
        ],
        verbose_name="نوع خودرو",
    )
    plate = models.CharField(max_length=25, unique=True, verbose_name="پلاک")
    capacity = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.1"))],
        verbose_name="ظرفیت (تن)",
    )
    license_number = models.CharField(max_length=40, verbose_name="شمارهٔ گواهینامه")
    available = models.BooleanField(default=True, verbose_name="آمادهٔ حمل")

    class Meta:
        verbose_name = "خودرو"
        verbose_name_plural = "خودروها"

    def __str__(self):
        return self.plate


def tracking_code():
    return "AL-" + uuid.uuid4().hex[:10].upper()


class Shipment(models.Model):
    class Status(models.TextChoices):
        PENDING = "pending", "در انتظار بررسی"
        APPROVED = "approved", "آماده تخصیص"
        ASSIGNED = "assigned", "راننده تخصیص یافت"
        LOADING = "loading", "در حال بارگیری"
        IN_TRANSIT = "in_transit", "در مسیر"
        DELIVERED = "delivered", "تحویل شده"
        COMPLETED = "completed", "تکمیل شده"
        ON_HOLD = "on_hold", "متوقف"
        CANCELLED = "cancelled", "لغو شده"

    code = models.CharField(
        max_length=20,
        unique=True,
        default=tracking_code,
        editable=False,
        verbose_name="کد رهگیری",
    )
    owner = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="owned_shipments",
        verbose_name="صاحب بار",
    )
    driver = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="driven_shipments",
        verbose_name="راننده",
    )
    inspector = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="inspected_shipments",
        verbose_name="متصدی",
    )
    title = models.CharField(max_length=140, verbose_name="عنوان")
    origin = models.CharField(max_length=80, verbose_name="مبدأ")
    destination = models.CharField(max_length=80, verbose_name="مقصد")
    origin_address = models.TextField(max_length=1000, verbose_name="نشانی مبدأ")
    destination_address = models.TextField(
        max_length=1000, blank=True, verbose_name="نشانی مقصد"
    )
    recipient_name = models.CharField(max_length=100, verbose_name="نام گیرنده")
    recipient_phone = models.CharField(
        max_length=11,
        validators=[RegexValidator(r"^09\d{9}$")],
        verbose_name="شمارهٔ گیرنده",
    )
    weight = models.DecimalField(
        max_digits=8,
        decimal_places=2,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="وزن (تن)",
    )
    vehicle_type = models.CharField(
        max_length=40,
        choices=Vehicle._meta.get_field("kind").choices,
        verbose_name="نوع خودرو",
    )
    cargo_value = models.PositiveBigIntegerField(
        default=0, verbose_name="ارزش بار (تومان)"
    )
    price = models.PositiveBigIntegerField(
        validators=[MinValueValidator(1000)], verbose_name="کرایه (تومان)"
    )
    pickup_date = models.DateField(verbose_name="تاریخ بارگیری")
    notes = models.TextField(blank=True, max_length=2000, verbose_name="توضیحات")
    cargo_type = models.CharField(max_length=80, blank=True, default="", verbose_name="نوع کالا")
    packaging = models.CharField(
        max_length=80, blank=True, default="", verbose_name="بسته‌بندی"
    )
    package_count = models.PositiveIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1)],
        verbose_name="تعداد بسته",
    )
    length_m = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="طول (متر)",
    )
    width_m = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="عرض (متر)",
    )
    height_m = models.DecimalField(
        max_digits=6,
        decimal_places=2,
        null=True,
        blank=True,
        validators=[MinValueValidator(Decimal("0.01"))],
        verbose_name="ارتفاع (متر)",
    )
    urgency = models.CharField(
        max_length=12,
        blank=True,
        default="",
        choices=[("", "نامشخص"), ("urgent", "فوری"), ("scheduled", "با فرصت")],
        verbose_name="فوریت",
    )
    pickup_window = models.CharField(
        max_length=60,
        blank=True,
        default="",
        verbose_name="بازه‌های بارگیری",
    )
    loading_method = models.CharField(
        max_length=40, blank=True, default="", verbose_name="روش بارگیری"
    )
    unloading_method = models.CharField(
        max_length=40, blank=True, default="", verbose_name="روش تخلیه"
    )
    recipient_national_id = models.CharField(
        max_length=10, blank=True, default="", verbose_name="کد ملی گیرنده"
    )
    recipient_postal_code = models.CharField(
        max_length=10, blank=True, default="", verbose_name="کد پستی گیرنده"
    )
    insurance_requested = models.BooleanField(
        default=False, verbose_name="درخواست بیمه"
    )
    cargo_note = models.CharField(
        max_length=200, blank=True, default="", verbose_name="توضیح نوع کالا"
    )
    origin_zone = models.CharField(
        max_length=80, blank=True, default="", verbose_name="محدوده مبدأ"
    )
    destination_zone = models.CharField(
        max_length=80, blank=True, default="", verbose_name="محدوده مقصد"
    )
    origin_lat = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="عرض مبدأ"
    )
    origin_lng = models.DecimalField(
        max_digits=9, decimal_places=6, null=True, blank=True, verbose_name="طول مبدأ"
    )
    destination_lat = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="عرض مقصد",
    )
    destination_lng = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        null=True,
        blank=True,
        verbose_name="طول مقصد",
    )
    trailer_type = models.CharField(
        max_length=40, blank=True, default="", verbose_name="نوع گاری"
    )
    requires_inspector = models.BooleanField(
        default=False, verbose_name="بار حساس"
    )
    cancel_reason = models.CharField(
        max_length=1000, blank=True, default="", verbose_name="دلیل لغو"
    )
    operator_price = models.PositiveBigIntegerField(
        null=True, blank=True, verbose_name="قیمت پیشنهادی اپراتور"
    )
    price_status = models.CharField(
        max_length=12,
        blank=True,
        default="",
        choices=[
            ("", "بدون پیشنهاد"),
            ("proposed", "پیشنهاد شده"),
            ("accepted", "تأیید شد"),
            ("rejected", "رد شد"),
        ],
        verbose_name="وضعیت قیمت اپراتور",
    )
    hold_resume = models.CharField(
        max_length=20, blank=True, default="", verbose_name="وضعیت پیش از توقف"
    )
    status = models.CharField(
        max_length=20,
        choices=Status.choices,
        default=Status.PENDING,
        db_index=True,
        verbose_name="وضعیت",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "بار"
        verbose_name_plural = "بارها"
        ordering = ["-created_at"]
        indexes = [models.Index(fields=["origin", "destination", "status"])]
        constraints = [
            models.CheckConstraint(
                condition=models.Q(weight__gt=0), name="shipment_positive_weight"
            ),
            models.CheckConstraint(
                condition=models.Q(price__gte=1000), name="shipment_min_price"
            ),
        ]

    def __str__(self):
        return self.title


class Offer(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="offers",
        verbose_name="بار",
    )
    driver = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="راننده")
    amount = models.PositiveBigIntegerField(
        validators=[MinValueValidator(1000)], verbose_name="مبلغ (تومان)"
    )
    note = models.CharField(max_length=500, blank=True, verbose_name="یادداشت")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "پیشنهاد حمل"
        verbose_name_plural = "پیشنهادهای حمل"
        constraints = [
            models.UniqueConstraint(
                fields=["shipment", "driver"], name="one_offer_per_driver"
            )
        ]

    def __str__(self):
        return f"پیشنهاد حمل {self.pk}"


class ShipmentEvent(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="events",
        verbose_name="بار",
    )
    actor = models.ForeignKey(
        User, on_delete=models.PROTECT, verbose_name="کاربر انجام‌دهنده"
    )
    status = models.CharField(max_length=20, verbose_name="وضعیت بار")
    note = models.CharField(max_length=1000, blank=True, verbose_name="یادداشت")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "رویداد بار"
        verbose_name_plural = "رویدادهای بار"
        ordering = ["created_at"]

    def __str__(self):
        return f"رویداد بار {self.pk}"


class Inspection(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="inspections",
        verbose_name="بار",
    )
    inspector = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="متصدی")
    stage = models.CharField(
        max_length=12,
        choices=[("loading", "بارگیری"), ("delivery", "تحویل")],
        verbose_name="مرحله",
    )
    packaging_ok = models.BooleanField(verbose_name="بسته‌بندی مناسب")
    weight_ok = models.BooleanField(verbose_name="وزن تأیید شد")
    vehicle_ok = models.BooleanField(verbose_name="خودرو مناسب")
    seal_number = models.CharField(max_length=60, verbose_name="شمارهٔ پلمب")
    notes = models.TextField(max_length=2000, blank=True, verbose_name="توضیحات")
    passed = models.BooleanField(default=False, verbose_name="بازرسی تأیید شد")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "بازرسی"
        verbose_name_plural = "بازرسی‌ها"
        ordering = ["-created_at"]

    def __str__(self):
        return f"بازرسی {self.pk}"


def document_path(instance, filename):
    return f"documents/{instance.shipment_id}/{uuid.uuid4().hex}.{filename.rsplit('.', 1)[-1].lower()}"


class Document(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="documents",
        verbose_name="بار",
    )
    uploaded_by = models.ForeignKey(
        User, on_delete=models.PROTECT, verbose_name="بارگذاری‌کننده"
    )
    name = models.CharField(max_length=180, verbose_name="نام سند")
    file = models.FileField(upload_to=document_path, verbose_name="فایل")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "سند بار"
        verbose_name_plural = "اسناد بار"

    def __str__(self):
        return self.name


class Invoice(models.Model):
    shipment = models.OneToOneField(
        Shipment,
        on_delete=models.PROTECT,
        related_name="invoice",
        verbose_name="بار",
    )
    amount = models.PositiveBigIntegerField(verbose_name="مبلغ (تومان)")
    status = models.CharField(
        max_length=12,
        choices=[("unpaid", "پرداخت نشده"), ("paid", "تسویه شده")],
        default="unpaid",
        verbose_name="وضعیت",
    )
    reference = models.CharField(max_length=100, blank=True, verbose_name="شمارهٔ مرجع")
    paid_at = models.DateTimeField(null=True, blank=True, verbose_name="زمان پرداخت")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "صورتحساب"
        verbose_name_plural = "صورتحساب‌ها"

    def __str__(self):
        return f"صورتحساب {self.pk}"


class Ticket(models.Model):
    user = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="tickets", verbose_name="کاربر"
    )
    subject = models.CharField(max_length=140, verbose_name="موضوع")
    priority = models.CharField(
        max_length=12,
        choices=[("normal", "عادی"), ("urgent", "فوری")],
        default="normal",
        verbose_name="اولویت",
    )
    status = models.CharField(
        max_length=12,
        choices=[("open", "باز"), ("closed", "بسته")],
        default="open",
        verbose_name="وضعیت",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "درخواست پشتیبانی"
        verbose_name_plural = "درخواست‌های پشتیبانی"
        ordering = ["-updated_at"]

    def __str__(self):
        return self.subject


class TicketMessage(models.Model):
    ticket = models.ForeignKey(
        Ticket,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="درخواست پشتیبانی",
    )
    author = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="نویسنده")
    body = models.TextField(max_length=4000, verbose_name="متن")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "پیام پشتیبانی"
        verbose_name_plural = "پیام‌های پشتیبانی"
        ordering = ["created_at"]

    def __str__(self):
        return f"پیام پشتیبانی {self.pk}"


class ShipmentRating(models.Model):
    shipment = models.OneToOneField(
        Shipment,
        on_delete=models.CASCADE,
        related_name="rating",
        verbose_name="بار",
    )
    driver_score = models.PositiveSmallIntegerField(
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="امتیاز راننده",
    )
    inspector_score = models.PositiveSmallIntegerField(
        null=True,
        blank=True,
        validators=[MinValueValidator(1), MaxValueValidator(5)],
        verbose_name="امتیاز متصدی",
    )
    comment = models.CharField(max_length=1000, blank=True, verbose_name="نظر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "امتیاز محموله"
        verbose_name_plural = "امتیازهای محموله"

    def __str__(self):
        return f"امتیاز {self.shipment_id}"


class Complaint(models.Model):
    class Type(models.TextChoices):
        DRIVER = "driver", "راننده"
        INSPECTOR = "dispatcher", "متصدی"
        CARGO = "cargo", "آسیب به کالا"
        DELAY = "delay", "تأخیر در حمل"
        OTHER = "other", "سایر موارد"

    class Status(models.TextChoices):
        PENDING = "pending", "در بررسی"
        REVIEWED = "reviewed", "بررسی شد"
        RESOLVED = "resolved", "حل شد"
        REJECTED = "rejected", "رد شد"

    user = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="complaints", verbose_name="کاربر"
    )
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.PROTECT,
        null=True,
        blank=True,
        related_name="complaints",
        verbose_name="بار",
    )
    type = models.CharField(max_length=20, choices=Type.choices, verbose_name="موضوع")
    description = models.TextField(max_length=4000, verbose_name="شرح")
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.PENDING,
        verbose_name="وضعیت",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "شکایت"
        verbose_name_plural = "شکایت‌ها"
        ordering = ["-updated_at"]

    def __str__(self):
        return f"شکایت {self.pk}"


class ComplaintMessage(models.Model):
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="شکایت",
    )
    author = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="نویسنده")
    body = models.TextField(max_length=4000, verbose_name="متن")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "پیام شکایت"
        verbose_name_plural = "پیام‌های شکایت"
        ordering = ["created_at"]

    def __str__(self):
        return f"پیام شکایت {self.pk}"


def complaint_photo_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    return f"complaints/{instance.complaint_id}/{uuid.uuid4().hex}.{ext}"


class ComplaintPhoto(models.Model):
    complaint = models.ForeignKey(
        Complaint,
        on_delete=models.CASCADE,
        related_name="photos",
        verbose_name="شکایت",
    )
    uploaded_by = models.ForeignKey(
        User, on_delete=models.PROTECT, verbose_name="بارگذاری‌کننده"
    )
    file = models.FileField(upload_to=complaint_photo_path, verbose_name="تصویر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "مدرک شکایت"
        verbose_name_plural = "مدارک شکایت"

    def __str__(self):
        return f"مدرک شکایت {self.pk}"


class ShipmentMessage(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="messages",
        verbose_name="بار",
    )
    author = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="نویسنده")
    body = models.TextField(max_length=2000, verbose_name="متن")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "گفتگوی بار"
        verbose_name_plural = "گفتگوهای بار"
        ordering = ["created_at"]

    def __str__(self):
        return f"گفتگوی بار {self.pk}"


class OwnerIdentity(models.Model):
    class Kind(models.TextChoices):
        NATIONAL = "national_card", "کارت ملی"
        BIRTH = "birth_certificate", "شناسنامه"

    class Status(models.TextChoices):
        MISSING = "missing", "ارسال نشده"
        PENDING = "pending", "در انتظار بررسی"
        APPROVED = "approved", "تأیید شد"
        REJECTED = "rejected", "رد شد"

    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="owner_identity",
        verbose_name="صاحب بار",
    )
    id_type = models.CharField(
        max_length=20, choices=Kind.choices, verbose_name="نوع مدرک"
    )
    status = models.CharField(
        max_length=12,
        choices=Status.choices,
        default=Status.MISSING,
        verbose_name="وضعیت",
    )
    note = models.CharField(max_length=500, blank=True, verbose_name="یادداشت بررسی")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "احراز صاحب بار"
        verbose_name_plural = "احراز صاحب‌های بار"

    def __str__(self):
        return f"احراز {self.user_id}"


def owner_kyc_path(instance, filename):
    ext = filename.rsplit(".", 1)[-1].lower()
    return f"owner-kyc/{instance.identity_id}/{uuid.uuid4().hex}.{ext}"


class OwnerKycFile(models.Model):
    class Slot(models.TextChoices):
        DOCUMENT = "document", "مدرک"
        SELFIE = "selfie", "سلفی با مدرک"

    identity = models.ForeignKey(
        OwnerIdentity,
        on_delete=models.CASCADE,
        related_name="files",
        verbose_name="احراز",
    )
    slot = models.CharField(max_length=20, choices=Slot.choices, verbose_name="بخش")
    file = models.FileField(upload_to=owner_kyc_path, verbose_name="فایل")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "مدرک صاحب بار"
        verbose_name_plural = "مدارک صاحب بار"
        constraints = [
            models.UniqueConstraint(
                fields=["identity", "slot"], name="one_owner_kyc_slot"
            )
        ]

    def __str__(self):
        return f"{self.identity_id} {self.slot}"


class Notification(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="کاربر")
    title = models.CharField(max_length=180, verbose_name="عنوان")
    body = models.CharField(max_length=500, blank=True, default="", verbose_name="متن")
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        verbose_name="بار",
    )
    read = models.BooleanField(default=False, verbose_name="خوانده‌شده")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "اعلان"
        verbose_name_plural = "اعلان‌ها"
        ordering = ["-created_at"]

    def __str__(self):
        return self.title


class AuditLog(models.Model):
    actor = models.ForeignKey(
        User, on_delete=models.PROTECT, null=True, verbose_name="کاربر انجام‌دهنده"
    )
    action = models.CharField(max_length=80, verbose_name="عملیات")
    object_id = models.CharField(max_length=60, verbose_name="شناسهٔ رکورد")
    detail = models.JSONField(default=dict, verbose_name="جزئیات")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "رویداد نظارتی"
        verbose_name_plural = "رویدادهای نظارتی"
        ordering = ["-created_at"]

    def __str__(self):
        return f"رویداد نظارتی {self.pk}"


class ContactRequest(models.Model):
    name = models.CharField(max_length=100, verbose_name="نام")
    phone = models.CharField(
        max_length=11,
        validators=[RegexValidator(r"^09\d{9}$")],
        verbose_name="شمارهٔ همراه",
    )
    message = models.TextField(max_length=2000, verbose_name="پیام")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "پیام تماس"
        verbose_name_plural = "پیام‌های تماس"

    def __str__(self):
        return self.name


class LocationPing(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.CASCADE,
        related_name="locations",
        verbose_name="بار",
    )
    driver = models.ForeignKey(User, on_delete=models.PROTECT, verbose_name="راننده")
    latitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-90), MaxValueValidator(90)],
        verbose_name="عرض جغرافیایی",
    )
    longitude = models.DecimalField(
        max_digits=9,
        decimal_places=6,
        validators=[MinValueValidator(-180), MaxValueValidator(180)],
        verbose_name="طول جغرافیایی",
    )
    accuracy = models.PositiveIntegerField(
        default=0,
        validators=[MaxValueValidator(100000)],
        verbose_name="دقت (متر)",
    )
    observed_at = models.DateTimeField(
        default=timezone.now, verbose_name="زمان ثبت موقعیت"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "موقعیت راننده"
        verbose_name_plural = "موقعیت‌های رانندگان"
        ordering = ["-observed_at", "-created_at"]

    def __str__(self):
        return f"موقعیت {self.pk}"


class DriverProfile(models.Model):
    user = models.OneToOneField(
        User,
        on_delete=models.CASCADE,
        related_name="driver_profile",
        verbose_name="راننده",
    )
    national_id = models.CharField(
        max_length=10, blank=True, db_index=True, verbose_name="کد ملی"
    )
    birth_date = models.DateField(null=True, blank=True, verbose_name="تاریخ تولد")
    license_expiry = models.DateField(
        null=True, blank=True, verbose_name="پایان اعتبار گواهینامه"
    )
    insurance_expiry = models.DateField(
        null=True, blank=True, verbose_name="پایان اعتبار بیمه‌نامه"
    )
    emergency_name = models.CharField(
        max_length=100, blank=True, verbose_name="نام فرد تماس اضطراری"
    )
    emergency_phone = models.CharField(
        max_length=11,
        blank=True,
        validators=[RegexValidator(r"^09\d{9}$")],
        verbose_name="شمارهٔ تماس اضطراری",
    )
    address = models.TextField(max_length=1000, blank=True, verbose_name="نشانی")
    status = models.CharField(
        max_length=12,
        choices=[
            ("draft", "پیش‌نویس"),
            ("submitted", "در انتظار بررسی"),
            ("approved", "تأیید شده"),
            ("rejected", "نیازمند اصلاح"),
        ],
        default="draft",
        verbose_name="وضعیت",
    )
    review_note = models.TextField(
        max_length=2000, blank=True, verbose_name="یادداشت بررسی"
    )
    reviewed_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
        verbose_name="بررسی‌کننده",
    )
    submitted_at = models.DateTimeField(
        null=True, blank=True, verbose_name="زمان ارسال پرونده"
    )
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "پروندهٔ راننده"
        verbose_name_plural = "پرونده‌های رانندگان"

    def __str__(self):
        return f"پروندهٔ {self.user}"


def credential_path(instance, filename):
    return f"credentials/{instance.driver_id}/{uuid.uuid4().hex}.{filename.rsplit('.', 1)[-1].lower()}"


class DriverCredential(models.Model):
    KINDS = [
        ("national_card", "کارت ملی"),
        ("license", "گواهینامه"),
        ("vehicle_card", "کارت خودرو"),
        ("insurance", "بیمه‌نامه خودرو"),
        ("smart_card", "کارت هوشمند"),
        ("health", "کارت سلامت"),
    ]
    driver = models.ForeignKey(
        User,
        on_delete=models.CASCADE,
        related_name="credentials",
        verbose_name="راننده",
    )
    kind = models.CharField(max_length=20, choices=KINDS, verbose_name="نوع مدرک")
    file = models.FileField(upload_to=credential_path, verbose_name="فایل")
    original_name = models.CharField(
        max_length=180, verbose_name="نام فایل بارگذاری‌شده"
    )
    status = models.CharField(
        max_length=12,
        choices=[
            ("pending", "در انتظار بررسی"),
            ("approved", "تأیید شده"),
            ("rejected", "رد شده"),
        ],
        default="pending",
        verbose_name="وضعیت",
    )
    note = models.CharField(max_length=1000, blank=True, verbose_name="یادداشت")
    uploaded_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان بارگذاری")

    class Meta:
        verbose_name = "مدرک راننده"
        verbose_name_plural = "مدارک رانندگان"
        constraints = [
            models.UniqueConstraint(
                fields=["driver", "kind"], name="one_current_driver_credential"
            )
        ]

    def __str__(self):
        return self.get_kind_display()


class Lead(models.Model):
    name = models.CharField(max_length=120, verbose_name="نام")
    company = models.CharField(max_length=120, blank=True, verbose_name="شرکت")
    phone = models.CharField(
        max_length=11,
        validators=[RegexValidator(r"^09\d{9}$")],
        verbose_name="شمارهٔ همراه",
    )
    stage = models.CharField(
        max_length=20,
        choices=[
            ("new", "جدید"),
            ("qualified", "نیازسنجی"),
            ("proposal", "پیشنهاد ارسال شده"),
            ("won", "تبدیل به مشتری"),
            ("lost", "از دست رفته"),
        ],
        default="new",
        db_index=True,
        verbose_name="مرحله",
    )
    source = models.CharField(max_length=40, default="manual", verbose_name="منبع")
    description = models.TextField(max_length=3000, blank=True, verbose_name="شرح")
    assigned_to = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="leads",
        verbose_name="مسئول",
    )
    contact_request = models.OneToOneField(
        ContactRequest,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        verbose_name="پیام تماس مرتبط",
    )
    created_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
        verbose_name="ثبت‌کننده",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "مشتری بالقوه"
        verbose_name_plural = "مشتریان بالقوه"
        ordering = ["-updated_at"]

    def __str__(self):
        return self.name


class CRMActivity(models.Model):
    lead = models.ForeignKey(
        Lead,
        on_delete=models.CASCADE,
        related_name="activities",
        verbose_name="مشتری بالقوه",
    )
    actor = models.ForeignKey(
        User, on_delete=models.PROTECT, verbose_name="کاربر انجام‌دهنده"
    )
    kind = models.CharField(
        max_length=15,
        choices=[
            ("call", "تماس"),
            ("note", "یادداشت"),
            ("meeting", "جلسه"),
            ("stage", "تغییر مرحله"),
        ],
        default="note",
        verbose_name="نوع",
    )
    body = models.TextField(max_length=3000, verbose_name="متن")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "فعالیت ارتباط با مشتری"
        verbose_name_plural = "فعالیت‌های ارتباط با مشتری"
        ordering = ["-created_at"]

    def __str__(self):
        return f"فعالیت {self.pk}"


class FollowUp(models.Model):
    lead = models.ForeignKey(
        Lead,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="followups",
        verbose_name="مشتری بالقوه",
    )
    shipment = models.ForeignKey(
        Shipment,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        verbose_name="بار",
    )
    title = models.CharField(max_length=180, verbose_name="عنوان")
    assigned_to = models.ForeignKey(
        User,
        on_delete=models.PROTECT,
        related_name="followups",
        verbose_name="مسئول",
    )
    due_at = models.DateTimeField(verbose_name="مهلت پیگیری")
    done = models.BooleanField(default=False, verbose_name="انجام شده")
    completed_at = models.DateTimeField(
        null=True, blank=True, verbose_name="زمان تکمیل"
    )
    created_by = models.ForeignKey(
        User, on_delete=models.PROTECT, related_name="+", verbose_name="ثبت‌کننده"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "پیگیری"
        verbose_name_plural = "پیگیری‌ها"
        ordering = ["done", "due_at"]

    def __str__(self):
        return self.title


class Incident(models.Model):
    shipment = models.ForeignKey(
        Shipment,
        on_delete=models.PROTECT,
        related_name="incidents",
        verbose_name="بار",
    )
    reporter = models.ForeignKey(
        User, on_delete=models.PROTECT, verbose_name="گزارش‌دهنده"
    )
    kind = models.CharField(
        max_length=20,
        choices=[
            ("delay", "تأخیر"),
            ("breakdown", "خرابی خودرو"),
            ("damage", "آسیب بار"),
            ("shortage", "کسری بار"),
            ("other", "سایر"),
        ],
        verbose_name="نوع حادثه",
    )
    severity = models.CharField(
        max_length=10,
        choices=[("normal", "عادی"), ("critical", "بحرانی")],
        default="normal",
        verbose_name="شدت",
    )
    description = models.TextField(max_length=3000, verbose_name="شرح")
    status = models.CharField(
        max_length=15,
        choices=[
            ("open", "باز"),
            ("investigating", "در دست بررسی"),
            ("resolved", "رفع شده"),
        ],
        default="open",
        verbose_name="وضعیت",
    )
    resolution = models.TextField(
        max_length=3000, blank=True, verbose_name="نتیجهٔ رسیدگی"
    )
    resolved_by = models.ForeignKey(
        User,
        null=True,
        blank=True,
        on_delete=models.PROTECT,
        related_name="+",
        verbose_name="رسیدگی‌کننده",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "حادثه"
        verbose_name_plural = "حوادث"
        ordering = ["-created_at"]

    def __str__(self):
        return self.get_kind_display()


class SavedAddress(models.Model):
    user = models.ForeignKey(User, on_delete=models.CASCADE, verbose_name="کاربر")
    label = models.CharField(max_length=100, verbose_name="عنوان نشانی")
    city = models.CharField(max_length=80, verbose_name="شهر")
    address = models.TextField(max_length=1000, verbose_name="نشانی")
    recipient_name = models.CharField(max_length=100, verbose_name="نام گیرنده")
    phone = models.CharField(
        max_length=11,
        validators=[RegexValidator(r"^09\d{9}$")],
        verbose_name="شمارهٔ همراه",
    )

    class Meta:
        verbose_name = "نشانی ذخیره‌شده"
        verbose_name_plural = "نشانی‌های ذخیره‌شده"
        ordering = ["label"]

    def __str__(self):
        return self.label


class PaymentRecord(models.Model):
    invoice = models.ForeignKey(
        Invoice,
        on_delete=models.PROTECT,
        related_name="payments",
        verbose_name="صورتحساب",
    )
    amount = models.PositiveBigIntegerField(
        validators=[MinValueValidator(1)], verbose_name="مبلغ (تومان)"
    )
    reference = models.CharField(max_length=100, verbose_name="شمارهٔ مرجع")
    actor = models.ForeignKey(
        User, on_delete=models.PROTECT, verbose_name="کاربر انجام‌دهنده"
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "پرداخت"
        verbose_name_plural = "پرداخت‌ها"
        constraints = [
            models.UniqueConstraint(
                fields=["invoice", "reference"], name="unique_invoice_payment_reference"
            )
        ]

    def __str__(self):
        return f"پرداخت {self.pk}"


class AccountSecurity(models.Model):
    user = models.OneToOneField(
        User, on_delete=models.CASCADE, related_name="security", verbose_name="کاربر"
    )
    secret = models.TextField(blank=True, verbose_name="کلید امنیتی")
    pending_secret = models.TextField(
        blank=True, verbose_name="کلید در انتظار فعال‌سازی"
    )
    enabled = models.BooleanField(default=False, verbose_name="فعال")
    last_counter = models.BigIntegerField(default=-1, verbose_name="آخرین شمارنده")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "امنیت حساب"
        verbose_name_plural = "امنیت حساب‌ها"

    def __str__(self):
        return f"امنیت حساب {self.user}"


class OutboundEmail(models.Model):
    payload = models.TextField(verbose_name="محتوای پیام")
    status = models.CharField(
        max_length=12,
        choices=[
            ("pending", "در صف"),
            ("sending", "در حال ارسال"),
            ("sent", "ارسال شده"),
            ("failed", "ناموفق"),
        ],
        default="pending",
        db_index=True,
        verbose_name="وضعیت",
    )
    attempts = models.PositiveIntegerField(default=0, verbose_name="تعداد تلاش‌ها")
    next_attempt = models.DateTimeField(
        default=timezone.now, verbose_name="زمان تلاش بعدی"
    )
    last_error = models.CharField(max_length=100, blank=True, verbose_name="آخرین خطا")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")

    class Meta:
        verbose_name = "ایمیل خروجی"
        verbose_name_plural = "ایمیل‌های خروجی"

    def __str__(self):
        return f"ایمیل {self.pk}"


class Article(models.Model):
    title = models.CharField(max_length=180, verbose_name="عنوان")
    slug = models.SlugField(max_length=180, unique=True, verbose_name="نامک")
    summary = models.CharField(max_length=350, verbose_name="خلاصه")
    body = models.TextField(verbose_name="متن")
    category = models.CharField(
        max_length=60, default="راهنمای حمل", verbose_name="دسته‌بندی"
    )
    status = models.CharField(
        max_length=12,
        choices=[("draft", "پیش‌نویس"), ("published", "منتشرشده")],
        default="draft",
        verbose_name="وضعیت",
    )
    published_at = models.DateTimeField(
        null=True, blank=True, verbose_name="زمان انتشار"
    )
    created_by = models.ForeignKey(
        User,
        on_delete=models.SET_NULL,
        null=True,
        related_name="articles",
        verbose_name="ثبت‌کننده",
    )
    created_at = models.DateTimeField(auto_now_add=True, verbose_name="زمان ثبت")
    updated_at = models.DateTimeField(auto_now=True, verbose_name="آخرین تغییر")

    class Meta:
        verbose_name = "مقاله"
        verbose_name_plural = "مقاله‌ها"
        ordering = ["-published_at", "-created_at"]

    def __str__(self):
        return self.title
