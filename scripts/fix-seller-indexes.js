/**
 * Normalizes legacy MongoDB indexes on Seller.
 *
 * Older versions of the Prisma schema used unique indexes for optional seller
 * contact fields. MongoDB enforces those indexes even after the Prisma schema
 * changes, which can make a valid seller creation fail with E11000 duplicate
 * key errors (especially when older documents contain null/duplicate values).
 *
 * loginUsername is the only seller field that must be unique. Because it is
 * optional for legacy documents, it is enforced as a partial unique index for
 * non-empty strings. phone/email are deliberately NOT unique.
 *
 * Safe and idempotent: it inspects existing indexes before changing them.
 */
const { MongoClient } = require('mongodb');

function dbNameFromUrl(url) {
  try {
    const normalized = url.replace(/^mongodb\\+srv:\\/\\//, 'https://').replace(/^mongodb:\\/\\//, 'https://');
    const pathname = new URL(normalized).pathname;
    return pathname.replace(/^\\//, '').split('?')[0] || 'gwizineza';
  } catch {
    return 'gwizineza';
  }
}

(async () => {
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.warn('[fix-seller-indexes] DATABASE_URL not set; skipping index normalization.');
    return;
  }

  const client = new MongoClient(url, { serverSelectionTimeoutMS: 15000 });
  try {
    await client.connect();
    const collection = client.db(dbNameFromUrl(url)).collection('Seller');
    const indexes = await collection.indexes();

    // Remove legacy unique indexes on fields that are not unique in the Prisma model.
    for (const index of indexes) {
      if (!index.unique || !index.key) continue;
      const keys = Object.keys(index.key);
      if (keys.length !== 1) continue;
      const field = keys[0];
      if (!['phone', 'email'].includes(field)) continue;
      if (index.name === '_id_') continue;

      try {
        await collection.dropIndex(index.name);
        console.log(`[fix-seller-indexes] removed legacy unique index ${index.name} on Seller.${field}`);
      } catch (error) {
        console.error(`[fix-seller-indexes] could not drop ${index.name}:`, error.message);
      }
    }

    // Re-read after cleanup, then enforce unique usernames only when a real string exists.
    const current = await collection.indexes();
    const usernameIndexes = current.filter((index) => {
      if (!index.key || !index.unique) return false;
      const keys = Object.keys(index.key);
      return keys.length === 1 && keys[0] === 'loginUsername';
    });

    const desiredName = 'Seller_loginUsername_partial_key';
    const desiredFilter = { loginUsername: { $type: 'string' } };
    const desired = current.find((index) => index.name === desiredName);
    const matchesDesired = desired
      && desired.unique === true
      && JSON.stringify(desired.partialFilterExpression) === JSON.stringify(desiredFilter);

    if (!matchesDesired) {
      for (const index of usernameIndexes) {
        if (index.name === '_id_') continue;
        try {
          await collection.dropIndex(index.name);
          console.log(`[fix-seller-indexes] removed legacy username index ${index.name}`);
        } catch (error) {
          console.error(`[fix-seller-indexes] could not drop ${index.name}:`, error.message);
        }
      }
      await collection.createIndex(
        { loginUsername: 1 },
        { name: desiredName, unique: true, partialFilterExpression: desiredFilter },
      );
      console.log('[fix-seller-indexes] ensured partial unique loginUsername index.');
    }
  } catch (error) {
    // Index housekeeping must never prevent the Next.js server from starting.
    console.error('[fix-seller-indexes] failed:', error.message);
  } finally {
    await client.close();
  }
})();
