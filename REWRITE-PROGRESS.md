# UnaDomot rewrite

Existing React/Firebase application remains untouched.

## Architecture
One Flutter app with renter and lister capabilities; accounts may use both. Rust dependency direction: HTTP adapters -> application -> domain; persistence implements application ports. Domain has no HTTP or database dependencies. Postgres is planned as server source of truth, SQLite for device cache, Cloudinary for media. Public HTML listing pages will share application use cases with the API.

## Progress
- [x] Initial hexagonal API skeleton and unit test
- [x] Flutter role-switching shell
- [x] Android debug APK artifact workflow
- [ ] Confirm first CI build passes (not yet executed/verified)
- [ ] Inventory existing Firestore fields, security rules and routes
- [ ] Postgres migrations and repository adapter
- [ ] Authentication and authorization
- [ ] Listing browse/detail/post vertical slice
- [ ] SQLite cache and signed Cloudinary uploads
- [ ] Messaging, favorites, verification and admin parity
- [ ] Public HTML listing pages, metadata and deep links
- [ ] Data migration, integration tests, production deployment

## Run
API: `cd services/api && cargo run` (127.0.0.1:3000). GET /health and /api/listings. Listings deliberately return 503 until persistence is connected; no fake production data.
Flutter: install Flutter stable, run `flutter create --project-name unadomot --platforms android apps/flutter_app`, then `cd apps/flutter_app && flutter pub get && flutter run`. Generated native scaffolding is currently created by CI; pin the Flutter SDK and commit generated native scaffolding/lockfiles in a follow-up.

## Android testing
Actions -> Rewrite CI -> Run workflow on this branch. Download `unadomot-debug-apk`, extract, install app-debug.apk. Debug-signed for testing only, not Play Store release. No backend integration yet.

## Verification
This bootstrap has not been compiled locally. CI runs Rust formatting/tests/lints and Flutter analysis/tests/build. A configured GitHub runner must complete successfully before considering this milestone verified. No automatic production deployment or signing secrets configured.
