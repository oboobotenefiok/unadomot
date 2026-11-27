# Release Readiness Checklist

Use this checklist before tagging a release. A checked item needs a named test or a CI run URL.

## API

- [ ] `cargo fmt --all -- --check` passes.
- [ ] `cargo clippy --all-targets -- -D warnings` passes.
- [ ] `cargo test` passes against Postgres 16.
- [ ] The Docker image builds from `services/api`.
- [ ] `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, and `CLOUDINARY_API_SECRET` are set on Fly.
- [ ] `APP_ENV=production` is set on Fly.
- [ ] `RESEND_API_KEY` and `EMAIL_FROM` are set if password-reset email is enabled.
- [ ] `PASSWORD_RESET_DEBUG` is unset in production.
- [ ] `/health` and `/ready` return success on the deployed API.

## Android

- [ ] `apps/flutter_app/android/` is committed, not generated during CI.
- [ ] `AndroidManifest.xml` includes `INTERNET`, `CAMERA`, `RECORD_AUDIO`, fine and coarse location, and notifications.
- [ ] Release signing is configured with a keystore that is not committed.
- [ ] Deep links are declared for the production host.
- [ ] `flutter analyze` passes.
- [ ] `flutter test` passes.
- [ ] A release APK builds with `--dart-define=API_BASE_URL=https://unadomot.fly.dev`.
- [ ] The release APK installs on a real device.
- [ ] Login, listing browse, messaging, and profile edit work on that device.

## Security

- [ ] Public profiles do not return `email` or `phone`.
- [ ] Suspended users receive `403` on profile, comments, messaging, calls, and verification.
- [ ] Rate limiting applies to every merged route.
- [ ] Refresh-token rotation is atomic under concurrent requests.
- [ ] Failed-login logs do not contain the email address.
- [ ] Password-reset logs do not contain the raw token.
- [ ] Listing media URLs are HTTPS-only.

## Deployment

- [ ] API deployment is manual-only.
- [ ] The deployed image is the same image tested in CI.
- [ ] Database migrations run before the new image receives traffic.
- [ ] Rollback image and migration plan are recorded.
