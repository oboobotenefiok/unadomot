# Rewrite progress

Last updated: 28 November 2026

## Backend

- [x] Typed `Config` with production checks
- [x] Shared `AppState`
- [x] Shared `ApiError`
- [x] `AuthUser` and `AdminUser` extractors
- [x] Auth, listings, messaging, reports, comments, profiles, calls, verification routes
- [x] Repository layer for users, listings, messaging, comments, profiles, reports, calls
- [x] All handlers under `src/http/`; `http::app()` exported from the library
- [x] Decimal prices end to end
- [x] Atomic refresh-token rotation
- [x] Random username suffix and unique index
- [x] Public profiles exclude email and phone
- [x] No plaintext verification documents; signed admin URLs with audit
- [x] Google token verification timeout
- [x] Google linking preserves password login
- [x] Structured JSON logs and request IDs
- [x] Rate limiting on `Fly-Client-IP` with per-route budgets and bounded memory
- [x] Suspended-account checks through `AuthUser`
- [x] Router-level integration tests for auth requirements and route wiring

## Flutter

- [x] Public-first shell
- [x] Auth sheet with intent resume
- [x] Session restore and single-flight refresh
- [x] Complete logout cleanup
- [x] Map location, pinning, pulsing dot
- [x] 100-slide listing gallery
- [x] Fatal configuration screen for missing `API_BASE_URL`
- [x] Post button prompts signup when signed out
- [x] Media uploads request a purpose and forward signed parameters
- [x] Verification submission sends a document public id

## CI and release

- [x] Manual-only CI, started from the terminal
- [x] `scripts/ci.sh` captures the run into `thisrun.txt` and pushes it
- [x] Rust Clippy, tests, release build
- [x] `cargo audit`
- [x] Docker build from the repository root
- [x] Flutter analyze and tests
- [x] APK build and permission verification
- [x] Failure logs published to `ci-logs`
- [x] Android permission and deep-link scripts
- [x] Android signing script

## Open

- [ ] Commit the `android/` platform folder
- [ ] Set production secrets on Fly
- [ ] Re-run CI for the Phase 0 changes and record a green run
- [ ] Email verification at registration
- [ ] Account deletion and data export
- [ ] Server-side favorites and cross-device sync
- [ ] Listing coordinates, bbox query, and clustered map
- [ ] Push notifications for messages and calls
- [ ] Legacy migration scripts
- [ ] Full authz-negative coverage for every endpoint
