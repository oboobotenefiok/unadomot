# Migration numbering

Use one sequential scheme from now on:

```
0013_description.sql
0014_description.sql
```

Do not rename or edit migrations that have already been applied. sqlx records a checksum for each applied migration, so changing an old file breaks deploys.

The existing `202611260001` and `202611260002` files are already applied. Leave them in place. New migrations must use the next sequential number after the highest `00xx` file, so they sort correctly under sqlx's numeric ordering.

Before merging a migration:

- Run it against a fresh Postgres 16 database.
- Run it against a copy of production data.
- Confirm the down/rollback plan in the pull request.
- Never include a destructive `DELETE` or `DROP` without an explicit backup step.
