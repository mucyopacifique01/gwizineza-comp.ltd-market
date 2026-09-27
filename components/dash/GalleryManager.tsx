'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { apiFetch, jsonBody } from '@/lib/http';
import { ImageStack } from '@/components/product/ImageStack';
import { ProductImage } from '@/components/product/ProductImage';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/components/ui/Toast';
import { uploadImage, type EditorMode } from './upload';

type Img = { id: string; url: string; altText: string | null; sortOrder: number; isPrimary: boolean };
const BASE: Record<EditorMode, string> = { admin: '/api/product-images', seller: '/api/seller/product-images' };

/** Gallery for extra product photos, with a live preview of the layered presentation. */
export function GalleryManager({ mode, productId, productName, onPrimaryChange }: { mode: EditorMode; productId: string; productName: string; onPrimaryChange: (url: string | null) => void }) {
  const toast = useToast();
  const [images, setImages] = useState<Img[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [url, setUrl] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    try { const d = await apiFetch<{ images: Img[] }>(`${BASE[mode]}?productId=${productId}`); setImages(d.images); }
    catch (e) { toast.show(e instanceof Error ? e.message : 'Could not load images', { tone: 'error' }); }
    finally { setLoading(false); }
  }, [mode, productId, toast]);
  useEffect(() => { void load(); }, [load]);

  const ordered = [...images].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary) || a.sortOrder - b.sortOrder);
  const primary = ordered[0];

  async function run(fn: () => Promise<unknown>, done?: string) {
    setBusy(true);
    try { await fn(); await load(); if (done) toast.show(done); }
    catch (e) { toast.show(e instanceof Error ? e.message : 'Something went wrong', { tone: 'error' }); }
    finally { setBusy(false); }
  }

  const add = (imageUrl: string) => run(async () => { await apiFetch(BASE[mode], { method: 'POST', body: jsonBody({ productId, url: imageUrl, altText: productName }) }); if (!images.length) onPrimaryChange(imageUrl); setUrl(''); }, 'Image added');
  const makeMain = (img: Img) => run(async () => { await apiFetch(BASE[mode], { method: 'PATCH', body: jsonBody({ id: img.id, isPrimary: true }) }); onPrimaryChange(img.url); }, 'Main image updated');
  const remove = (img: Img) => { if (window.confirm('Remove this image?')) void run(() => apiFetch(`${BASE[mode]}?id=${img.id}`, { method: 'DELETE' }), 'Image removed'); };
  const move = (img: Img, dir: -1 | 1) => {
    const list = ordered.filter(i => !i.isPrimary);
    const idx = list.findIndex(i => i.id === img.id);
    const other = list[idx + dir];
    if (!other) return;
    void run(async () => {
      await apiFetch(BASE.admin, { method: 'PATCH', body: jsonBody({ id: img.id, sortOrder: other.sortOrder }) });
      await apiFetch(BASE.admin, { method: 'PATCH', body: jsonBody({ id: other.id, sortOrder: img.sortOrder }) });
    });
  };

  return (
    <section className="gallery-mgr">
      <div className="row-between"><strong>Gallery</strong><span className="muted tiny">{images.length} image{images.length === 1 ? '' : 's'}</span></div>
      {primary && (
        <div className="gallery-mgr-preview" aria-label="Storefront preview">
          <ImageStack size="sm" main={{ key: primary.id, src: primary.url, alt: productName }} behind={ordered.slice(1, 4).map(i => ({ key: i.id, src: i.url, alt: '' }))} />
          <span className="muted tiny">How the layered gallery looks to customers</span>
        </div>
      )}
      {loading ? <p className="muted small">Loading images…</p> : (
        <ul className="gallery-mgr-list">
          {ordered.map((img, i) => (
            <li key={img.id}>
              <span className="gallery-mgr-thumb"><ProductImage src={img.url} alt="" sizes="72px" /></span>
              <span className="grow small">{img.isPrimary ? <strong>Main image</strong> : `Image ${i + 1}`}</span>
              {!img.isPrimary && <Button size="sm" variant="outline" disabled={busy} onClick={() => void makeMain(img)}>Make main</Button>}
              {mode === 'admin' && !img.isPrimary && <><Button size="sm" variant="ghost" iconOnly icon="chevronLeft" disabled={busy} onClick={() => move(img, -1)} aria-label="Move earlier" /><Button size="sm" variant="ghost" iconOnly icon="chevronRight" disabled={busy} onClick={() => move(img, 1)} aria-label="Move later" /></>}
              <Button size="sm" variant="ghost" iconOnly icon="trash" disabled={busy} onClick={() => remove(img)} aria-label="Remove image" />
            </li>
          ))}
        </ul>
      )}
      <div className="row wrap">
        <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; e.target.value = ''; if (f) void run(async () => { const u = await uploadImage(mode, f); await apiFetch(BASE[mode], { method: 'POST', body: jsonBody({ productId, url: u, altText: productName }) }); if (!images.length) onPrimaryChange(u); }, 'Image uploaded'); }} />
        <Button size="sm" variant="outline" icon="upload" loading={busy} onClick={() => fileRef.current?.click()}>Upload photo</Button>
        <input className="input grow" style={{ minHeight: 36 }} type="url" placeholder="or paste image URL" value={url} onChange={e => setUrl(e.target.value)} aria-label="Gallery image URL" />
        <Button size="sm" variant="dark" disabled={!url || busy} onClick={() => void add(url)}>Add</Button>
      </div>
    </section>
  );
}
