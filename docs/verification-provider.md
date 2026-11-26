# Identity verification provider

This is intentionally inactive until funding is available. The app can keep using manual admin review.

## Providers

- `mock`: local and staging only. Approves IDs with 11 or more characters.
- `smile_id`: live Nigerian NIN, BVN, and selfie checks.

## Environment

```
SMILE_ID_PARTNER_ID=
SMILE_ID_API_KEY=
SMILE_ID_ENVIRONMENT=sandbox
```

Set `SMILE_ID_ENVIRONMENT=production` only after the sandbox flow is approved.

## Activation

1. Run migration `0012_verification_checks.sql`.
2. Add the Smile ID secrets to Fly.
3. Add a `POST /api/verification/provider` endpoint that calls `configured_provider().verify(...)`.
4. Store the outcome in `verification_checks` and set `user_profiles.verified` only on approval.
5. Keep admin review as the fallback for failed or pending checks.

Do not store raw NIN, BVN, selfie, or document data in Postgres. Store only the provider reference, status, reason, and the last four digits.
