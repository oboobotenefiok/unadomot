# UnaDomot rewrite

## Progress
- [x] Hexagonal Rust API foundation
- [x] Postgres schema and repository adapters
- [x] Auth, listing lifecycle and media endpoints
- [x] Tested Flutter API client
- [x] Flutter auth and listing UI wired to API
- [x] SQLite offline cache for listings, details, favorites and drafts
- [x] Signed Cloudinary uploads and photo attachment
- [x] Async repositories and application layer
- [x] Required strong JWT secret at startup
- [x] Decimal pricing end to end
- [x] Structured JSON errors
- [x] CORS, body limit and security headers
- [x] Pagination with media included in browse
- [x] Registration and listing validation
- [x] Liveness and database readiness endpoints
- [x] Structured request logging
- [x] Public listing pages, social metadata and sitemap
- [x] Flutter secure token storage
- [x] Postgres service in CI
- [x] Per-IP rate limiting
- [x] Refresh-token rotation and revocation
- [x] Postgres integration test for the core listing flow
- [x] Messaging backend with participant checks
- [x] Flutter messaging inbox and chat screens
- [x] Verification requests and admin review endpoints
- [x] Flutter verification screen
- [x] Docker image, compose stack and deployment guide
- [x] CI caching, clippy gate and stable Android scaffold
- [x] HMAC-SHA256 refresh-token hashing
- [x] Flutter automatic access-token refresh on 401
- [x] Firebase migration script with dry-run
- [x] Production readiness and rollback documentation
- [x] Redis-backed rate limiting with in-memory fallback
- [x] Configurable restrictive CORS via ALLOWED_ORIGINS
- [x] Graceful shutdown
- [x] Database-backed admin roles with env bootstrap
- [x] Admin audit logging for verification reviews
- [x] Release signing documentation
- [x] Password reset request and confirm endpoints
- [x] Single-use, expiring, hashed password reset tokens
- [x] Session revocation after password reset
- [x] Persist rotated refresh tokens in secure storage
- [x] Structured API error messages in the Flutter client
- [x] Authentication failure logging
- [x] Ownership, media and validation integration tests
- [ ] Password reset email delivery
- [ ] Full state-to-LGA mapping
- [ ] Prometheus metrics endpoint

## Verified build

- Workflow: `rewrite-ci.yml`
- Last verified run: `45739501106`
- Last verified commit: `113373e`
- Result at that commit: Flutter analyze, Rust fmt and clippy all passed
- Release: `v0.1.0` prerelease published with `app-debug.apk`

Recent auth, admin, report and test changes are not covered by that run. Trigger CI explicitly before treating the branch as verified.
