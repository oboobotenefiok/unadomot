# Deployment

## API

The API runs as a single Rust binary and applies migrations at startup.

```bash
docker compose up --build
```

The API listens on port 3000. Health checks:

- `GET /health` returns `ok` when the process is alive.
- `GET /ready` checks the Postgres connection.

## Required environment

- `DATABASE_URL`
- `JWT_SECRET` at least 32 bytes
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PUBLIC_WEB_URL` used for canonical URLs and sitemap entries
- `BIND_ADDR`
- `RUST_LOG`
- `ADMIN_EMAILS` for verification review access

## Flutter

Build with the production API URL:

```bash
flutter build apk --release --dart-define=API_BASE_URL=https://api.example.com
```

The CI workflow produces an installable debug APK on each push. Release signing requires a keystore configured in the workflow.

## Database

Migrations live in `services/api/migrations` and run automatically on startup. Back up Postgres before deploying schema changes.
