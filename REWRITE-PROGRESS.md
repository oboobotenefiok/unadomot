# Rewrite progress

Last updated: 27 November 2026

## Backend

- [x] Typed `Config` with production checks
- [x] Shared `AppState`
- [x] Shared `ApiError`
- [x] `AuthUser` and `AdminUser` extractors
- [x] Auth, listings, messaging, reports, comments, profiles, calls, verification routes
- [x] Repository layer for users, listings, messaging, comments, profiles, reports, calls
- [x] Decimal prices end to end
- [x] Atomic refresh-token rotation
- [x] Random username suffix and unique index
- [x] Public profiles exclude email and phone
- [x] Cloudinary-only media URLs
- [x] Google token verification timeout
- [x] Google linking preserves password login
- [x] Structured JSON logs and request IDs
- [x] Rate limiting on the merged router
- [x] Suspended-account checks through `AuthUser`

## Flutter

- [x] Public-first shell
- [x] Auth sheet with intent resume
- [x] Session restore and single-flight refresh
- [x] Complete logout cleanup
- [x] Map location, pinning, pulsing dot
- [x] 100-slide listing gallery
- [x] Fatal configuration screen for missing `API_BASE_URL`
- [x] Post button prompts signup when signed out

## CI and release

- [x] Manual-only `Rewrite CI`
- [x] Rust Clippy, tests, release build
- [x] `cargo audit`
- [x] Docker build
- [x] Flutter analyze and tests
- [x] APK build and permission verification
- [x] Failure logs published to `ci-logs`
- [x] Android permission and deep-link scripts
- [x] Android signing script

## Open

- [ ] Commit the `android/` platform folder
- [ ] Set production secrets on Fly
- [ ] Email verification at registration
- [ ] Router-level tests for every endpoint
- [ ] Legacy migration scripts
- [ ] Green CI run recorded
