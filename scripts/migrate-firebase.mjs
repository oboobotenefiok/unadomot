#!/usr/bin/env node
/**
 * Firebase Firestore -> UnaDomot Postgres migration.
 *
 * Usage:
 *   GOOGLE_APPLICATION_CREDENTIALS=service-account.json \
 *   DATABASE_URL=postgres://... \
 *   node scripts/migrate-firebase.mjs --dry-run
 *
 * Remove --dry-run to write. The script is idempotent by legacy id:
 * users are matched by email, listings by legacy_id.
 */
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import pg from 'pg';

const dryRun = process.argv.includes('--dry-run');
const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  console.error('DATABASE_URL is required');
  process.exit(1);
}

initializeApp({ credential: applicationDefault() });
const firestore = getFirestore();
const pool = new pg.Pool({ connectionString: databaseUrl });

const report = { users: 0, listings: 0, media: 0, favorites: 0, skipped: 0, errors: [] };

async function migrateUsers() {
  const snapshot = await firestore.collection('users').get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const email = (data.email || '').trim().toLowerCase();
    if (!email) {
      report.skipped++;
      continue;
    }
    try {
      if (!dryRun) {
        await pool.query(
          `INSERT INTO users (email, password_hash)
           VALUES ($1, NULL)
           ON CONFLICT (email) DO NOTHING`,
          [email],
        );
        await pool.query(
          `INSERT INTO user_profiles (user_id, name)
           SELECT id, $2 FROM users WHERE email = $1
           ON CONFLICT (user_id) DO NOTHING`,
          [email, data.name || data.displayName || 'UnaDomot user'],
        );
      }
      report.users++;
    } catch (error) {
      report.errors.push(`user ${doc.id}: ${error.message}`);
    }
  }
}

async function migrateListings() {
  const snapshot = await firestore.collection('listings').get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    const email = (data.ownerEmail || data.landlordEmail || '').trim().toLowerCase();
    try {
      const owner = email
        ? await pool.query('SELECT id FROM users WHERE email = $1', [email])
        : { rows: [] };
      if (!owner.rows.length) {
        report.skipped++;
        continue;
      }
      if (!dryRun) {
        const result = await pool.query(
          `INSERT INTO listings
             (landlord_id, title, description, price, address, state, lga,
              is_agent_listing, status, bedrooms, bathrooms, property_type, furnishing, legacy_id)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,'active',$9,$10,$11,$12,$13)
           ON CONFLICT (legacy_id) DO NOTHING
           RETURNING id`,
          [
            owner.rows[0].id,
            data.title || 'Untitled listing',
            data.description || '',
            data.price || 0,
            data.address || '',
            data.state || '',
            data.lga || '',
            Boolean(data.isAgentListing),
            data.bedrooms ?? null,
            data.bathrooms ?? null,
            data.propertyType ?? null,
            data.furnishing ?? null,
            doc.id,
          ],
        );
        if (result.rows.length && Array.isArray(data.media)) {
          for (const [index, media] of data.media.entries()) {
            await pool.query(
              `INSERT INTO listing_media (listing_id, cloudinary_public_id, url, alt_text, position)
               VALUES ($1,$2,$3,$4,$5)`,
              [result.rows[0].id, media.publicId || `${doc.id}-${index}`, media.url, media.altText || null, index],
            );
            report.media++;
          }
        }
      }
      report.listings++;
    } catch (error) {
      report.errors.push(`listing ${doc.id}: ${error.message}`);
    }
  }
}

async function migrateFavorites() {
  const snapshot = await firestore.collectionGroup('favorites').get();
  for (const doc of snapshot.docs) {
    const data = doc.data();
    try {
      if (!dryRun) {
        await pool.query(
          `INSERT INTO favorites (user_id, listing_id)
           SELECT u.id, l.id FROM users u, listings l
           WHERE u.email = $1 AND l.legacy_id = $2
           ON CONFLICT DO NOTHING`,
          [data.email, data.listingId],
        );
      }
      report.favorites++;
    } catch (error) {
      report.errors.push(`favorite ${doc.id}: ${error.message}`);
    }
  }
}

await migrateUsers();
await migrateListings();
await migrateFavorites();
await pool.end();

console.log(JSON.stringify({ dryRun, ...report }, null, 2));
if (report.errors.length) process.exitCode = 1;
