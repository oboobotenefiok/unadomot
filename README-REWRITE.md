# UnaDomot rewrite

This branch contains the Rust API and Flutter app rewrite. The legacy React and Firebase app has been removed from this branch and remains available on `main` as the rollback path.

## Live deployment

- API: https://unadomot.fly.dev
- Fly app: `unadomot`, region `fra`, 512 MB shared CPU.
- Database: Neon Postgres 16 in `aws-eu-central-1` (Frankfurt), direct connection with `sslmode=require`.
- API deploy workflow: `.github/workflows/fly-deploy.yml`.
- APK build workflow: `.github/workflows/build-apk.yml`.
- Smoke test: `/health` returns `ok`; registration and login succeed against Neon.

## Layout

- `services/api` - Rust API (axum, sqlx, Postgres, optional Redis).
- `apps/flutter_app` - Flutter Android app.
- `services/api/migrations` - embedded SQL migrations.
- `scripts/migrate-firebase.mjs` - Firebase to Postgres migration.
- `data/nigeria-states.js` - state and LGA source data, pending port to the API.
- `vault/img`, `vault/aud` - preserved brand and notification assets.
- `Dockerfile`, `fly.toml` - root-level copies used only by Fly's GUI detection. Production deploys use `services/api/Dockerfile` and `services/api/fly.toml`.

## API

```bash
cd services/api
cargo run
```

Required environment:

- `DATABASE_URL`
- `JWT_SECRET` (at least 32 random bytes)
- `REFRESH_TOKEN_SECRET` (at least 32 random bytes, different from JWT)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` (optional until photo uploads are enabled)
- `PUBLIC_WEB_URL`
- `BIND_ADDR` (default `0.0.0.0:3000`)
- `PORT` (Fly sets this to `8080`)
- `RUST_LOG`
- `ALLOWED_ORIGINS`
- `REDIS_URL` (optional)
- `RATE_LIMIT_PER_MINUTE` (optional, default 120)

Migrations run at startup. Health endpoints are `/health` and `/ready`.

## Flutter app

```bash
cd apps/flutter_app
flutter pub get
flutter analyze
flutter test
flutter run
```

Build against the deployed API:

```bash
flutter build apk --debug \
  --dart-define=API_BASE_URL=https://unadomot.fly.dev
```

The **Build APK** workflow does this on GitHub and uploads `unadomot-debug-apk`.

## Tests

```bash
cd services/api
cargo fmt --check
cargo clippy --all-targets -- -D warnings
cargo test
```

The Rust integration tests require `DATABASE_URL` pointing at Postgres.

## Toolchain

Rust is pinned in `rust-toolchain.toml` to 1.100.0. Flutter uses the stable channel in CI.
