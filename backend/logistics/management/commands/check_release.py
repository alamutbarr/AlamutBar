import os
from urllib.parse import urlsplit

from django.conf import settings
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.core.validators import validate_email


class Command(BaseCommand):
    help = "Validate production origins, secrets and services before starting Compose."

    def add_arguments(self, parser):
        parser.add_argument("--require-mail", action="store_true")

    def handle(self, *args, **options):
        problems = []
        if settings.DEBUG or settings.DEMO_ENABLED or not settings.SECURE_SSL_REDIRECT:
            problems.append(
                "Set DJANGO_DEBUG=0, DEMO_ENABLED=0 and SECURE_SSL_REDIRECT=1."
            )
        origins = (settings.SITE_PUBLIC_URL, *settings.ROLE_ORIGINS.values()) if settings.MULTI_APP else (settings.SITE_PUBLIC_URL, settings.APP_PUBLIC_URL)
        try:
            parsed = tuple(urlsplit(origin) for origin in origins)
            hosts = {origin.hostname for origin in parsed}
            if len(hosts) != len(origins) or any(
                origin.scheme != "https"
                or not origin.hostname
                or origin.username is not None
                or origin.path
                or origin.query
                or origin.fragment
                for origin in parsed
            ):
                raise ValueError
            if "*" in settings.ALLOWED_HOSTS or not (
                hosts | {"backend", "127.0.0.1"}
            ).issubset(settings.ALLOWED_HOSTS):
                problems.append(
                    "Allow all configured domain names, backend and 127.0.0.1 in DJANGO_ALLOWED_HOSTS."
                )
            if not set(origins).issubset(settings.CSRF_TRUSTED_ORIGINS) or any(
                "*" in origin for origin in settings.CSRF_TRUSTED_ORIGINS
            ):
                problems.append(
                    "Add all exact HTTPS origins to CSRF_TRUSTED_ORIGINS without wildcards."
                )
        except ValueError:
            problems.append("Set public and application URLs to distinct HTTPS origins with distinct hostnames.")

        database = settings.DATABASES["default"]
        if database["ENGINE"] != "django.db.backends.mysql":
            problems.append("Use MySQL for the Compose release.")
        secrets = {
            "DJANGO_SECRET_KEY": (settings.SECRET_KEY, 50),
            "SECURITY_ENCRYPTION_KEY": (settings.SECURITY_ENCRYPTION_KEY, 32),
            "MYSQL_PASSWORD": (database.get("PASSWORD", ""), 16),
            "MYSQL_ROOT_PASSWORD": (os.getenv("MYSQL_ROOT_PASSWORD", ""), 16),
        }
        for name, (value, minimum) in secrets.items():
            if len(value) < minimum or value.startswith("replace-with-"):
                problems.append(
                    f"Set an independent random {name} of at least {minimum} characters."
                )
        if len({value for value, _ in secrets.values()}) != len(secrets):
            problems.append("Use different values for the four secrets.")

        if options["require_mail"] and not settings.EMAIL_HOST:
            problems.append(
                "Configure SMTP and a verified DEFAULT_FROM_EMAIL for password recovery."
            )
        if settings.EMAIL_HOST and settings.EMAIL_USE_TLS == settings.EMAIL_USE_SSL:
            problems.append(
                "Select exactly one of EMAIL_USE_TLS and EMAIL_USE_SSL for production SMTP."
            )
        if settings.EMAIL_HOST:
            try:
                validate_email(settings.DEFAULT_FROM_EMAIL)
                if settings.DEFAULT_FROM_EMAIL == "no-reply@your-domain.example":
                    raise ValidationError("Sample sender")
            except ValidationError:
                problems.append("Set DEFAULT_FROM_EMAIL to a verified sender address.")

        for name in (
            "BUSINESS_OPERATOR_NAME",
            "BUSINESS_RETENTION_NOTICE",
            "BUSINESS_TERMS_NOTICE",
        ):
            if not os.getenv(name, "").strip():
                problems.append(f"Set {name} to the approved public information.")
        try:
            validate_email(os.getenv("BUSINESS_CONTACT_EMAIL", ""))
        except ValidationError:
            problems.append("Set BUSINESS_CONTACT_EMAIL to the public contact email.")

        if problems:
            raise CommandError("\n".join(problems))
        self.stdout.write(self.style.SUCCESS("Production settings passed preflight."))
