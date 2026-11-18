"""Stable API failures without leaking database errors or server tracebacks."""

import logging
import uuid
from django.db import IntegrityError, OperationalError, transaction
from django.http import JsonResponse
from rest_framework.response import Response
from rest_framework.views import exception_handler as drf_exception_handler

logger = logging.getLogger(__name__)


def exception_handler(exc, context):
    response = drf_exception_handler(exc, context)
    if response is not None:
        if isinstance(response.data, dict) and hasattr(exc, "get_codes"):
            code = exc.get_codes()
            if isinstance(code, str):
                response.data.setdefault("code", code)
        return response
    request = context.get("request")
    request_id = getattr(request, "request_id", uuid.uuid4().hex)
    if transaction.get_connection().in_atomic_block:
        transaction.set_rollback(True)
    if isinstance(exc, IntegrityError):
        return Response(
            {
                "detail": "این اطلاعات قبلاً ثبت شده یا با وضعیت فعلی ناسازگار است؛ اطلاعات را تازه و بررسی کنید.",
                "code": "conflict",
                "request_id": request_id,
            },
            status=409,
        )
    if isinstance(exc, OperationalError):
        logger.error(
            "API database unavailable request_id=%s exception=%s",
            request_id,
            type(exc).__name__,
        )
        return Response(
            {
                "detail": "سرویس موقتاً در دسترس نیست. وضعیت درخواست را پیش از ثبت دوباره بررسی کنید.",
                "code": "service_unavailable",
                "request_id": request_id,
            },
            status=503,
        )
    logger.error(
        "Unhandled API failure request_id=%s exception=%s",
        request_id,
        type(exc).__name__,
    )
    return Response(
        {
            "detail": "پردازش درخواست انجام نشد. برای پیگیری، کد خطا را به پشتیبانی بدهید.",
            "code": "server_error",
            "request_id": request_id,
        },
        status=500,
    )


def csrf_failure(request, reason=""):
    return JsonResponse(
        {
            "detail": "اعتبار نشست یا فرم منقضی شده است؛ صفحه را تازه کنید و دوباره تلاش کنید.",
            "code": "csrf_failed",
        },
        status=403,
    )
