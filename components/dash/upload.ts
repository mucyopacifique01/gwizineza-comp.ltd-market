import { apiFetch } from '@/lib/http';

export type EditorMode = 'admin' | 'seller';
const UPLOAD: Record<EditorMode, string> = { admin: '/api/admin/image-upload', seller: '/api/seller/image-upload' };

export async function uploadImage(mode: EditorMode, file: File) {
  const body = new FormData();
  body.append('file', file);
  const res = await apiFetch<{ url: string }>(UPLOAD[mode], { method: 'POST', body });
  return res.url;
}
