"""Deliver queued emails. Delivery is at-least-once; recovery links remain single-use."""

import json
import time
from datetime import timedelta

from cryptography.fernet import InvalidToken
from django.conf import settings
from django.core.mail import EmailMessage, get_connection
from django.core.management.base import BaseCommand, CommandError
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from logistics.models import OutboundEmail
from logistics.security import decrypt


class Command(BaseCommand):
    help = "Deliver encrypted recovery outbox with retry. Local DEBUG uses files, production requires SMTP."

    def add_arguments(self, parser):
        parser.add_argument("--loop", action="store_true")
        parser.add_argument("--limit", type=int, default=50)

    def handle(self, *args, **options):
        if not settings.EMAIL_HOST and not settings.DEBUG:
            raise CommandError("SMTP is not configured; nothing was sent.")
        if settings.EMAIL_HOST and settings.EMAIL_USE_TLS and settings.EMAIL_USE_SSL:
            raise CommandError("Choose either SMTP STARTTLS or implicit TLS.")
        backend = (
            "django.core.mail.backends.smtp.EmailBackend"
            if settings.EMAIL_HOST
            else "django.core.mail.backends.filebased.EmailBackend"
        )
        while True:
            now = timezone.now()
            # This outbox contains password-reset messages. Discard expired links.
            expiry = now - timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT)
            OutboundEmail.objects.filter(created_at__lte=expiry).filter(
                Q(status__in=["pending", "failed"])
                | Q(status="sending", next_attempt__lte=now)
            ).exclude(payload="").update(
                status="failed",
                payload="",
                last_error="ExpiredRecovery",
                updated_at=now,
            )
            for _ in range(options["limit"]):
                with transaction.atomic():
                    now = timezone.now()
                    # A crashed sender's lease can be reclaimed after five minutes.
                    obj = (
                        OutboundEmail.objects.select_for_update(skip_locked=True)
                        .filter(
                            status__in=["pending", "sending"], next_attempt__lte=now
                        )
                        .filter(
                            created_at__gt=now
                            - timedelta(seconds=settings.PASSWORD_RESET_TIMEOUT)
                        )
                        .order_by("created_at")
                        .first()
                    )
                    if not obj:
                        break
                    obj.status = "sending"
                    obj.attempts += 1
                    obj.next_attempt = now + timedelta(minutes=5)
                    obj.save()
                    pk = obj.pk
                    payload = obj.payload
                    attempt = obj.attempts
                lease = OutboundEmail.objects.filter(
                    pk=pk, status="sending", attempts=attempt
                )
                try:
                    data = json.loads(decrypt(payload))
                    connection = get_connection(backend=backend)
                    sent = EmailMessage(
                        data["subject"],
                        data["body"],
                        data["from_email"],
                        data["to"],
                        connection=connection,
                    ).send(fail_silently=False)
                    if not sent:
                        raise RuntimeError("DeliveryNotAccepted")
                except (
                    OSError,
                    ValueError,
                    TypeError,
                    KeyError,
                    InvalidToken,
                    RuntimeError,
                ) as exc:
                    lease.update(
                        status="failed" if attempt >= 5 else "pending",
                        last_error=type(exc).__name__[:100],
                        next_attempt=timezone.now()
                        + timedelta(seconds=min(3600, 60 * 2**attempt)),
                        updated_at=timezone.now(),
                    )
                else:
                    lease.update(
                        status="sent",
                        payload="",
                        last_error="",
                        updated_at=timezone.now(),
                    )
            if not options["loop"]:
                break
            time.sleep(10)
