# Deployment

## Current production setup

- API host: Fly.io, app `unadomot`, region `fra`.
- Public URL: https://unadomot.fly.dev
- Database: Neon Postgres 16, `aws-eu-central-1` (Frankfurt).
- Runtime: one shared-CPU machine with 512 MB RAM.
- API listens on port `8080` inside Fly.

## Required Fly secrets

Set these in the Fly dashboard under the app's **Secrets**:

- `DATABASE_URL` - Neon direct connection string with `sslmode=require`.
- `JWT_SECRET` - at least 32 random bytes.
- `REFRESH_TOKEN_SECRET` - at least 32 random bytes, different from JWT.

Optional, needed only for photo uploads and admin bootstrap:

- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `ADMIN_EMAILS`
- `PUBLIC_WEB_URL`
- `ALLOWED_ORIGINS`
- `REDIS_URL`

Use the direct Neon host, not the `-pooler` host, because migrations run at startup. Do not add `channel_binding=require`.

## Deploy the API

The GitHub Actions workflow `.github/workflows/fly-deploy.yml` creates the app if needed and deploys from `services/api`:

```bash
gh workflow run fly-deploy.yml \
  --repo oboobotenefiok/unadomot \
  --ref rewrite/flutter-rust-postgres
```

It requires the repository secret `FLY_API_TOKEN`.

Manual equivalent:

```bash
cd services/api
flyctl deploy --remote-only
```

## Build the APK

The `.github/workflows/build-apk.yml` workflow builds a debug APK against the live API and uploads it as `unadomot-debug-apk`:

```bash
gh workflow run build-apk.yml \
  --repo oboobotenefiok/unadomot \
  --ref rewrite/flutter-rust-postgres
```

Download it:

```bash
gh run download <run-id> -n unadomot-debug-apk -D ~/unadomot/apk
```

## Health checks

```bash
curl https://unadomot.fly.dev/health
curl https://unadomot.fly.dev/ready
```

Registration smoke test:

```bash
curl -X POST https://unadomot.fly.dev/api/auth/register \
  -H 'Content-Type: application/json' \
  -d '{"email":"test@example.com","password":"password123","name":"Test User"}'
```

A test account `test@example.com` exists from the initial smoke test. Remove or rotate it before public launch.

## Local Docker

```bash
docker compose up --build
```

The local API listens on port 3000. Fly uses 8080.

## Database

Migrations live in `services/api/migrations` and run automatically on startup. Back up Postgres before deploying schema changes.
