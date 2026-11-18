from io import StringIO
from unittest.mock import patch

from django.core.management import call_command
from django.core.management.base import CommandError
from django.test import TestCase

from logistics.models import User


class PortalStaffTests(TestCase):
    def create_staff(self, role="operator", **overrides):
        fields = {
            "username": "release.staff",
            "phone": "09120002001",
            "email": "release@example.invalid",
            "first_name": "Release",
            "last_name": "Staff",
            **overrides,
        }
        with (
            patch("sys.stdin.isatty", return_value=True),
            patch("getpass.getpass", return_value="PrivateFixture42!"),
        ):
            call_command("create_portal_staff", role, stdout=StringIO(), **fields)

    def test_operator_has_only_requested_capabilities_and_no_django_admin_access(self):
        self.create_staff(capability=["dispatch"])
        user = User.objects.get(username="release.staff")
        self.assertTrue(user.check_password("PrivateFixture42!"))
        self.assertEqual(user.role, User.Role.OPERATOR)
        self.assertEqual(user.capabilities, ["dispatch"])
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)

    def test_inspector_cannot_receive_operator_capabilities(self):
        with self.assertRaises(CommandError):
            self.create_staff("inspector", capability=["finance"])
        self.create_staff("inspector")
        self.assertEqual(User.objects.get(username="release.staff").capabilities, [])

    def test_duplicate_phone_cannot_overwrite_existing_staff(self):
        self.create_staff()
        with self.assertRaises(CommandError):
            self.create_staff("inspector", username="second.staff")
        self.assertFalse(User.objects.filter(username="second.staff").exists())
