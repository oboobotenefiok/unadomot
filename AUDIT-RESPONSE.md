# Audit Response

Branch: `rewrite/flutter-rust-postgres`

This document records the remediation work completed after the Pass 3 review. It is not a claim that the branch is production-ready; the remaining gates are listed at the end.

## Fixed in this pass

### Session handling

- `signedIn` no longer depends on the phone clock.
- `restore()` refreshes an expired or nearly expired access token before showing the shell.
- Refresh is single-flight, so concurrent 401s share one request.
- Refresh-token reuse now revokes the entire token family.
- Commit: `2193011c`, `26d2aab0`

### Google sign-in

- Suspended accounts are rejected before a session is issued.
- Google sign-in returns a real refresh token and stores it hashed.
- Linking to an existing password account clears the password hash and revokes active refresh tokens.
- Commit: `b023e330`

### Verification

- The mock provider is blocked when `APP_ENV=production`.
- Production now requires Smile ID credentials.
- Commit: `8e2c8cce`

### CI and deployment

- Rewrite CI runs on pull requests and pushes to the rewrite branch.
- `cargo fmt --check` is enforced again.
- Added a Docker image build job.
- Root `fly.toml` now matches `services/api/fly.toml`.
- Commits: `5428bac5`, `30a653ec`, `f8142c6c`

### Product work

- Listing comments, deletion, and reactions: Love, Laugh, Cry, Dislike, Hate.
- Listing codes in API responses, Flutter model, detail page, share text, and QR screen.
- High contrast and larger text settings.
- Commits: `1a2713b5`, `2e2a7aab`, `02e9c0fd`, `e8de1eff`, `abd74389`, `3bd07bd2`, `76ab8f56`, `07a302f1`, `891093ab`, `4e1d33f7`, `198f931c`, `a544f3a4`

## Still open

- Password reset email delivery. The API still has no production email sender.
- Live API diagnosis: confirm `DATABASE_URL`, `JWT_SECRET`, and `REFRESH_TOKEN_SECRET` on Fly.
- Release APK signing and a real-device login test.
- Golden tests against legacy screenshots.
- Full state-to-LGA mapping.
- Prometheus metrics endpoint.
- Cloudinary production upload validation.
- Router-level tests for every endpoint added since Pass 1.

## Required production environment

- `DATABASE_URL`
- `JWT_SECRET` at least 32 bytes
- `REFRESH_TOKEN_SECRET` at least 32 bytes and different from `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `GOOGLE_CLIENT_ID`
- `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET`
- `SMILE_ID_PARTNER_ID`, `SMILE_ID_API_KEY`, `SMILE_ID_ENVIRONMENT`
- `APP_ENV=production`

## Build note

No APK was produced by this documentation pass. Dispatch the **Build APK** workflow on `rewrite/flutter-rust-postgres` and confirm the artifact before device testing.
