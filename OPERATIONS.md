# Operations runbook

## Health checks

- `GET /health` is a liveness check and does not touch the database.
- `GET /ready` checks the listing repository and returns 503 when the database is unavailable.
- Fly should use `/health` for liveness and `/ready` for readiness.

## Backups

- Enable daily automated Postgres backups with at least 7 days of retention.
- Take a manual backup before every migration that drops a column or rewrites data.
- Restore into a staging database and run the API test suite before promoting a restore.

## Migrations

The migration history is consolidated into `services/api/migrations/0001_initial_schema.sql`. This baseline is treated as immutable after it has been applied to a shared database.

- New migrations must use a 14-digit `YYYYMMDDHHMMSS_description.sql` filename.
- The version must be greater than every existing 14-digit migration version.
- Never edit, rename, or delete an applied migration. sqlx stores a checksum and will refuse to run a changed file.
- CI runs `scripts/check_migrations.sh` to enforce both rules.
- Existing databases created before the consolidation must be recreated or manually baselined; they are not compatible with the consolidated checksum.
- The previous `0014`-`0017` files were removed by the consolidation. Do not recreate them.

## Verification document retention

Run daily after backups:

```sql
SELECT purge_reviewed_verification_documents(90);
```

The function clears `document_public_id` for requests reviewed more than 90 days ago. It keeps the request row and audit history. It does not delete Cloudinary assets; configure a Cloudinary cleanup job for the `unadomot/verification/` folder using the same retention window.

## Migration rollback

- Every migration is forward-only. Roll back by restoring the pre-migration backup, not by editing an applied file.
- The consolidated baseline replaces the old migration history. Restoring an old database requires a backup taken before the consolidation.

## Event replay

- Set `REDIS_URL` so event history is shared across API instances.
- Without Redis, replay is limited to the instance that published the event and to 100 events per user.
- Redis keys are `events:{user_id}` and expire after one hour.

## Incident checks

- Confirm `/ready` and the Postgres connection count.
- Check Redis availability if rate limits or event replay behave inconsistently.
- Review structured logs by request id; tokens and personal data are not logged.
