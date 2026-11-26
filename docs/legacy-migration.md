# Migrating from the legacy Firestore database

The legacy app stores users, listings, favorites, chats, and messages in Firestore. The rewrite uses Postgres. The safest migration preserves IDs through deterministic UUIDs, imports in dependency order, and runs a verification pass before cutover.

## 1. Export Firestore

Use the Firebase CLI or a Google Cloud export:

```bash
gcloud firestore export gs://your-bucket/unadomot-export
```

Convert the export to JSON collections named `users`, `listings`, `favorites`, `conversations`, and `messages`. Keep the original document ID on every record.

## 2. Map legacy fields

| Legacy | Postgres |
| --- | --- |
| `users.displayName` or `users.name` | `user_profiles.name` |
| `users.username` | `user_profiles.username` |
| `users.phone` | `user_profiles.phone` |
| `users.bio` | `user_profiles.bio` |
| `users.photoURL` | `user_profiles.photo_url` |
| `users.userType` | `user_profiles.user_type` |
| `users.verified` | `user_profiles.verified` |
| `listings.userId` | `listings.landlord_id` |
| `listings.images[]` | `listing_media` rows |
| `listings.amenities[]` | `listings.amenities` JSONB |
| `favorites` documents | `favorites` rows |
| `conversations.participants[]` | `conversation_participants` rows |
| `messages` documents | `messages` rows |

## 3. Preserve relationships

Firestore IDs are strings, while Postgres uses UUIDs. The migration script maps every legacy ID with UUIDv5, so a listing, its media, favorites, and chats all keep pointing at the same records.

## 4. Import order

1. `users`
2. `user_profiles`
3. `listings`
4. `listing_media`
5. `favorites`
6. `conversations` and `conversation_participants`
7. `messages`

## 5. Deduplicate usernames

Legacy usernames may collide case-insensitively. The importer keeps the first username and appends a numeric suffix to later duplicates. The unique index on `lower(username)` enforces this in Postgres.

## 6. Verify

Run these checks after import:

```sql
SELECT count(*) FROM users;
SELECT count(*) FROM listings;
SELECT count(*) FROM listing_media;
SELECT count(*) FROM messages;
SELECT count(*) FROM listings l LEFT JOIN users u ON u.id = l.landlord_id WHERE u.id IS NULL;
SELECT count(*) FROM messages m LEFT JOIN conversations c ON c.id = m.conversation_id WHERE c.id IS NULL;
```

Every orphan count must be zero. Compare totals against the Firestore export before switching traffic.

## 7. Cutover

1. Put the legacy app in read-only mode.
2. Run the final export and import.
3. Point the Flutter app at the new API.
4. Keep the legacy database read-only for two weeks as a rollback copy.
5. Remove the old project only after backups are verified.

## Script

`scripts/migrate_legacy.py` reads a JSON export and writes `legacy-import.sql`. Review the SQL, then run it against a staging database first.
