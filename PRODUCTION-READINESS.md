# Production readiness

Last updated: 28 November 2026

## Ready

- Layered API with shared auth, errors, state, and config
- Every handler lives under `src/http/`; `http::app()` is exported for integration tests
- Public profiles no longer expose email or phone
- Decimal money handling
- Atomic refresh-token rotation
- Rate limiting keyed on `Fly-Client-IP` with per-route budgets and bounded memory
- Cloudinary-only media URLs, tied to this application's cloud and public id
- Server-derived upload folders with signed format and delivery-type constraints
- Verification documents stored as public ids, viewed through signed URLs, audited per view
- JSON logs with request IDs
- Router-level integration tests for auth requirements and route wiring
- CI with tests, audit, Docker build, and APK verification
- Android permission, deep-link, and signing scripts

## Blockers

| Blocker | Action |
|---|---|
| Android platform folder not committed | Commit `apps/flutter_app/android/` or keep the CI generation step |
| Production secrets missing | Set Cloudinary, Resend, and `APP_ENV=production` on Fly |
| Phase 0 changes not yet through CI | Trigger `Rewrite CI` on the branch and record the run URL |
| Email verification missing | Add verification at registration |
| Account deletion and data export missing | Required by Google Play and NDPA |
| Favorites are device-local | Add server-side favorites endpoints and sync |
| Listings have no coordinates | Add latitude/longitude, bbox query, and clustered map |
| No push notifications | Backgrounded apps cannot receive messages or calls |
| Legacy migration scripts missing | Add or remove the migration docs |

## Launch checklist

1. Set all production secrets on Fly.
2. Apply the new verification migration and run migrations against a production copy.
3. Trigger `Rewrite CI` and confirm every job passes.
4. Build and install the release APK on a real phone.
5. Register, log in, post a listing with photos, message a landlord, and place a test call.
6. Submit a verification document and confirm the admin sees a signed URL and an audit entry.
7. Confirm password reset email delivery.
8. Confirm `/ready` and a smoke login against production.
