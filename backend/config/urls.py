from django.contrib import admin
from django.urls import include, path
from marketplace.views import health

urlpatterns = [path("admin/", admin.site.urls), path("api/health/", health, name="health"), path("api/", include("marketplace.urls"))]
