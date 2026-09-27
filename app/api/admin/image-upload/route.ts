import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';
import { uploadProductImage } from '@/lib/storage';

export const runtime = 'nodejs';

export async function POST(request: Request) {
  try {
    requireAdmin();
    const form = await request.formData();
    const file = form.get('file');
    if (!(file instanceof File)) return Response.json({ error: 'file is required' }, { status: 400 });
    const result = await uploadProductImage(file);
    if ('error' in result) return Response.json({ error: result.error }, { status: result.status });
    return Response.json(result);
  } catch (error) {
    return apiErrorResponse('admin/image-upload', error);
  }
}
