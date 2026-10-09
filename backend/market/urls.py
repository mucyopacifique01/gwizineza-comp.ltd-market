# All API paths share one compatibility dispatcher. Existing storefront routes keep
# their /api/... contracts while Django owns all application logic and Supabase data.
from django.urls import re_path
from .views import api_dispatch

urlpatterns = [re_path(r"^(?P<resource>.*)$", api_dispatch)]
