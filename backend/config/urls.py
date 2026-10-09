from django.http import JsonResponse
from django.urls import path
from store.views import dispatch

def api_root(_request):
    return JsonResponse({"service": "Gwizineza Django API", "database": "Supabase PostgreSQL", "authentication": "Supabase email/phone OTP"})

urlpatterns = [
    path("api/", api_root),
    path("api/<path:api_path>", dispatch),
]
