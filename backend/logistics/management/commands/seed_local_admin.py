import secrets

from django.conf import settings
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from logistics.models import User


class Command(BaseCommand):
    help = "Create a staff test account for this Windows project's local demo database."

    def handle(self, *args, **options):
        db = settings.DATABASES["default"]
        if not (
            settings.DEBUG
            and settings.DEMO_ENABLED
            and db.get("HOST") in {"127.0.0.1", "localhost"}
            and str(db.get("PORT")) == "3307"
        ):
            raise CommandError(
                "Local admin seeding requires the loopback demo database on port 3307."
            )

        username = "admin.demo"
        path = settings.BASE_DIR.parent / "runtime" / "local-admin.txt"
        existing = User.objects.filter(username=username).first()
        if existing:
            password = path.read_text(encoding="utf-8").strip() if path.is_file() else ""
            if existing.is_staff and existing.role == User.Role.OPERATOR and password and existing.check_password(password):
                self.stdout.write(f"Local admin {username} is ready. Password file: {path}")
            else:
                self.stdout.write(self.style.WARNING(
                    f"Existing {username} left intact. Use its current credentials or provision a separate staff account."
                ))
            return

        password = secrets.token_urlsafe(24)
        path.parent.mkdir(exist_ok=True)
        wrote_password = False
        try:
            with transaction.atomic():
                User.objects.create_user(
                    username=username,
                    password=password,
                    phone="09120000006",
                    first_name="مدیر نمونه",
                    role=User.Role.OPERATOR,
                    is_staff=True,
                    is_superuser=False,
                    verified=True,
                )
                with path.open("x", encoding="utf-8") as file:
                    wrote_password = True
                    file.write(password + "\n")
        except (OSError, IntegrityError) as error:
            if wrote_password:
                path.unlink(missing_ok=True)
            raise CommandError(
                "Could not provision the demo admin. Check the local account and password file."
            ) from error
        self.stdout.write(f"Local admin {username} is ready. Password file: {path}")
