# UnaDomot

UnaDomot is a Nigerian rental marketplace. Tenants browse verified listings, message landlords, save favorites, and use map search. Landlords publish listings, manage photos, and handle enquiries.

## Stack

- Flutter app in `apps/flutter_app`
- Rust API in `services/api` using Axum and sqlx
- PostgreSQL with sqlx migrations
- Cloudinary for listing and profile media
- Resend for transactional email
- Fly.io for API hosting

## Status

Code consolidation and the requested feature work are about **95% complete**. The project is **not production-ready yet**.

Remaining launch blockers:

- Commit the generated `android/` platform folder, or keep using the CI generation step.
- Set production secrets on Fly: `CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_ENV=production`.
- Run the full CI matrix and record a green run.
- Add email verification at registration.

## Local development

### API

```bash
cd services/api
cp ../../.env.example .env
cargo run
```

The API listens on `127.0.0.1:3000` by default.

### Flutter

```bash
cd apps/flutter_app
flutter pub get
flutter run --dart-define=API_BASE_URL=http://10.0.2.2:3000
```

## Required environment

See `.env.example` for the full list. Production requires:

- `DATABASE_URL`
- `JWT_SECRET` and `REFRESH_TOKEN_SECRET`, different values, at least 32 bytes
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `APP_ENV=production`
- `ALLOWED_ORIGINS`

## CI

`Rewrite CI` is manual-only. It runs:

- Rust Clippy, tests, release build
- `cargo audit`
- Docker image build
- Flutter analyze and tests with coverage
- Debug APK build and Android permission verification

Failed runs publish their logs to the `ci-logs` branch.

## Documentation

- [Deployment](DEPLOYMENT.md)
- [Production readiness](PRODUCTION-READINESS.md)
- [Rewrite progress](REWRITE-PROGRESS.md)
- [Audit response](AUDIT-RESPONSE.md)
- [Android permissions](docs/android-permissions.md)
- [Email setup](docs/email-setup.md)
- [Verification provider](docs/verification-provider.md)
