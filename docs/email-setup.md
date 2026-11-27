# Password Reset Email Setup

The API uses the `EmailSender` abstraction in `services/api/src/application/email.rs`.

## Required variables

| Variable | Purpose |
|---|---|
| `RESEND_API_KEY` | API key for Resend |
| `EMAIL_FROM` | Verified sender address, for example `UnaDomot <no-reply@unadomot.com>` |
| `APP_BASE_URL` | Public app URL used to build the reset link |

If `RESEND_API_KEY` or `EMAIL_FROM` is missing, the API uses `UnconfiguredEmailSender`, which returns `EmailError::NotConfigured` instead of silently succeeding.

## Reset flow

1. `POST /api/auth/password-reset/request` creates a single-use token with a 30-minute expiry.
2. The handler builds a link to `APP_BASE_URL/reset-password?token=...`.
3. The link is sent through `EmailSender::send_password_reset`.
4. `POST /api/auth/password-reset/confirm` consumes the token and revokes all refresh tokens for the user.

## Production rules

- Never log the raw reset token.
- Never return the token in the HTTP response.
- Keep `PASSWORD_RESET_DEBUG` disabled in production.
- Rotate `RESEND_API_KEY` if it is exposed.
