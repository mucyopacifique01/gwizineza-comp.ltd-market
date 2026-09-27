'use client';

import { useMemo, useState } from 'react';
import { useApi } from '@/lib/use-api';
import { apiFetch, jsonBody } from '@/lib/http';
import type { ProductDTO } from '@/lib/types';
import { composeHomepage, primaryImage } from '@/lib/merchandising';
import { DashHeader } from '@/components/dash/DashShell';
import { ImageStack } from '@/components/product/ImageStack';
import { ProductImage } from '@/components/product/ProductImage';
import { ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

const SECTIONS = [
  { value: '', label: 'Automatic' },
  { value: 'HERO_MAIN', label: 'Hero · main product' },
  { value: 'HERO_SECONDARY', label: 'Hero · behind main' },
  { value: 'SPOTLIGHT', label: 'Spotlight section' },
  { value: 'HOME_HIDDEN', label: 'Hide from homepage' },
];

type Patch = Partial<Pick<ProductDTO, 'isFeatured' | 'displaySection' | 'displayPriority'>>;

/**
 * Owner control over the storefront composition (featured, section, priority).
 * Writes use PATCH /api/products/[id] with the new optional display fields.
 */
export default function StorefrontAdmin() {
  const toast = useToast();
  const { data, error, loading, reload, setData } = useApi<{ products: ProductDTO[] }>('/api/products?admin=true', { loginPath: '/admin/login' });
  const [saving, setSaving] = useState<string | null>(null);
  const [q, setQ] = useState('');
  const live = useMemo(() => (data?.products ?? []).filter(p => p.isActive), [data]);
  const preview = useMemo(() => composeHomepage(live, []), [live]);
  const heroMainId = live.find(p => p.displaySection === 'HERO_MAIN')?.id ?? '';
  const secondaryIds = live.filter(p => p.displaySection === 'HERO_SECONDARY').sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0)).map(p => p.id);

  async function patch(id: string, changes: Patch, quiet = false) {
    setSaving(id);
    try {
      await apiFetch(`/api/products/${id}`, { method: 'PATCH', body: jsonBody(changes) });
      setData(d => d && { products: d.products.map(p => (p.id === id ? { ...p, ...changes } : p)) });
      if (!quiet) toast.show('Storefront updated');
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Could not save', { tone: 'error' }); throw e; }
    finally { setSaving(null); }
  }

  async function setHeroMain(id: string) {
    try {
      if (heroMainId && heroMainId !== id) await patch(heroMainId, { displaySection: null }, true);
      if (id) await patch(id, { displaySection: 'HERO_MAIN' }, true);
      toast.show(id ? 'Main hero product set' : 'Hero set to automatic');
    } catch { /* toast already shown */ }
  }

  async function setSecondary(slot: number, id: string) {
    try {
      const current = secondaryIds[slot];
      if (current && current !== id) await patch(current, { displaySection: null }, true);
      if (id) await patch(id, { displaySection: 'HERO_SECONDARY', displayPriority: 30 - slot * 10 }, true);
      toast.show('Hero products updated');
    } catch { /* toast already shown */ }
  }

  const withImages = live.filter(p => primaryImage(p));
  const table = live.filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())).sort((a, b) => (b.displayPriority ?? 0) - (a.displayPriority ?? 0));

  return (
    <>
      <DashHeader eyebrow="Marketplace content" title="Storefront display" description="Choose what customers see first. Anything you leave on “Automatic” is arranged for you." actions={<ButtonLink href="/" variant="outline" icon="external">View homepage</ButtonLink>} />
      {loading && !data ? <Skeleton height={480} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : (
        <div className="stack" style={{ gap: 20 }}>
          <div className="dash-grid dash-grid-hero">
            <section className="card">
              <h2 className="card-title">Homepage hero</h2>
              <div className="stack">
                <label className="field"><span className="field-label">Main product (front)</span>
                  <select className="select" value={heroMainId} onChange={e => void setHeroMain(e.target.value)} disabled={Boolean(saving)}>
                    <option value="">Automatic: {preview.heroMain?.name ?? 'none'}</option>
                    {withImages.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                  </select>
                </label>
                {[0, 1, 2].map(slot => (
                  <label key={slot} className="field"><span className="field-label">Behind main · slot {slot + 1}</span>
                    <select className="select" value={secondaryIds[slot] ?? ''} onChange={e => void setSecondary(slot, e.target.value)} disabled={Boolean(saving)}>
                      <option value="">Automatic</option>
                      {withImages.filter(p => p.id !== heroMainId && (!secondaryIds.includes(p.id) || secondaryIds[slot] === p.id)).map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                    </select>
                  </label>
                ))}
                <p className="field-hint">Products need a photo to appear in the hero.</p>
              </div>
            </section>
            <section className="card storefront-preview">
              <div className="row-between"><h2 className="card-title" style={{ margin: 0 }}>Live preview</h2><span className="badge badge-sky">What customers see</span></div>
              {preview.heroMain ? (
                <div className="storefront-preview-stage">
                  <ImageStack size="md" main={{ key: preview.heroMain.id, src: primaryImage(preview.heroMain), alt: preview.heroMain.name }} behind={preview.heroSecondary.map(p => ({ key: p.id, src: primaryImage(p), alt: p.name }))} />
                  <div className="float-card float-product" style={{ position: 'absolute' }}><span className="float-kicker">Featured today</span><strong>{preview.heroMain.name}</strong></div>
                </div>
              ) : <p className="muted">Add a product with a photo to build the hero.</p>}
              <div className="row wrap" style={{ marginTop: 12 }}><span className="muted small">Spotlight:</span>{preview.spotlight.map(p => <span key={p.id} className="badge">{p.name}</span>)}</div>
            </section>
          </div>

          <section className="card">
            <div className="row-between wrap" style={{ marginBottom: 16 }}>
              <h2 className="card-title" style={{ margin: 0 }}>Placement & priority</h2>
              <div className="input-group" style={{ minWidth: 240 }}><Icon name="search" size={18} /><input className="input" placeholder="Filter products" value={q} onChange={e => setQ(e.target.value)} aria-label="Filter products" /></div>
            </div>
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Product</th><th>Featured</th><th>Section</th><th>Priority</th></tr></thead>
                <tbody>
                  {table.map(p => (
                    <tr key={p.id} className={saving === p.id ? 'row-muted' : undefined}>
                      <td><div className="row"><span className="mini-thumb"><ProductImage src={primaryImage(p)} alt="" sizes="48px" /></span><div><strong>{p.name}</strong><div className="muted tiny">{p.seller?.businessName ?? 'Marketplace'} · stock {p.stock}</div></div></div></td>
                      <td><label className="switch"><input type="checkbox" checked={Boolean(p.isFeatured)} onChange={e => void patch(p.id, { isFeatured: e.target.checked }).catch(() => undefined)} /><span className="switch-ui" aria-hidden="true" /><span className="sr-only">Featured</span></label></td>
                      <td><select className="select select-sm" value={p.displaySection ?? ''} onChange={e => void patch(p.id, { displaySection: e.target.value || null }).catch(() => undefined)} aria-label={`Section for ${p.name}`}>{SECTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></td>
                      <td><PriorityInput value={p.displayPriority ?? 0} onSave={v => patch(p.id, { displayPriority: v }).catch(() => undefined)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="field-hint" style={{ marginTop: 12 }}>Higher priority shows first in hero slots, spotlight and “Recommended”. “Hide from homepage” keeps the product in the shop.</p>
          </section>
        </div>
      )}
    </>
  );
}

function PriorityInput({ value, onSave }: { value: number; onSave: (v: number) => Promise<unknown> }) {
  const [draft, setDraft] = useState(String(value));
  return <input className="input input-sm" style={{ width: 84 }} inputMode="numeric" value={draft} onChange={e => setDraft(e.target.value.replace(/[^\d-]/g, ''))} onBlur={() => { const n = Number(draft); if (Number.isInteger(n) && n !== value) void onSave(n); else setDraft(String(value)); }} aria-label="Priority" />;
}
