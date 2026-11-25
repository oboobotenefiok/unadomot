# Production readiness

## Required environment

- `DATABASE_URL` Postgres connection string.
- `JWT_SECRET` at least 32 random bytes.
- `REFRESH_TOKEN_SECRET` at least 32 random bytes, separate from JWT.
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`.
- `PUBLIC_WEB_URL` canonical public URL.
- `BIND_ADDR` e.g. `0.0.0.0:3000`.
- `RUST_LOG` e.g. `info,tower_http=info`.
- `ADMIN_EMAILS` comma-separated bootstrap admins.
- `ALLOWED_ORIGINS` comma-separated production origins.
- `REDIS_URL` optional; enables shared rate limiting.

Secrets should be injected by the platform secret manager, not committed. The API reads environment variables only and never logs them.

## Deploy

```bash
docker compose up --build
```

Or build `services/api/Dockerfile` and run it behind a TLS-terminating load balancer. Migrations run at startup.

## Health and monitoring

- `/health` liveness.
- `/ready` Postgres readiness.
- Structured tracing logs.
- Rate limiting is per-IP.

## Migration from Firebase

1. Back up Postgres.
2. Export a Firebase service account and set `GOOGLE_APPLICATION_CREDENTIALS`.
3. Run `node scripts/migrate-firebase.mjs --dry-run` and review counts/errors.
4. Run without `--dry-run` during a quiet window.
5. Spot-check users, listings, media and favorites.
6. Keep the legacy app read-only for 48 hours before shutdown.

Users migrate without passwords; they must use password reset or social login. Listings are matched by `legacy_id`, making reruns safe.

## Rollback

- Keep the legacy Firebase project running read-only during the beta.
- If the API is unhealthy, point clients back to the legacy build.
- Restore Postgres from the pre-migration backup if data is corrupted.
- Rotate `JWT_SECRET` and `REFRESH_TOKEN_SECRET` to invalidate all sessions after a suspected compromise.

## Known limitations

- Rate limiting falls back to per-process memory when `REDIS_URL` is absent.
- Admin rights use `ADMIN_EMAILS`; a roles table is a follow-up.
- Offset pagination is used instead of cursors.
- No automated zero-downtime migration; cut-over is scripted and manual.
- Release APK signing requires a keystore configured outside the repo.
