import os
from pathlib import Path
from dotenv import load_dotenv

BASE_DIR = Path(__file__).resolve().parent.parent
load_dotenv(BASE_DIR.parent / ".env")
DEBUG = os.getenv("DJANGO_DEBUG", "0") == "1"
SITE_PUBLIC_URL = os.getenv("SITE_URL", "http://127.0.0.1:3001").rstrip("/")
APP_PUBLIC_URL = os.getenv("APP_URL", "").strip().rstrip("/") or SITE_PUBLIC_URL
MULTI_APP = os.getenv("MULTI_APP", "0") == "1"
ROLE_ORIGINS = {
    role: os.getenv(role.upper() + "_URL", default).rstrip("/")
    for role, default in {
        "driver": "http://driver.localhost:3002",
        "owner": "http://owner.localhost:3003",
        "inspector": "http://inspector.localhost:3004",
        "operator": os.getenv("ADMIN_URL", "http://admin.localhost:8001"),
    }.items()
}
SECRET_KEY = os.getenv("DJANGO_SECRET_KEY", "")
if not SECRET_KEY:
    if not DEBUG:
        raise RuntimeError("DJANGO_SECRET_KEY is required")
    SECRET_KEY = "local-development-only-alamut-not-for-production"
ALLOWED_HOSTS = os.getenv(
    "DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1,backend,testserver"
).split(",")
INSTALLED_APPS = [
    "config.apps.AlamutAdminConfig",
    "django.contrib.auth",
    "django.contrib.contenttypes",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "rest_framework",
    "drf_spectacular",
    "logistics",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "logistics.middleware.PrivateAPIHeaders",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "logistics.middleware.HostAccess",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
WSGI_APPLICATION = "config.wsgi.application"
TEMPLATES = [
    {
        "BACKEND": "django.template.backends.django.DjangoTemplates",
        "DIRS": [BASE_DIR / "logistics" / "templates"],
        "APP_DIRS": True,
        "OPTIONS": {
            "context_processors": [
                "django.template.context_processors.request",
                "django.contrib.auth.context_processors.auth",
                "django.contrib.messages.context_processors.messages",
            ]
        },
    }
]
if os.getenv("DB_ENGINE", "mysql") == "sqlite":
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.sqlite3",
            "NAME": BASE_DIR / "db.sqlite3",
        }
    }
else:
    DATABASES = {
        "default": {
            "ENGINE": "django.db.backends.mysql",
            "NAME": os.getenv("MYSQL_DATABASE", "alamut"),
            "USER": os.getenv("MYSQL_USER", "alamut"),
            "PASSWORD": os.getenv("MYSQL_PASSWORD", ""),
            "HOST": os.getenv("MYSQL_HOST", "127.0.0.1"),
            "PORT": os.getenv("MYSQL_PORT", "3306"),
            "OPTIONS": {
                "charset": "utf8mb4",
                "init_command": "SET sql_mode='STRICT_TRANS_TABLES'",
            },
            "CONN_MAX_AGE": 60,
        }
    }
AUTH_USER_MODEL = "logistics.User"
AUTH_PASSWORD_VALIDATORS = [
    {
        "NAME": "django.contrib.auth.password_validation.UserAttributeSimilarityValidator"
    },
    {"NAME": "django.contrib.auth.password_validation.MinimumLengthValidator"},
    {"NAME": "django.contrib.auth.password_validation.CommonPasswordValidator"},
    {"NAME": "django.contrib.auth.password_validation.NumericPasswordValidator"},
]
LANGUAGE_CODE = "fa-ir"
TIME_ZONE = "Asia/Tehran"
USE_I18N = True
USE_TZ = True
STATIC_URL = "/static/"
STATIC_ROOT = BASE_DIR / "staticfiles"
MEDIA_ROOT = BASE_DIR / "media"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"
CSRF_TRUSTED_ORIGINS = os.getenv(
    "CSRF_TRUSTED_ORIGINS", "http://localhost:3001,http://127.0.0.1:3001"
).split(",")
SESSION_COOKIE_HTTPONLY = True
COOKIE_PREFIX = "__Host-" if not DEBUG and (MULTI_APP or APP_PUBLIC_URL != SITE_PUBLIC_URL) else ""
SESSION_COOKIE_NAME = COOKIE_PREFIX + "alamut_session"
CSRF_COOKIE_NAME = COOKIE_PREFIX + "alamut_csrf"
SESSION_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 12
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
SECURE_CONTENT_TYPE_NOSNIFF = True
X_FRAME_OPTIONS = "DENY"
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = os.getenv("SECURE_SSL_REDIRECT", "0") == "1"
SECURE_HSTS_SECONDS = 0 if DEBUG else 31536000
SECURE_HSTS_INCLUDE_SUBDOMAINS = not DEBUG
SECURE_HSTS_PRELOAD = not DEBUG
DATA_UPLOAD_MAX_MEMORY_SIZE = 12 * 1024 * 1024
FILE_UPLOAD_MAX_MEMORY_SIZE = 2 * 1024 * 1024
DEMO_ENABLED = os.getenv("DEMO_ENABLED", "0") == "1"
REST_FRAMEWORK = {
    "EXCEPTION_HANDLER": "logistics.errors.exception_handler",
    "DEFAULT_AUTHENTICATION_CLASSES": [
        "rest_framework.authentication.SessionAuthentication"
    ],
    "DEFAULT_PERMISSION_CLASSES": ["logistics.permissions.RolePermission"],
    "DEFAULT_SCHEMA_CLASS": "drf_spectacular.openapi.AutoSchema",
    "DEFAULT_PAGINATION_CLASS": "rest_framework.pagination.PageNumberPagination",
    "PAGE_SIZE": 30,
    "DEFAULT_THROTTLE_CLASSES": [
        "rest_framework.throttling.AnonRateThrottle",
        "rest_framework.throttling.UserRateThrottle",
    ],
    "DEFAULT_THROTTLE_RATES": {
        "anon": "60/min",
        "user": "300/min",
        "login": "10/min",
        "contact": "5/hour",
    },
}
CACHES = (
    {
        "default": {
            "BACKEND": "django.core.cache.backends.redis.RedisCache",
            "LOCATION": os.environ["REDIS_URL"],
        }
    }
    if os.getenv("REDIS_URL")
    else {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}
)
SECURE_REDIRECT_EXEMPT = [r"^api/health/$"]
SPECTACULAR_SETTINGS = {
    "TITLE": "Alamut Logistics API",
    "DESCRIPTION": "Role-scoped freight operations. Session authentication with CSRF. All money is integer toman.",
    "VERSION": "1.0.0",
    "SERVE_PERMISSIONS": ["rest_framework.permissions.IsAdminUser"],
    "ENUM_NAME_OVERRIDES": {
        "UserRoleEnum": ["owner", "driver", "operator", "inspector"],
        "PublicRoleEnum": ["owner", "driver"],
        "VehicleKindEnum": [
            ("trailer", "تریلی"),
            ("truck", "کامیون"),
            ("pickup", "وانت"),
            ("refrigerated", "یخچال‌دار"),
        ],
    },
}
LOGGING = {
    "version": 1,
    "disable_existing_loggers": False,
    "handlers": {"console": {"class": "logging.StreamHandler"}},
    "root": {"handlers": ["console"], "level": "INFO"},
}
EMAIL_HOST = os.getenv("EMAIL_HOST", "")
EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
EMAIL_HOST_USER = os.getenv("EMAIL_HOST_USER", "")
EMAIL_HOST_PASSWORD = os.getenv("EMAIL_HOST_PASSWORD", "")
EMAIL_USE_TLS = os.getenv("EMAIL_USE_TLS", "1") == "1"
EMAIL_USE_SSL = os.getenv("EMAIL_USE_SSL", "0") == "1"
DEFAULT_FROM_EMAIL = os.getenv("DEFAULT_FROM_EMAIL", "no-reply@localhost")
EMAIL_TIMEOUT = 10
EMAIL_BACKEND = "logistics.mailbackend.OutboxBackend"
EMAIL_FILE_PATH = BASE_DIR.parent / "runtime" / "mail"
PASSWORD_RESET_TIMEOUT = 1800

SECURITY_ENCRYPTION_KEY = os.getenv("SECURITY_ENCRYPTION_KEY", SECRET_KEY)
CSRF_FAILURE_VIEW = "logistics.errors.csrf_failure"
