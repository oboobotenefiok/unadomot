# Pass 4 Security Review Response

This document tracks the findings from the Pass 4 deep review and the evidence for each fix. It is updated as commits land on `rewrite/flutter-rust-postgres`.

## Closed

| Finding | Fix | Evidence |
|---|---|---|
| Public profile leaked email and phone | Public serializer omits both fields | `cd8918c8`, unit test `public_profile_omits_email_and_phone` |
| Release APK missing permissions | Workflow patches and verifies `INTERNET`, camera, microphone, location, notifications | `63ed1d41` |
| API auto-deployed on every push | Deployment is manual-only and uses the hardened `services/api/fly.toml` | `a69684c4` |
| Profile listing prices used `f64` | Prices use `Decimal` and serialize as strings | `9abd9e0b` |
| Username suffix was predictable | Suffix is randomized per account | `03227ba3` |
| Suspended users could still use profile routes | Profile authorization checks `users.status` | `c0653291` |
| Suspended users could still comment | Comment authorization checks `users.status` | `4ca9fa89` |
| Suspended users could still message | Messaging authorization uses `UserRepository::is_active` | `b3b11130` |
| Suspended users could still call | Call authorization uses `UserRepository::is_active` | `e23173b8`, `05734df7` |
| Suspended users could still submit verification | Verification authorization checks active status | `8572ad6c` |
| New routes bypassed rate and body limits | Global rate limit and 2 MB body limit applied to the merged app | `c5007c07` |
| Production could start without Cloudinary | Startup fails when `CLOUDINARY_*` is missing in production | `8ff6c44a` |
| Refresh rotation was racy | Rotation locks the token row with `FOR UPDATE` | `ad89ae10` |
| Comments returned unbounded rows | Comments accept `limit` and `offset`, capped at 100 | `998c8ccb` |
| Profile photo URLs accepted any scheme | Profile photos must be HTTPS and well-formed | `57cce0a8` |
| CI did not run on PRs and skipped format checks | CI runs on PRs and pushes, enforces `fmt --check`, clippy, DB tests, Docker, and APK build | `3696e4e0` |

## Open

| Finding | Status | Next step |
|---|---|---|
| Failed-login log includes raw email | Open | Remove the email field from the warning log |
| Password reset only logs a debug token | Open | Send the reset link through the configured email provider |
| Listing media URLs are not validated | Open | Apply the HTTPS-only check to listing image uploads |
| Android project is not committed | Open | Commit `apps/flutter_app/android/` with manifest, signing, and deep links |
| Fly secrets are not verified | Open | Set `CLOUDINARY_*` and `APP_ENV=production` on Fly |
| Release APK login is unverified on a real device | Open | Install the release APK and complete a login flow |

## Verification Rules

- A finding is only marked closed when the fix is on the branch and has either a named test or a CI run URL.
- Refactor commits must not change behavior; intentional behavior changes use `fix:`.
- Secrets are never asserted as configured without checking the deployment environment.
