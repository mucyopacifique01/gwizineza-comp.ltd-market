from django.http import JsonResponse
from django.urls import path, re_path
from market.views import api_dispatch


def root(_request):
    return JsonResponse({
        "name": "Gwizineza Market API",
        "backend": "Django",
        "database": "Supabase PostgreSQL",
        "health": "/api/health",
    })


urlpatterns = [
    path("", root),
    re_path(r"^api/(?P<resource>.*)$", api_dispatch),
]
