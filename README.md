# UnaDomot

UnaDomot is a Nigerian rental marketplace. Tenants browse verified listings, message landlords, save favorites across devices, and use map search. Landlords publish listings, manage photos, and handle enquiries.

## Stack

- Flutter app in `apps/flutter_app`
- Rust API in `services/api` using Axum and sqlx
- PostgreSQL with sqlx migrations
- Redis for rate limiting and event history
- Cloudinary for listing and profile media
- Resend for transactional email
- Fly.io for API hosting

## Status

The Review 2 handoff is nearly complete on `rewrite/flutter-rust-postgres`. The project is **not production-ready yet**: push notifications and a few platform items remain, and the latest commits have not been through a green CI run.

Remaining launch blockers:

- Commit the generated `android/` platform folder, or keep using the CI generation step.
- Set production secrets on Fly: `CLOUDINARY_*`, `RESEND_API_KEY`, `EMAIL_FROM`, `APP_ENV=production`.
- Run the full CI matrix against the current branch and record a green run.
- Add push notifications. This needs a Firebase project, `google-services.json`/`GoogleService-Info.plist`, and APNs credentials.
- Handle the emailed `/verify-email?token=...` link inside the app so verification completes without a browser round trip.
- Add listing coordinates and a bounding-box query; the map is state-level only.

## Account and privacy

- Email verification is available from Settings. Tokens are hashed, single-use, and expire after 24 hours.
- Users can download their data as JSON from Settings. The export includes profile, listings, favorites, and conversations.
- Users can delete their account from Settings. Deletion removes refresh tokens and the user row in one transaction, relying on database cascades for related records.
- Favorites are stored server-side per user and sync across devices, with a local cache fallback when offline.

## Recent security hardening

- Media upload signing derives the Cloudinary folder server-side from an explicit purpose (`listing`, `avatar`, `chat`, `verification`) and the authenticated user. Clients can no longer choose a folder.
- Upload signatures bind `allowed_formats`, `resource_type=image`, and `type=authenticated` for verification documents.
- Submitted media URLs must point at this application's Cloudinary cloud and contain the stated public id.
- Verification documents are stored as public ids only; admins receive short-lived signed URLs and every document view is audited.
- Rate limiting keys on `Fly-Client-IP`, applies per-route budgets, bounds its in-memory map, and expires Redis keys atomically.
- Account rate limits cover login, registration, and password-reset requests per normalized email.
- Refresh tokens are generated with a CSPRNG, stored as hashes, and rotated on use.

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
- `REDIS_URL` for shared rate limits and event history
- `JWT_SECRET` and `REFRESH_TOKEN_SECRET`, different values, at least 32 bytes
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `RESEND_API_KEY`, `EMAIL_FROM`
- `APP_ENV=production`
- `ALLOWED_ORIGINS`

## Verification

Run these before merging:

```bash
cd services/api
cargo clippy --all-targets -- -D warnings
cargo test

cd ../../apps/flutter_app
flutter analyze
flutter test
```

## CI

`.github/workflows/ci.yml` runs on pushes and pull requests. It checks Rust formatting, Clippy with warnings denied, Rust tests, Flutter analysis, and Flutter tests.

For a manual run with captured output:

```bash
bash scripts/ci.sh
```

## Documentation

- [Deployment](DEPLOYMENT.md)
- [Production readiness](PRODUCTION-READINESS.md)
- [Rewrite progress](REWRITE-PROGRESS.md)
- [Audit response](AUDIT-RESPONSE.md)
- [Operations runbook](OPERATIONS.md)
- [Android permissions](docs/android-permissions.md)
- [Email setup](docs/email-setup.md)
- [Verification provider](docs/verification-provider.md)
