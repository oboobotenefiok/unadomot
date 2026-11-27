#!/usr/bin/env bash
set -euo pipefail

missing=0

require() {
  local name="$1"
  if [ -z "${!name:-}" ]; then
    echo "missing: $name" >&2
    missing=1
  else
    echo "ok: $name"
  fi
}

require APP_ENV
require DATABASE_URL
require JWT_SECRET
require REFRESH_TOKEN_SECRET
require CLOUDINARY_CLOUD_NAME
require CLOUDINARY_API_KEY
require CLOUDINARY_API_SECRET
require ALLOWED_ORIGINS

if [ "${APP_ENV:-}" != "production" ]; then
  echo "APP_ENV must be production" >&2
  missing=1
fi

if [ "${#JWT_SECRET:-}" -lt 32 ]; then
  echo "JWT_SECRET must be at least 32 bytes" >&2
  missing=1
fi

if [ "${#REFRESH_TOKEN_SECRET:-}" -lt 32 ]; then
  echo "REFRESH_TOKEN_SECRET must be at least 32 bytes" >&2
  missing=1
fi

if [ "${JWT_SECRET:-}" = "${REFRESH_TOKEN_SECRET:-}" ]; then
  echo "JWT_SECRET and REFRESH_TOKEN_SECRET must differ" >&2
  missing=1
fi

if [ "${PASSWORD_RESET_DEBUG:-}" = "1" ]; then
  echo "PASSWORD_RESET_DEBUG must not be enabled in production" >&2
  missing=1
fi

if [ "$missing" -ne 0 ]; then
  echo "production environment is incomplete" >&2
  exit 1
fi

echo "production environment looks complete"
