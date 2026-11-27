# Production readiness

Last updated: 27 November 2026

## Ready

- Layered API with shared auth, errors, state, and config
- Public profiles no longer expose email or phone
- Decimal money handling
- Atomic refresh-token rotation
- Rate limiting and suspended-account checks
- Cloudinary-only media URLs
- JSON logs with request IDs
- Manual-only CI with tests, audit, Docker build, and APK verification
- Android permission, deep-link, and signing scripts

## Blockers

| Blocker | Action |
|---|---|
| Android platform folder not committed | Commit `apps/flutter_app/android/` or keep the CI generation step |
| Production secrets missing | Set Cloudinary, Resend, and `APP_ENV=production` on Fly |
| No green CI run | Trigger `Rewrite CI` and record the run URL |
| Email verification missing | Add verification at registration |
| Legacy migration scripts missing | Add or remove the migration docs |

## Launch checklist

1. Set all production secrets on Fly.
2. Run migrations against a production copy.
3. Trigger `Rewrite CI` and confirm every job passes.
4. Build and install the release APK on a real phone.
5. Register, log in, post a listing with photos, message a landlord, and place a test call.
6. Confirm password reset email delivery.
7. Confirm `/ready` and a smoke login against production.
