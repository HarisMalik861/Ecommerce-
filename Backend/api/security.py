"""Optional shared-secret auth between Vercel and Render."""

from __future__ import annotations

import os

from fastapi import Header, HTTPException, status


def require_api_key(authorization: str | None = Header(default=None)) -> None:
    expected = os.environ.get("BACKEND_API_KEY", "").strip()
    if not expected:
        # Open when no key configured (local/dev). Always set in production.
        return

    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Missing Authorization header",
        )

    token = authorization
    if authorization.lower().startswith("bearer "):
        token = authorization[7:].strip()

    if token != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid API key",
        )
