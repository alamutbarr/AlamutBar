import getpass
import sys

from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError
from django.db import IntegrityError, transaction

from logistics.models import User, default_capabilities, validate_capabilities


class Command(BaseCommand):
    help = (
        "Create an operator or inspector for the portal with an interactive password."
    )

    def add_arguments(self, parser):
        parser.add_argument("role", choices=[User.Role.OPERATOR, User.Role.INSPECTOR])
        parser.add_argument("--django-admin", action="store_true", help="Allow an operator to log into the Django operations console.")
        for field in ("username", "phone", "email", "first-name", "last-name"):
            parser.add_argument("--" + field, required=True)
        parser.add_argument(
            "--capability", action="append", choices=default_capabilities()
        )

    def handle(self, *args, **options):
        role = options["role"]
        if options["django_admin"] and role != User.Role.OPERATOR:
            raise CommandError("Django administration is only available to operators.")
        capabilities = options["capability"]
        if role == User.Role.INSPECTOR and capabilities:
            raise CommandError(
                "Operator capabilities cannot be assigned to an inspector."
            )
        user = User(
            username=User.normalize_username(options["username"].strip()),
            phone=options["phone"].strip(),
            email=User.objects.normalize_email(options["email"]),
            first_name=options["first_name"].strip(),
            last_name=options["last_name"].strip(),
            role=role,
            capabilities=list(dict.fromkeys(capabilities or default_capabilities()))
            if role == User.Role.OPERATOR
            else [],
            verified=True,
            is_staff=options["django_admin"],
        )
        if not all((user.email, user.first_name, user.last_name)):
            raise CommandError(
                "An email address, first name and last name are required."
            )
        try:
            # Inspectors have an empty list, which the admin form treats as blank.
            user.full_clean(exclude=["password", "capabilities"])
            validate_capabilities(user.capabilities)
        except ValidationError as error:
            raise CommandError("\n".join(error.messages)) from error
        if not sys.stdin.isatty():
            raise CommandError("Use an interactive terminal for the password prompt.")
        password = getpass.getpass("Password: ")
        if password != getpass.getpass("Confirm password: "):
            raise CommandError("Passwords do not match.")
        try:
            validate_password(password, user=user)
        except ValidationError as error:
            raise CommandError("\n".join(error.messages)) from error
        user.set_password(password)
        try:
            with transaction.atomic():
                user.save(force_insert=True)
        except IntegrityError as error:
            raise CommandError(
                "The username or phone number already exists."
            ) from error
        self.stdout.write(
            self.style.SUCCESS(f"Created {role} portal account {user.username}.")
        )
