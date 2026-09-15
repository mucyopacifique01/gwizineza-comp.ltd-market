import { createHash } from 'crypto';
import { requireAdmin } from '@/lib/admin-auth';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  requireAdmin();
  const cloud = process.env.CLOUDINARY_CLOUD_NAME;
  const key = process.env.CLOUDINARY_API_KEY;
  const secret = process.env.CLOUDINARY_API_SECRET;
  if (!cloud || !key || !secret) return Response.json({ error: 'Cloudinary image storage is not configured' }, { status: 503 });
  const form = await request.formData();
  const file = form.get('file');
  if (!(file instanceof File)) return Response.json({ error: 'file is required' }, { status: 400 });
  if (!file.type.startsWith('image/')) return Response.json({ error: 'Only image files are allowed' }, { status: 400 });
  if (file.size > 8 * 1024 * 1024) return Response.json({ error: 'Image must be 8 MB or smaller' }, { status: 400 });

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const signature = createHash('sha1').update(`timestamp=${timestamp}${secret}`).digest('hex');
  const upload = new FormData();
  upload.append('file', new Blob([await file.arrayBuffer()], { type: file.type }), file.name);
  upload.append('api_key', key); upload.append('timestamp', timestamp); upload.append('signature', signature); upload.append('folder', 'gwizineza/products');
  const response = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, { method: 'POST', body: upload });
  const data = await response.json();
  if (!response.ok) return Response.json({ error: data.error?.message ?? 'Image upload failed' }, { status: 502 });
  return Response.json({ url: data.secure_url, publicId: data.public_id });
}
