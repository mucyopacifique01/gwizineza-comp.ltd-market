'use client';

import { useEffect, useState } from 'react';
import { DashHeader } from '@/components/dash/DashShell';
import { Button } from '@/components/ui/Button';
import { TextField, TextAreaField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { apiFetch, jsonBody } from '@/lib/http';
import { useToast } from '@/components/ui/Toast';

type Settings = {
  siteName: string;
  tagline: string;
  location: string;
  region: string;
  phone: string | null;
  email: string | null;
  whatsapp: string | null;
  copyrightText: string;
  copyrightYear: number;
  footerCredit: string;
  announcementText: string | null;
  announcementEnabled: boolean;
  mapLat: number | null;
  mapLng: number | null;
};

const defaults: Settings = {
  siteName: 'Gwizineza Market',
  tagline: 'Everyday goods from trusted local sellers, connected in one market.',
  location: 'Kabarondo, Rwanda',
  region: 'Kabarondo · Kayonza District · Eastern Province',
  phone: '',
  email: '',
  whatsapp: '',
  copyrightText: 'Gwizineza Market',
  copyrightYear: new Date().getFullYear(),
  footerCredit: 'Created by Mucyo Pacifique',
  announcementText: 'Serving customers from Kabarondo, Rwanda',
  announcementEnabled: true,
  mapLat: -2.0127,
  mapLng: 30.5585,
};

export default function AdminSettingsPage() {
  const toast = useToast();
  const [form, setForm] = useState<Settings>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    apiFetch<{ settings: Settings }>('/api/admin/settings')
      .then(data => setForm(data.settings))
      .catch(e => setError(e instanceof Error ? e.message : 'Could not load settings'))
      .finally(() => setLoading(false));
  }, []);

  const set = (key: keyof Settings) => (event: { target: { value: string } }) => {
    setForm(current => ({ ...current, [key]: event.target.value }));
    setError('');
  };

  async function save() {
    setSaving(true);
    setError('');
    try {
      const payload = {
        ...form,
        copyrightYear: Number(form.copyrightYear),
        mapLat: form.mapLat === null || form.mapLat === '' ? null : Number(form.mapLat),
        mapLng: form.mapLng === null || form.mapLng === '' ? null : Number(form.mapLng),
      };
      const data = await apiFetch<{ settings: Settings }>('/api/admin/settings', { method: 'PATCH', body: jsonBody(payload) });
      setForm(data.settings);
      toast.show('Super admin settings saved');
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save settings');
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <><DashHeader eyebrow="Super admin" title="Settings" description="Control the public identity and footer of the marketplace." /><Skeleton height={620} radius={24} />;

  return (
    <>
      <DashHeader eyebrow="Super admin" title="Settings" description="Manage public site information, announcement text, map coordinates and the copyright line." actions={<Button icon="check" loading={saving} onClick={() => void save()}>Save settings</Button>} />

      <div className="dash-grid">
        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Store identity</h2><p className="muted small">These values are safe to show publicly.</p></div></div>
          <div className="form-grid cols-2">
            <TextField label="Site name" required value={form.siteName} onChange={set('siteName')} className="span-2" />
            <TextField label="Tagline" required value={form.tagline} onChange={set('tagline')} className="span-2" />
            <TextField label="Location" required value={form.location} onChange={set('location')} />
            <TextField label="Region" required value={form.region} onChange={set('region')} />
            <TextField label="Phone" type="tel" value={form.phone ?? ''} onChange={set('phone')} />
            <TextField label="Email" type="email" value={form.email ?? ''} onChange={set('email')} />
            <TextField label="WhatsApp number" value={form.whatsapp ?? ''} onChange={set('whatsapp')} hint="Include country code, e.g. 2507XXXXXXXX." />
          </div>
        </section>

        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Footer & copyright</h2><p className="muted small">Update the bottom copyright line without changing code.</p></div></div>
          <div className="form-grid cols-2">
            <TextField label="Copyright text" required value={form.copyrightText} onChange={set('copyrightText')} />
            <TextField label="Copyright year" required type="number" min={2000} max={2100} value={String(form.copyrightYear)} onChange={set('copyrightYear')} />
            <TextField label="Footer credit" required value={form.footerCredit} onChange={set('footerCredit')} className="span-2" />
          </div>
          <p className="field-hint" style={{ marginTop: 12 }}>The storefront will show “© {form.copyrightYear} {form.copyrightText}” and the credit you enter.</p>
        </section>

        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Announcement bar</h2><p className="muted small">Control the small message at the top of the storefront.</p></div></div>
          <TextAreaField label="Announcement text" optional value={form.announcementText ?? ''} onChange={set('announcementText')} rows={3} maxLength={240} />
          <label className="switch" style={{ marginTop: 14 }}>
            <input type="checkbox" checked={form.announcementEnabled} onChange={e => setForm(current => ({ ...current, announcementEnabled: e.target.checked }))} />
            <span className="switch-ui" aria-hidden="true" /> Show announcement bar
          </label>
        </section>

        <section className="card">
          <div className="card-head"><div><h2 className="card-title">Map location</h2><p className="muted small">Optional public map pin for the business location.</p></div></div>
          <div className="form-grid cols-2">
            <TextField label="Latitude" type="number" step="any" value={form.mapLat ?? ''} onChange={set('mapLat')} />
            <TextField label="Longitude" type="number" step="any" value={form.mapLng ?? ''} onChange={set('mapLng')} />
          </div>
        </section>
      </div>

      {error && <p className="alert alert-error" role="alert" style={{ marginTop: 16 }}><Icon name="alert" size={16} /> {error}</p>}
      <div className="editor-actions" style={{ marginTop: 20 }}>
        <Button loading={saving} onClick={() => void save()}>Save settings</Button>
      </div>
    </>
  );
}
