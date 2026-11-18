import uuid
from urllib.parse import urlsplit

from django.conf import settings
from django.http import JsonResponse


class HostAccess:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if not settings.MULTI_APP:
            return self.get_response(request)
        host = request.get_host().lower()
        origins = {
            urlsplit(origin).netloc: role
            for role, origin in settings.ROLE_ORIGINS.items()
        }
        role = origins.get(host)
        request.portal_role = role
        path = request.path.rstrip("/")
        public_host = urlsplit(settings.SITE_PUBLIC_URL).netloc
        if request.method in {"GET", "HEAD"} and path == "/api/health":
            return self.get_response(request)
        origin = request.headers.get("Origin")
        if request.method not in {"GET", "HEAD", "OPTIONS"} and origin:
            expected = (
                settings.SITE_PUBLIC_URL
                if host == public_host
                else settings.ROLE_ORIGINS.get(role)
            )
            if origin != expected:
                return JsonResponse({"detail": "مبدأ درخواست معتبر نیست."}, status=403)
        if host == public_host:
            read = request.method in {"GET", "HEAD"}
            allowed = (
                read
                and (
                    path in {"/api/auth/csrf", "/api/tracking"}
                    or path == "/api/articles"
                    or path.startswith("/api/articles/")
                )
            ) or (request.method == "POST" and path == "/api/contact")
            if not allowed:
                return JsonResponse({"detail": "مسیر در دسترس نیست."}, status=404)
        elif not role:
            return JsonResponse({"detail": "میزبان درخواست معتبر نیست."}, status=421)
        elif path.startswith("/django-admin") and role != "operator":
            return JsonResponse({"detail": "مسیر در دسترس نیست."}, status=404)
        elif request.user.is_authenticated and request.user.role != role:
            if (
                role == "operator"
                and request.user.is_superuser
                and path.startswith(("/django-admin", "/api/credentials/"))
            ):
                return self.get_response(request)
            return JsonResponse(
                {"detail": "با حساب همین برنامه وارد شوید."}, status=403
            )
        return self.get_response(request)


class PrivateAPIHeaders:
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        request.request_id = uuid.uuid4().hex
        response = self.get_response(request)
        if request.path.startswith("/api/") or request.path.startswith(
            "/django-admin/"
        ):
            if (
                request.path.startswith("/api/")
                and response.status_code >= 400
                and "json" not in response.get("Content-Type", "")
            ):
                from django.http import JsonResponse

                response = JsonResponse(
                    {
                        "detail": "مسیر درخواست پیدا نشد."
                        if response.status_code == 404
                        else "انجام درخواست ممکن نیست؛ دوباره بررسی کنید.",
                        "request_id": request.request_id,
                    },
                    status=response.status_code,
                )
            response["Cache-Control"] = "private, no-store, max-age=0"
            response["X-Robots-Tag"] = "noindex, nofollow, noarchive"
            response["X-Request-ID"] = request.request_id
        return response
