import os
from pathlib import Path

import dj_database_url

BASE_DIR = Path(__file__).resolve().parent.parent
SECRET_KEY = os.environ.get("DJANGO_SECRET_KEY", "local-only-change-me-before-deploy")
DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = [value.strip() for value in os.environ.get(
    "DJANGO_ALLOWED_HOSTS", ".onrender.com,localhost,127.0.0.1"
).split(",") if value.strip()]

INSTALLED_APPS = [
    "django.contrib.contenttypes",
    "django.contrib.auth",
    "django.contrib.sessions",
    "django.contrib.messages",
    "django.contrib.staticfiles",
    "market.apps.MarketConfig",
]
MIDDLEWARE = [
    "django.middleware.security.SecurityMiddleware",
    "django.contrib.sessions.middleware.SessionMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.csrf.CsrfViewMiddleware",
    "django.contrib.auth.middleware.AuthenticationMiddleware",
    "django.contrib.messages.middleware.MessageMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"
TEMPLATES = [{
    "BACKEND": "django.template.backends.django.DjangoTemplates",
    "DIRS": [],
    "APP_DIRS": True,
    "OPTIONS": {"context_processors": [
        "django.template.context_processors.request",
        "django.contrib.auth.context_processors.auth",
        "django.contrib.messages.context_processors.messages",
    ]},
}]
WSGI_APPLICATION = "config.wsgi.application"
ASGI_APPLICATION = "config.asgi.application"

# DATABASE_URL must be the PostgreSQL connection string copied from Supabase.
# Production requires TLS; local/CI PostgreSQL can opt out with DJANGO_DEBUG=true.
DATABASE_URL = os.environ.get("DATABASE_URL", "postgresql://localhost/gwizineza")
DATABASES = {
    "default": dj_database_url.parse(
        DATABASE_URL,
        conn_max_age=60 if not DEBUG else 0,
        ssl_require=not DEBUG,
    )
}

LANGUAGE_CODE = "en-us"
TIME_ZONE = "Africa/Kigali"
USE_I18N = True
USE_TZ = True
STATIC_URL = "static/"
DEFAULT_AUTO_FIELD = "django.db.models.BigAutoField"

# This first deployment uses Django's schema sync for the market app. Tables are
# created in Supabase PostgreSQL by the deploy start command; no local database
# engine or MongoDB/Prisma path exists in the application.
MIGRATION_MODULES = {"market": None}

SUPABASE_URL = os.environ.get("SUPABASE_URL", os.environ.get("NEXT_PUBLIC_SUPABASE_URL", "")).rstrip("/")
SUPABASE_ANON_KEY = os.environ.get("SUPABASE_ANON_KEY", os.environ.get("NEXT_PUBLIC_SUPABASE_ANON_KEY", ""))
SUPABASE_SERVICE_ROLE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
SUPABASE_STORAGE_BUCKET = os.environ.get("SUPABASE_STORAGE_BUCKET", "product-images")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "")
TEXTBEE_API_KEY = os.environ.get("TEXTBEE_API_KEY", "")
TEXTBEE_DEVICE_ID = os.environ.get("TEXTBEE_DEVICE_ID", "")
SUPABASE_SEND_SMS_HOOK_SECRET = os.environ.get("SUPABASE_SEND_SMS_HOOK_SECRET", "")

SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SESSION_COOKIE_SECURE = not DEBUG
CSRF_COOKIE_SECURE = not DEBUG
X_FRAME_OPTIONS = "DENY"
SECURE_CONTENT_TYPE_NOSNIFF = True
SECURE_REFERRER_POLICY = "strict-origin-when-cross-origin"
