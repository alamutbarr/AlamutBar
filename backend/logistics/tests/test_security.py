import json
from datetime import timedelta
from unittest.mock import patch

import pyotp
from django.contrib.auth.tokens import default_token_generator
from django.core.cache import cache
from django.core.management import call_command
from django.test import TestCase, override_settings
from django.utils import timezone
from django.utils.encoding import force_bytes
from django.utils.http import urlsafe_base64_encode
from rest_framework.test import APIClient

from logistics.models import AccountSecurity, OutboundEmail, User
from logistics.security import decrypt, encrypt


@override_settings(DEBUG=True, EMAIL_BACKEND="logistics.mailbackend.OutboxBackend")
class SecurityTests(TestCase):
    def setUp(self):
        cache.clear()
        self.user = User.objects.create_user(
            username="security-user",
            phone="09120000000",
            password="CurrentSecurity!2026",
            email="fictional@example.invalid",
        )
        self.client = APIClient()
        self.client.force_authenticate(self.user)

    def post(self, path, data):
        return self.client.post("/api/" + path, data, format="json")

    def setup_mfa(self):
        r = self.post("security/mfa/setup/", {"password": "CurrentSecurity!2026"})
        self.assertEqual(r.status_code, 200)
        return r.data["secret"]

    def test_setup_requires_current_password(self):
        self.assertEqual(
            self.post("security/mfa/setup/", {"password": "bad"}).status_code, 400
        )

    def test_secret_encrypted_at_rest(self):
        secret = self.setup_mfa()
        obj = AccountSecurity.objects.get(user=self.user)
        self.assertNotIn(secret, obj.pending_secret)
        self.assertEqual(decrypt(obj.pending_secret), secret)

    @patch("logistics.security.time.time", return_value=1800000000)
    def test_enable_and_login_replay_protection(self, clock):
        secret = self.setup_mfa()
        code = pyotp.TOTP(secret).at(1800000000)
        self.assertEqual(
            self.post("security/mfa/enable/", {"code": code}).status_code, 200
        )
        self.client.force_authenticate(None)
        token = self.client.get("/api/auth/csrf/").data["csrfToken"]

        def login(code):
            return self.client.post(
                "/api/auth/login/",
                {
                    "username": self.user.username,
                    "password": "CurrentSecurity!2026",
                    "code": code,
                },
                format="json",
                HTTP_X_CSRFTOKEN=token,
            )

        self.assertEqual(login("").status_code, 400)
        self.assertEqual(login(code).status_code, 400)
        new = pyotp.TOTP(secret).at(1800000030)
        self.assertEqual(login(new).status_code, 200)

    def test_wrong_activation_code(self):
        self.setup_mfa()
        self.assertEqual(
            self.post("security/mfa/enable/", {"code": "bad"}).status_code, 400
        )

    def test_enable_without_setup(self):
        self.assertEqual(
            self.post("security/mfa/enable/", {"code": "123456"}).status_code, 400
        )

    @patch("logistics.security.time.time", return_value=1800000000)
    def test_disable_requires_password_and_fresh_code(self, clock):
        secret = self.setup_mfa()
        self.post("security/mfa/enable/", {"code": pyotp.TOTP(secret).at(1800000000)})
        self.assertEqual(
            self.post(
                "security/mfa/disable/", {"password": "bad", "code": "123456"}
            ).status_code,
            400,
        )
        self.assertEqual(
            self.post(
                "security/mfa/disable/",
                {
                    "password": "CurrentSecurity!2026",
                    "code": pyotp.TOTP(secret).at(1800000030),
                },
            ).status_code,
            200,
        )
        self.assertFalse(AccountSecurity.objects.get(user=self.user).enabled)

    @override_settings(APP_PUBLIC_URL="https://app.example.invalid")
    def test_recovery_response_does_not_disclose_account(self):
        a = self.post("auth/recovery/", {"email": "fictional@example.invalid"})
        b = self.post("auth/recovery/", {"email": "nonexistent@example.invalid"})
        self.assertEqual(a.status_code, 200)
        self.assertEqual(a.data, b.data)
        self.assertEqual(OutboundEmail.objects.count(), 1)
        obj = OutboundEmail.objects.get()
        self.assertNotIn(self.user.email, obj.payload)
        self.assertIn(
            "https://app.example.invalid/recover?uid=",
            json.loads(decrypt(obj.payload))["body"],
        )

    def test_recovery_token_single_use(self):
        token = default_token_generator.make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.client.force_authenticate(None)
        data = {"uid": uid, "token": token, "new_password": "BlueRiver!4092"}
        r = self.post("auth/recovery/confirm/", data)
        self.assertEqual(r.status_code, 200, r.data)
        self.assertEqual(self.post("auth/recovery/confirm/", data).status_code, 400)

    def test_invalid_recovery_token(self):
        self.assertEqual(
            self.post(
                "auth/recovery/confirm/",
                {"uid": "bad", "token": "bad", "new_password": "BlueRiver!4092"},
            ).status_code,
            400,
        )

    def test_weak_recovery_password_rejected(self):
        token = default_token_generator.make_token(self.user)
        uid = urlsafe_base64_encode(force_bytes(self.user.pk))
        self.assertEqual(
            self.post(
                "auth/recovery/confirm/",
                {"uid": uid, "token": token, "new_password": "123"},
            ).status_code,
            400,
        )

    @patch("django.core.mail.EmailMessage.send", return_value=1)
    def test_outbox_delivery_clears_sensitive_payload(self, mock_send):
        OutboundEmail.objects.create(
            payload=encrypt(
                json.dumps(
                    {
                        "subject": "Test recovery",
                        "body": "Fictional recovery link",
                        "from_email": "no-reply@example.invalid",
                        "to": [self.user.email],
                    }
                )
            )
        )
        call_command("deliver_outbox", limit=1)
        obj = OutboundEmail.objects.get()
        self.assertEqual(obj.status, "sent")
        self.assertEqual(obj.payload, "")
        mock_send.assert_called_once()

    @patch("django.core.mail.EmailMessage.send", side_effect=OSError("network"))
    def test_outbox_failure_retries_without_leaking_details(self, mock_send):
        OutboundEmail.objects.create(
            payload=encrypt(
                json.dumps(
                    {
                        "subject": "Test recovery",
                        "body": "Fictional recovery link",
                        "from_email": "no-reply@example.invalid",
                        "to": [self.user.email],
                    }
                )
            )
        )
        call_command("deliver_outbox", limit=1)
        obj = OutboundEmail.objects.get()
        self.assertEqual(obj.status, "pending")
        self.assertEqual(obj.attempts, 1)
        self.assertEqual(obj.last_error, "OSError")

    @override_settings(PASSWORD_RESET_TIMEOUT=1800)
    @patch("django.core.mail.EmailMessage.send")
    def test_outbox_discards_expired_recovery_payload(self, send):
        obj = OutboundEmail.objects.create(payload=encrypt("fictional expired data"))
        OutboundEmail.objects.filter(pk=obj.pk).update(
            created_at=timezone.now() - timedelta(minutes=31)
        )
        call_command("deliver_outbox", limit=1)
        obj.refresh_from_db()
        self.assertEqual(
            (obj.status, obj.payload, obj.last_error), ("failed", "", "ExpiredRecovery")
        )
        send.assert_not_called()

    def test_stale_sender_cannot_overwrite_reclaimed_lease(self):
        obj = OutboundEmail.objects.create(
            payload=encrypt(
                json.dumps(
                    {
                        "subject": "Test",
                        "body": "Fictional",
                        "from_email": "sender@example.invalid",
                        "to": [self.user.email],
                    }
                )
            )
        )

        def reclaimed(**_options):
            OutboundEmail.objects.filter(pk=obj.pk).update(attempts=2)
            return 1

        with patch("django.core.mail.EmailMessage.send", side_effect=reclaimed):
            call_command("deliver_outbox", limit=1)
        obj.refresh_from_db()
        self.assertEqual((obj.status, obj.attempts), ("sending", 2))
        self.assertTrue(obj.payload)
