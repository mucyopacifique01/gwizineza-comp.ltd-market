import logging

import jwt
from django.conf import settings
from django.contrib.auth import get_user_model
from django.db import transaction
from jwt import InvalidTokenError
from jwt.exceptions import PyJWKClientError
from rest_framework.authentication import BaseAuthentication, get_authorization_header
from rest_framework.exceptions import AuthenticationFailed

from marketplace.models import UserProfile

logger = logging.getLogger(__name__)
User = get_user_model()


class SupabaseJWTAuthentication(BaseAuthentication):
    """Validate Supabase access tokens and map the trusted subject to a Django user.

    User-editable JWT metadata is never used to grant seller, staff, or admin privileges.
    """

    def authenticate(self, request):
        parts = get_authorization_header(request).split()
        if not parts:
            return None
        if parts[0].lower() != b"bearer":
            return None
        if len(parts) != 2:
            raise AuthenticationFailed("Invalid bearer authorization header.")
        token = parts[1].decode("utf-8", errors="ignore")
        if not settings.SUPABASE_URL:
            raise AuthenticationFailed("Supabase authentication is not configured.")

        issuer = f"{settings.SUPABASE_URL}/auth/v1"
        try:
            header = jwt.get_unverified_header(token)
            algorithm = header.get("alg")
            if algorithm in {"ES256", "RS256"}:
                if not settings.SUPABASE_JWKS_URL:
                    raise AuthenticationFailed("Supabase JWT verification is not configured.")
                client = jwt.PyJWKClient(settings.SUPABASE_JWKS_URL, timeout=5)
                key = client.get_signing_key_from_jwt(token).key
                claims = jwt.decode(
                    token,
                    key,
                    algorithms=[algorithm],
                    audience="authenticated",
                    issuer=issuer,
                    options={"require": ["sub", "exp", "iss", "aud"]},
                )
            elif algorithm == "HS256" and settings.SUPABASE_JWT_SECRET:
                claims = jwt.decode(
                    token,
                    settings.SUPABASE_JWT_SECRET,
                    algorithms=["HS256"],
                    audience="authenticated",
                    issuer=issuer,
                    options={"require": ["sub", "exp", "iss", "aud"]},
                )
            else:
                raise AuthenticationFailed("Unsupported Supabase access-token algorithm.")
        except AuthenticationFailed:
            raise
        except (InvalidTokenError, PyJWKClientError, ValueError, OSError) as exc:
            logger.info("Supabase token validation failed (%s).", type(exc).__name__)
            raise AuthenticationFailed("Invalid or expired Supabase access token.") from None
        except Exception as exc:
            logger.warning("Supabase token verification unavailable (%s).", type(exc).__name__)
            raise AuthenticationFailed("Unable to verify Supabase access token.") from None

        subject = str(claims.get("sub", "")).strip()
        if not subject:
            raise AuthenticationFailed("Supabase access token has no subject.")
        email = str(claims.get("email") or "").strip().lower()

        user = self._get_or_create_user(subject, email)
        if not user.is_active:
            raise AuthenticationFailed("This account is disabled.")
        return user, claims

    @staticmethod
    @transaction.atomic
    def _get_or_create_user(subject, email):
        profile = UserProfile.objects.select_related("user").filter(supabase_uid=subject).first()
        if profile:
            return profile.user

        user = User.objects.filter(email__iexact=email).first() if email else None
        if user:
            profile, _ = UserProfile.objects.get_or_create(user=user)
            if profile.supabase_uid and profile.supabase_uid != subject:
                raise AuthenticationFailed("This email is already linked to another identity.")
            profile.supabase_uid = subject
            profile.save(update_fields=["supabase_uid", "updated_at"])
            return user

        username = f"sb_{subject}"[:150]
        user = User.objects.create_user(username=username, email=email, password=None)
        UserProfile.objects.create(user=user, supabase_uid=subject)
        return user

    def authenticate_header(self, request):
        return "Bearer"
