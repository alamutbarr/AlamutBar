from datetime import timedelta
from types import SimpleNamespace
from unittest.mock import patch
from django.db import IntegrityError, OperationalError
from django.test import TestCase, SimpleTestCase
from django.utils import timezone
from rest_framework.test import APIClient
from logistics.models import User, Article, AuditLog
from logistics.errors import exception_handler


class EditorialTests(TestCase):
    def setUp(self):
        self.operator = User.objects.create_user(
            username="editor",
            role="operator",
            phone="09120000121",
            capabilities=["content"],
        )
        self.owner = User.objects.create_user(
            username="reader", role="owner", phone="09120000122"
        )
        self.client = APIClient()
        self.article = Article.objects.create(
            title="راهنمای آزمایشی",
            slug="test-guide",
            summary="خلاصه راهنمای آزمون",
            body="متن راهنمای آزمایشی. " * 30,
            status="draft",
            created_by=self.operator,
        )

    def test_draft_and_future_content_are_not_public(self):
        self.assertEqual(self.client.get("/api/articles/").data["count"], 0)
        self.assertEqual(self.client.get("/api/articles/test-guide/").status_code, 404)
        self.article.status = "published"
        self.article.published_at = timezone.now() + timedelta(days=1)
        self.article.save()
        self.assertEqual(self.client.get("/api/articles/").data["count"], 0)
        self.assertEqual(self.client.get("/api/articles/test-guide/").status_code, 404)

    def test_publish_search_unpublish_and_audit(self):
        self.client.force_authenticate(self.operator)
        r = self.client.patch(
            f"/api/editorial/articles/{self.article.pk}/",
            {"status": "published"},
            format="json",
        )
        self.assertEqual(r.status_code, 200)
        self.assertIsNotNone(r.data["published_at"])
        self.assertNotIn("created_by", r.data)
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/articles/?q=راهنمای").data["count"], 1)
        self.assertEqual(self.client.get("/api/articles/?q=نبودن").data["count"], 0)
        self.assertEqual(self.client.get("/api/articles/test-guide/").status_code, 200)
        self.client.force_authenticate(self.operator)
        self.client.patch(
            f"/api/editorial/articles/{self.article.pk}/",
            {"status": "draft"},
            format="json",
        )
        self.client.force_authenticate(None)
        self.assertEqual(self.client.get("/api/articles/test-guide/").status_code, 404)
        self.assertTrue(AuditLog.objects.filter(action="article.update").exists())

    def test_editorial_requires_content_capability(self):
        self.client.force_authenticate(self.owner)
        self.assertEqual(self.client.get("/api/editorial/articles/").status_code, 403)
        self.operator.capabilities = ["crm"]
        self.operator.save()
        self.client.force_authenticate(self.operator)
        self.assertEqual(self.client.get("/api/editorial/articles/").status_code, 403)
        self.operator.capabilities = ["content"]
        self.operator.save()
        self.assertEqual(self.client.get("/api/editorial/articles/").status_code, 200)
        self.assertEqual(self.client.get("/api/shipments/").status_code, 403)

    def test_short_published_text_and_duplicate_slug_rejected(self):
        self.client.force_authenticate(self.operator)
        r = self.client.patch(
            f"/api/editorial/articles/{self.article.pk}/",
            {"status": "published", "body": "short"},
            format="json",
        )
        self.assertEqual(r.status_code, 400)
        self.assertIn("body", r.data)
        oversized = self.client.patch(
            f"/api/editorial/articles/{self.article.pk}/",
            {"body": "x" * 50001},
            format="json",
        )
        self.assertEqual(oversized.status_code, 400)
        r = self.client.post(
            "/api/editorial/articles/",
            {
                "title": "Duplicate",
                "slug": "test-guide",
                "summary": "summary",
                "body": "Text " * 100,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 400)

    def test_editor_create_is_draft_and_public_read_only(self):
        self.client.force_authenticate(self.operator)
        r = self.client.post(
            "/api/editorial/articles/",
            {
                "title": "New",
                "slug": "new-guide",
                "summary": "Summary",
                "body": "Text " * 100,
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(r.data["status"], "draft")
        self.assertTrue(AuditLog.objects.filter(action="article.create").exists())
        self.assertEqual(
            self.client.delete(f"/api/editorial/articles/{r.data['id']}/").status_code,
            405,
        )
        self.client.force_authenticate(None)
        self.assertEqual(
            self.client.post("/api/articles/", {}, format="json").status_code, 405
        )

    def test_api_missing_route_and_session_errors_are_json(self):
        response = self.client.get("/api/definitely-missing-route/")
        self.assertEqual(response.status_code, 404)
        self.assertIn("application/json", response["Content-Type"])
        self.assertEqual(response.json()["request_id"], response["X-Request-ID"])
        response = self.client.get("/api/auth/me/")
        self.assertEqual(response.data["code"], "not_authenticated")
        self.assertIn("no-store", response["Cache-Control"])


class ErrorContractTests(SimpleTestCase):
    databases = set()

    def test_unexpected_errors_do_not_disclose_internal_messages(self):
        for exc, status, code in [
            (IntegrityError("secret database content"), 409, "conflict"),
            (OperationalError("secret credential"), 503, "service_unavailable"),
            (RuntimeError("private token"), 500, "server_error"),
        ]:
            with (
                self.subTest(status=status),
                patch(
                    "logistics.errors.transaction.get_connection",
                    return_value=SimpleNamespace(in_atomic_block=False),
                ),
            ):
                response = exception_handler(
                    exc, {"request": SimpleNamespace(request_id="test-reference")}
                )
                self.assertEqual(response.status_code, status)
                self.assertEqual(response.data["code"], code)
                self.assertEqual(response.data["request_id"], "test-reference")
                self.assertNotIn(str(exc), str(response.data))
