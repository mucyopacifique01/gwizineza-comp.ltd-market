/**
 * Server-only Supabase Storage upload (REST). Shared by the admin and seller upload routes.
 * The service-role key never leaves the server.
 */
export async function uploadProductImage(file: File): Promise<{ url: string; path: string; bucket: string } | { error: string; status: number }> {
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
    return { error: 'Image upload failed. Please try again.', status: 502 };
  }

  return { url: `${base}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`, path, bucket };
}
