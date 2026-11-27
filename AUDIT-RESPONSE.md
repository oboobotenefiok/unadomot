# Audit response

Last updated: 27 November 2026

This replaces the earlier audit response. Items are marked fixed only when the code or a test proves it.

## Fixed

| Finding | Evidence |
|---|---|
| Public profile leaked email and phone | Public DTO excludes both; test added in `4ae1ba8f` |
| Release APK lacked permissions | Permission script applied in CI and release workflow; `aapt` check added |
| Auto-deploy on every push | Deploy is `workflow_dispatch` only |
| Duplicate deploy workflows | `fly-deploy.yml` removed |
| New handlers bypassed auth status | Messaging now uses `AuthUser`; comments, calls, profiles already did |
| Profile prices decoded as `f64` | Profile listings use `Decimal` |
| Cloudinary missing in production | Boot fails when production lacks Cloudinary config |
| Refresh rotation not atomic | `SELECT ... FOR UPDATE` in place |
| Username generator always used 1000 | Random suffix in place; unique index added |
| Google link wiped password | Linking now preserves password login |
| Media URLs accepted any HTTPS host | Profile and chat media restricted to Cloudinary uploads |
| Failed deploy logs force-pushed to repo | Logs upload as artifacts; CI failures go to `ci-logs` |
| HSTS preload before domain lock-in | `preload` removed |
| Endless splash on missing API URL | Fatal configuration screen added |

## Open

- Email verification at registration.
- Router-level tests for every endpoint.
- Legacy migration scripts.
- Green CI run recorded.
