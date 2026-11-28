# Migration baseline

The migration history is consolidated into a single baseline file:

```
0001_initial_schema.sql
```

This file represents the cumulative schema as of 2026-11-28. New migrations should use the next sequential number:

```
0002_description.sql
0003_description.sql
```

Do not edit the baseline after it has been applied to a shared database. sqlx records a checksum for each applied migration, so changing an applied file breaks deploys.

Before merging a migration:

- Run it against a fresh Postgres 16 database.
- Run it against a copy of production data.
- Confirm the down/rollback plan in the pull request.
- Never include a destructive `DELETE` or `DROP` without an explicit backup step.
