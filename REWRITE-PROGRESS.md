# UnaDomot rewrite

Existing React/Firebase application remains untouched.

## Architecture
Hexagonal Rust API: HTTP adapters depend on application use cases; application depends on domain ports; infrastructure adapters implement those ports. One Flutter app serves renter and landlord/agent modes. Postgres is the server source of truth; SQLite will handle device cache; Cloudinary handles media.

## Progress
- [x] Initial hexagonal API skeleton and unit test
- [x] Flutter role-switching shell
- [x] Android debug APK artifact workflow
- [x] Inventory Firestore domain
- [x] Postgres initial schema and SQLx listing repository adapter
- [x] Email/password registration and login with Argon2 and JWT sessions
- [x] Listing creation and detail endpoints with ownership authorization
- [x] Listing update, soft delete and Cloudinary media association
- [x] Price, bedrooms and furnishing filters
- [ ] Confirm CI passes
- [ ] SQLite cache and signed Cloudinary uploads
- [ ] Messaging, favorites, verification and admin parity
- [ ] Public HTML listing pages, metadata and deep links
- [ ] Data migration, integration tests, production deployment

## Android testing
Actions -> Rewrite CI -> Run workflow on this branch. Download `unadomot-debug-apk`, extract, install `app-debug.apk`.
