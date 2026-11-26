# UnaDomot rewrite

This branch contains the Rust API and Flutter app rewrite. The legacy React and Firebase app has been removed from this branch and remains available on `main` as the rollback path.

## Layout

- `services/api` - Rust API (axum, sqlx, Postgres, optional Redis).
- `apps/flutter_app` - Flutter Android app.
- `services/api/migrations` - embedded SQL migrations.
- `scripts/migrate-firebase.mjs` - Firebase to Postgres migration.
- `data/nigeria-states.js` - state and LGA source data, pending port to the API.
- `vault/img`, `vault/aud` - preserved brand and notification assets.

## API

```bash
cd services/api
cargo run
```

Required environment:

- `DATABASE_URL`
- `JWT_SECRET` (at least 32 random bytes)
- `REFRESH_TOKEN_SECRET` (at least 32 random bytes, different from JWT)
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `PUBLIC_WEB_URL`
- `BIND_ADDR` (default `0.0.0.0:3000`)
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

The Android platform folder is generated in CI. A release build requires `API_BASE_URL` to be set to an HTTPS URL.

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
