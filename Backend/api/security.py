"""Auth for Vercel ↔ Render: shared API key and/or admin JWT."""

from __future__ import annotations

import os
from typing import Any

import jwt
from fastapi import Header, HTTPException, status


def _extract_bearer(authorization: str | None) -> str | None:
    if not authorization:
        return None
    if authorization.lower().startswith("bearer "):
        return authorization[7:].strip()
    return authorization.strip()


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    """
    Accept either:
    - BACKEND_API_KEY (service-to-service from Vercel), or
    - Admin user JWT signed with JWT_SECRET (browser direct uploads).
    If neither secret is configured, allow (local/dev).
    """
    token = _extract_bearer(authorization)
    api_key = os.environ.get("BACKEND_API_KEY", "").strip()
    jwt_secret = os.environ.get("JWT_SECRET", "").strip()

    if not api_key and not jwt_secret:
        return

    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    if api_key and token == api_key:
        return

    if jwt_secret:
        try:
            payload: dict[str, Any] = jwt.decode(
                token,
                jwt_secret,
                algorithms=["HS256"],
            )
            if payload.get("role") == "admin":
                return
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Admin access required",
            )
        except jwt.PyJWTError as exc:
            # Fall through if API key also unset/mismatch
            if not api_key:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid token",
                ) from exc

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid API key or token",
    )
