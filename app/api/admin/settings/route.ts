import { db } from '@/lib/prisma';
import { requireAdmin } from '@/lib/admin-auth';
import { apiErrorResponse } from '@/lib/api-errors';
import { DEFAULT_SITE_SETTINGS } from '@/lib/site-settings';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const clean = (value: unknown, max: number) => typeof value === 'string' ? value.trim().slice(0, max) : '';

export async function GET() {
  try {
    requireAdmin();
    const existing = await db.siteSettings.findUnique({ where: { key: 'site' } });
    if (!existing) {
      const created = await db.siteSettings.create({ data: DEFAULT_SITE_SETTINGS });
      return Response.json({ settings: { ...created, createdAt: created.createdAt.toISOString(), updatedAt: created.updatedAt.toISOString() } });
    }
    return Response.json({ settings: { ...existing, createdAt: existing.createdAt.toISOString(), updatedAt: existing.updatedAt.toISOString() } });
  } catch (error) {
    return apiErrorResponse('admin/settings', error);
  }
}

export async function PATCH(request: Request) {
  try {
    requireAdmin();
    const body = await request.json().catch(() => ({}));

    const siteName = clean(body.siteName, 100);
    const tagline = clean(body.tagline, 240);
    const location = clean(body.location, 160);
    const region = clean(body.region, 200);
    const phone = clean(body.phone, 40);
    const email = clean(body.email, 160);
    const whatsapp = clean(body.whatsapp, 40);
    const copyrightText = clean(body.copyrightText, 160);
    const footerCredit = clean(body.footerCredit, 160);
    const announcementText = clean(body.announcementText, 240);
    const copyrightYear = Number(body.copyrightYear);

    if (siteName.length < 2) return Response.json({ error: 'Site name must be at least 2 characters' }, { status: 400 });
    if (!tagline) return Response.json({ error: 'Tagline is required' }, { status: 400 });
    if (!location) return Response.json({ error: 'Location is required' }, { status: 400 });
    if (!region) return Response.json({ error: 'Region is required' }, { status: 400 });
    if (!copyrightText) return Response.json({ error: 'Copyright text is required' }, { status: 400 });
    if (!Number.isInteger(copyrightYear) || copyrightYear < 2000 || copyrightYear > 2100) {
      return Response.json({ error: 'Copyright year must be between 2000 and 2100' }, { status: 400 });
    }
    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return Response.json({ error: 'Enter a valid contact email' }, { status: 400 });
    }

    const data = {
      siteName,
      tagline,
      location,
      region,
      phone: phone || null,
      email: email || null,
      whatsapp: whatsapp || null,
      copyrightText,
      copyrightYear,
      footerCredit: footerCredit || ('Created by ' + siteName),
      announcementText: announcementText || null,
      announcementEnabled: body.announcementEnabled !== false,
      mapLat: body.mapLat === null || body.mapLat === '' ? null : Number(body.mapLat),
      mapLng: body.mapLng === null || body.mapLng === '' ? null : Number(body.mapLng),
    };

    if (data.mapLat !== null && (!Number.isFinite(data.mapLat) || data.mapLat < -90 || data.mapLat > 90)) {
      return Response.json({ error: 'Map latitude must be between -90 and 90' }, { status: 400 });
    }
    if (data.mapLng !== null && (!Number.isFinite(data.mapLng) || data.mapLng < -180 || data.mapLng > 180)) {
      return Response.json({ error: 'Map longitude must be between -180 and 180' }, { status: 400 });
    }

    const settings = await db.siteSettings.upsert({
      where: { key: 'site' },
      update: data,
      create: { key: 'site', ...data },
    });

    return Response.json({ ok: true, settings: { ...settings, createdAt: settings.createdAt.toISOString(), updatedAt: settings.updatedAt.toISOString() } });
  } catch (error) {
    return apiErrorResponse('admin/settings-update', error);
  }
}
