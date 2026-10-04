/**
 * Server-only Supabase Storage upload (REST). Shared by the admin and seller upload routes.
 * The service-role key never leaves the server.
 */
type StorageResult = { url: string; path: string; bucket: string } | { error: string; status: number };

async function ensurePublicBucket(base: string, bucket: string, serviceRoleKey: string) {
  const headers = { Authorization: `Bearer ${serviceRoleKey}`, apikey: serviceRoleKey };

  const check = await fetch(`${base}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
    headers,
    cache: 'no-store',
  });

  if (check.ok) {
    const current = await check.json().catch(() => ({})) as { public?: boolean };
    if (current.public !== true) {
      const update = await fetch(`${base}/storage/v1/bucket/${encodeURIComponent(bucket)}`, {
        method: 'PUT',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ public: true }),
      });
      if (!update.ok) {
        const detail = await update.text().catch(() => '');
        console.error('[storage] Could not make bucket public', update.status, detail);
        throw new Error('Supabase Storage bucket exists but could not be made public. Check the service-role key and bucket permissions.');
      }
    }
    return;
  }

  if (check.status !== 404) {
    const detail = await check.text().catch(() => '');
    throw new Error(`Storage bucket check failed (${check.status}): ${detail.slice(0, 300)}`);
  }

  const create = await fetch(`${base}/storage/v1/bucket`, {
    method: 'POST',
    headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: bucket, name: bucket, public: true, file_size_limit: 8388608 }),
  });

  if (!create.ok) {
    const detail = await create.text().catch(() => '');
    // A concurrent request may have created it between our GET and POST.
    if (create.status === 409) return;
    throw new Error(`Storage bucket creation failed (${create.status}): ${detail.slice(0, 300)}`);
  }

  console.log(`[storage] Created public bucket "${bucket}" for product images.`);
}

export async function uploadProductImage(file: File): Promise<StorageResult> {
  const supabaseUrl = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

  if (!supabaseUrl || !serviceRoleKey) return { error: 'Image storage is not configured yet.', status: 503 };
  if (!file.type.startsWith('image/')) return { error: 'Only image files are allowed.', status: 400 };
  if (file.size > 8 * 1024 * 1024) return { error: 'Image must be 8 MB or smaller.', status: 400 };

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'jpg';
  const safeExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
  const path = `products/${crypto.randomUUID()}.${safeExtension}`;
  const base = supabaseUrl.replace(/\/$/, '');

  try {
    await ensurePublicBucket(base, bucket, serviceRoleKey);

    const response = await fetch(`${base}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        apikey: serviceRoleKey,
        'Content-Type': file.type,
        'x-upsert': 'false',
        'cache-control': '31536000',
      },
      body: await file.arrayBuffer(),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('[storage] Supabase upload failed', response.status, detail);
      return { error: 'Image upload failed. Check the Supabase Storage bucket configuration and try again.', status: 502 };
    }

    return { url: `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`, path, bucket };
  } catch (error) {
    console.error('[storage] Supabase storage setup/upload failed', error);
    return { error: error instanceof Error ? error.message.slice(0, 240) : 'Image storage is unavailable.', status: 502 };
  }
}
