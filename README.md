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

Phase 0 security hardening is complete on `rewrite/flutter-rust-postgres`. The project is **not production-ready yet**: several core marketplace features are still missing and the Phase 0 changes have not been through CI.

Remaining launch blockers:

- Commit the generated `android/` platform folder, or keep using the CI generation step.
- Set production secrets on Fly: `CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_ENV=production`.
- Run the full CI matrix against the Phase 0 commits and record a green run.
- Add email verification at registration.
- Add account deletion and data export (Google Play and NDPA requirements).
- Add server-side favorites; favorites are currently device-local only.
- Add listing coordinates and a bounding-box query; the map is state-level only.

## Recent security hardening

- Media upload signing derives the Cloudinary folder server-side from an explicit purpose (`listing`, `avatar`, `chat`, `verification`) and the authenticated user. Clients can no longer choose a folder.
- Upload signatures bind `allowed_formats`, `resource_type=image`, and `type=authenticated` for verification documents.
- Submitted media URLs must point at this application's Cloudinary cloud and contain the stated public id.
- Verification documents are stored as public ids only; admins receive short-lived signed URLs and every document view is audited.
- Rate limiting keys on `Fly-Client-IP`, applies per-route budgets, bounds its in-memory map, and expires Redis keys atomically.

Client contract changes: `/api/media/signature` now takes `purpose` instead of `folder`, and `/api/verification` now takes `document_public_id` instead of `document_url`.

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

`Rewrite CI` is manual-only. It never runs on push. Start it from your terminal with:

```bash
bash scripts/ci.sh
```

The script triggers the workflow, watches it, writes the full output to `thisrun.txt`, and pushes that file without triggering CI.

## Documentation

- [Deployment](DEPLOYMENT.md)
- [Production readiness](PRODUCTION-READINESS.md)
- [Rewrite progress](REWRITE-PROGRESS.md)
- [Audit response](AUDIT-RESPONSE.md)
- [Android permissions](docs/android-permissions.md)
- [Email setup](docs/email-setup.md)
- [Verification provider](docs/verification-provider.md)
