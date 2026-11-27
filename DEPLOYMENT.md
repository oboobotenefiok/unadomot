# Deployment

## API

Production runs on Fly.io from the root `fly.toml`.

```bash
flyctl deploy --remote-only
```

Deploy is manual through the `Deploy API` workflow. It does not run on push.

## Required secrets

Set these with `flyctl secrets set`:

```
DATABASE_URL
JWT_SECRET
REFRESH_TOKEN_SECRET
CLOUDINARY_CLOUD_NAME
CLOUDINARY_API_KEY
CLOUDINARY_API_SECRET
RESEND_API_KEY
EMAIL_FROM
APP_ENV=production
ALLOWED_ORIGINS
```

`JWT_SECRET` and `REFRESH_TOKEN_SECRET` must differ and be at least 32 bytes.

## Migrations

Migrations run as the Fly release command. To run them manually:

```bash
cd services/api
DATABASE_URL=... cargo run -- migrate
```

Use sequential migration numbers from `0013` onward. Never edit an applied migration.

## Flutter release

The release APK workflow generates the Android platform, applies permissions and deep links, configures signing, and builds with:

```
--dart-define=API_BASE_URL=https://unadomot.fly.dev
```

Required GitHub secrets:

```
ANDROID_KEYSTORE_BASE64
ANDROID_KEYSTORE_PASSWORD
ANDROID_KEY_ALIAS
ANDROID_KEY_PASSWORD
GOOGLE_CLIENT_ID
```

## Rollback

Use `flyctl releases` and `flyctl deploy --image <previous-image>` to roll back the API. Restore the database from the latest Neon backup if a migration caused the failure.
