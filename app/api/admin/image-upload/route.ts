import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  requireAdmin();

  const supabaseUrl = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = process.env.SUPABASE_STORAGE_BUCKET || 'product-images';

  if (!supabaseUrl || !serviceRoleKey) {
    return Response.json({ error: 'Supabase image storage is not configured' }, { status: 503 });
  }

  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) {
    return Response.json({ error: 'file is required' }, { status: 400 });
  }
  if (!file.type.startsWith('image/')) {
    return Response.json({ error: 'Only image files are allowed' }, { status: 400 });
  }
  if (file.size > 8 * 1024 * 1024) {
    return Response.json({ error: 'Image must be 8 MB or smaller' }, { status: 400 });
  }

  const extension = file.name.includes('.') ? file.name.split('.').pop()?.toLowerCase() : 'jpg';
  const safeExtension = extension && /^[a-z0-9]+$/.test(extension) ? extension : 'jpg';
  const path = `products/${crypto.randomUUID()}.${safeExtension}`;
  const endpoint = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/${encodeURIComponent(bucket)}/${path}`;

  const response = await fetch(endpoint, {
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

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    return Response.json({ error: data.message ?? data.error ?? 'Supabase image upload failed' }, { status: 502 });
  }

  const publicUrl = `${supabaseUrl.replace(/\/$/, '')}/storage/v1/object/public/${encodeURIComponent(bucket)}/${path}`;
  return Response.json({ url: publicUrl, path, bucket });
}
