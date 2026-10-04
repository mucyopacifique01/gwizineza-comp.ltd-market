/**
 * Converts the Customer collection's unique indexes on optional fields
 * (email, phone, googleId) into PARTIAL unique indexes.
 *
 * Why: MongoDB treats null as a value in a normal unique index, so without
 * partial indexes only ONE customer could ever exist with a null phone/email/
 * googleId -- every second registration would fail with a duplicate-key error.
 * Prisma cannot express partial indexes, and `prisma db push` leaves old
 * unique indexes behind, so we normalize them here on every boot.
 *
 * Safe to run repeatedly (idempotent). Requires DATABASE_URL in the env.
 */
const { MongoClient } = require('mongodb');

const FIELDS = ['email', 'phone', 'googleId'];

function dbNameFromUrl(url) {
  try {
    const path = new URL(url.replace('mongodb+srv://', 'https://').replace('mongodb://', 'https://')).pathname;
    return path.replace(/^\//, '').split('?')[0] || 'gwizineza';
  } catch {
    return 'gwizineza';
  }
}

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[fix-customer-indexes] DATABASE_URL not set; skipping index normalization.');
    return;
  }
  const client = new MongoClient(url, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const collection = client.db(dbNameFromUrl(url)).collection('Customer');
    const existing = new Map((await collection.indexes()).map(i => [i.name, i]));

    for (const field of FIELDS) {
      const name = `Customer_${field}_key`;
      const current = existing.get(name);
      const wantPartial = { [field]: { $type: 'string' } };

      // Index already partial-unique on this field: nothing to do.
      if (current && current.unique && JSON.stringify(current.partialFilterExpression) === JSON.stringify(wantPartial)) continue;

      if (current) {
        try { await collection.dropIndex(name); } catch (error) {
          console.error(`[fix-customer-indexes] could not drop ${name}: ${error.message}`);
          continue;
        }
      }
      await collection.createIndex({ [field]: 1 }, { name, unique: true, partialFilterExpression: wantPartial });
      console.log(`[fix-customer-indexes] ${name} ensured as partial unique index.`);
    }
  } catch (error) {
    console.error('[fix-customer-indexes] failed:', error.message);
    // Do not crash the deploy over index housekeeping; app-level checks still
    // prevent duplicate accounts.
  } finally {
    await client.close();
  }
})();
