'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { DashHeader } from '@/components/dash/DashShell';
import { uploadImage } from '@/components/dash/upload';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { useToast } from '@/components/ui/Toast';
import { apiFetch, jsonBody } from '@/lib/http';

type Slide = {
  id: string; imageUrl: string; title: string; subtitle: string; linkUrl: string;
  linkLabel: string; altText: string; sortOrder: number; isActive: boolean;
};
type Logo = { logo: string; logo_light: string };
type Draft = Pick<Slide, 'title' | 'subtitle' | 'linkUrl' | 'linkLabel' | 'altText'>;

const pick = (s: Slide): Draft => ({ title: s.title, subtitle: s.subtitle, linkUrl: s.linkUrl, linkLabel: s.linkLabel, altText: s.altText });

export default function SliderAdminPage() {
  const toast = useToast();
  const [slides, setSlides] = useState<Slide[]>([]);
  const [logo, setLogo] = useState<Logo | null>(null);
  const [defaults, setDefaults] = useState<Logo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const [s, l] = await Promise.all([
        apiFetch<{ slides: Slide[] }>('/api/admin/slides'),
        apiFetch<{ logo: Logo; defaults: Logo }>('/api/admin/logo'),
      ]);
      setSlides(s.slides); setLogo(l.logo); setDefaults(l.defaults); setError('');
    } catch (e) {
      if (e instanceof Error && 'status' in e && [401, 403].includes((e as { status?: number }).status ?? 0)) { window.location.href = '/admin/login'; return; }
      setError(e instanceof Error ? e.message : 'Could not load the slider.');
    } finally { setLoading(false); }
  }, []);
  useEffect(() => { void load(); }, [load]);

  async function run(key: string, fn: () => Promise<unknown>, done?: string) {
    setBusy(key);
    try { await fn(); if (done) toast.show(done); }
    catch (e) { toast.show(e instanceof Error ? e.message : 'Something went wrong', { tone: 'error' }); }
    finally { setBusy(null); }
  }

  const patchSlide = (id: string, changes: Partial<Slide>, done?: string) =>
    run(id, async () => {
      const r = await apiFetch<{ slide: Slide }>(`/api/admin/slides/${id}`, { method: 'PATCH', body: jsonBody(changes) });
      setSlides(list => list.map(s => (s.id === id ? r.slide : s)));
    }, done);

  const move = (index: number, dir: -1 | 1) => {
    const next = [...slides]; const target = index + dir;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    const previous = slides; setSlides(next);
    void run('order', async () => {
      try { await apiFetch('/api/admin/slides', { method: 'PUT', body: jsonBody({ order: next.map(s => s.id) }) }); }
      catch (e) { setSlides(previous); throw e; }
    }, 'Order saved');
  };

  const remove = (slide: Slide) => {
    if (!window.confirm('Delete this slide? This cannot be undone.')) return;
    void run(slide.id, async () => {
      await apiFetch(`/api/admin/slides/${slide.id}`, { method: 'DELETE' });
      setSlides(list => list.filter(s => s.id !== slide.id));
    }, 'Slide deleted');
  };

  async function addSlide(imageUrl: string) {
    await run('new', async () => {
      const r = await apiFetch<{ slide: Slide }>('/api/admin/slides', { method: 'POST', body: jsonBody({ imageUrl, title: '', subtitle: '', linkUrl: '', linkLabel: '' }) });
      setSlides(list => [...list, r.slide]);
    }, 'Slide added. Add a title and link below if you like.');
  }

  async function saveLogo(key: keyof Logo, value: string) {
    await run('logo-' + key, async () => {
      const r = await apiFetch<{ logo: Logo }>('/api/admin/logo', { method: 'PATCH', body: jsonBody({ [key]: value }) });
      setLogo(r.logo);
    }, value ? 'Logo updated' : 'Logo reset to the Gwizineza default');
  }

  return (
    <>
      <DashHeader eyebrow="Storefront" title="Homepage slider & logo" description="Change the sliding images on your homepage and the logo shown across the website. Changes appear on the site right away." />
      {error && <p className="alert alert-error" role="alert">{error}</p>}
      {loading ? <Skeleton style={{ height: 280 }} /> : (
        <div className="slider-admin">
          <section className="dash-card" aria-labelledby="logo-h">
            <h2 id="logo-h">Logo</h2>
            <p className="muted small">Use a square PNG with a transparent background for best results. &ldquo;Dark theme&rdquo; is shown in the website header and footer, &ldquo;Light background&rdquo; on printed receipts.</p>
            <div className="slider-logos">
              {logo && defaults && (
                <>
                  <LogoSlot label="Dark theme (header & footer)" url={logo.logo} bg="#0b1017" busy={busy === 'logo-logo'} isDefault={logo.logo === defaults.logo}
                    onUpload={url => saveLogo('logo', url)} onReset={() => saveLogo('logo', '')} />
                  <LogoSlot label="Light background (receipts)" url={logo.logo_light} bg="#ffffff" busy={busy === 'logo-logo_light'} isDefault={logo.logo_light === defaults.logo_light}
                    onUpload={url => saveLogo('logo_light', url)} onReset={() => saveLogo('logo_light', '')} />
                </>
              )}
            </div>
          </section>

          <section className="dash-card" aria-labelledby="slides-h">
            <div className="row-between wrap">
              <div><h2 id="slides-h">Slider images <span className="muted">({slides.length})</span></h2>
                <p className="muted small">Shown in this order on the homepage. Recommended size: 1600 × 700 px (wide). Max 8 MB each, up to 30 slides.</p></div>
              <AddSlide busy={busy === 'new'} onAdd={addSlide} />
            </div>
            {!slides.length && <p className="muted">No slides yet. The homepage will skip the slider until you add one.</p>}
            <ol className="slider-list">
              {slides.map((slide, i) => (
                <SlideCard key={slide.id} slide={slide} index={i} last={i === slides.length - 1} busy={busy === slide.id || busy === 'order'}
                  onMove={dir => move(i, dir)} onDelete={() => remove(slide)}
                  onToggle={() => patchSlide(slide.id, { isActive: !slide.isActive }, slide.isActive ? 'Slide hidden' : 'Slide is live')}
                  onSave={draft => patchSlide(slide.id, draft, 'Slide saved')}
                  onImage={url => patchSlide(slide.id, { imageUrl: url }, 'Image replaced')} />
              ))}
            </ol>
          </section>
        </div>
      )}
    </>
  );
}

function useUploader(onDone: (url: string) => Promise<unknown> | void) {
  const toast = useToast();
  const ref = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const choose = () => ref.current?.click();
  const onChange = async (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith('image/')) { toast.show('Please choose an image file.', { tone: 'error' }); return; }
    if (file.size > 8 * 1024 * 1024) { toast.show('That image is over 8 MB. Please choose a smaller one.', { tone: 'error' }); return; }
    setUploading(true);
    try { await onDone(await uploadImage('admin', file)); }
    catch (e) { toast.show(e instanceof Error ? e.message : 'Upload failed', { tone: 'error' }); }
    finally { setUploading(false); if (ref.current) ref.current.value = ''; }
  };
  const input = <input ref={ref} type="file" accept="image/*" hidden onChange={e => void onChange(e.target.files?.[0])} />;
  return { choose, uploading, input };
}

function AddSlide({ busy, onAdd }: { busy: boolean; onAdd: (url: string) => Promise<void> }) {
  const up = useUploader(onAdd);
  return <>{up.input}<Button icon="plus" loading={busy || up.uploading} onClick={up.choose}>Add slide</Button></>;
}

function LogoSlot({ label, url, bg, busy, isDefault, onUpload, onReset }: { label: string; url: string; bg: string; busy: boolean; isDefault: boolean; onUpload: (url: string) => Promise<void>; onReset: () => Promise<void> }) {
  const up = useUploader(onUpload);
  return (
    <div className="slider-logo">
      <div className="slider-logo-preview" style={{ background: bg }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={url} alt={label} />
      </div>
      <strong>{label}</strong>
      <div className="row wrap">
        {up.input}
        <Button size="sm" variant="outline" icon="upload" loading={busy || up.uploading} onClick={up.choose}>Upload new</Button>
        {!isDefault && <Button size="sm" variant="ghost" disabled={busy} onClick={() => void onReset()}>Reset to default</Button>}
      </div>
    </div>
  );
}

function SlideCard({ slide, index, last, busy, onMove, onDelete, onToggle, onSave, onImage }: {
  slide: Slide; index: number; last: boolean; busy: boolean;
  onMove: (dir: -1 | 1) => void; onDelete: () => void; onToggle: () => void;
  onSave: (draft: Draft) => Promise<unknown>; onImage: (url: string) => Promise<unknown>;
}) {
  const [draft, setDraft] = useState<Draft>(pick(slide));
  useEffect(() => { setDraft(pick(slide)); }, [slide]);
  const dirty = (Object.keys(draft) as (keyof Draft)[]).some(k => draft[k] !== slide[k]);
  const up = useUploader(onImage);
  const set = (k: keyof Draft) => (e: { target: { value: string } }) => setDraft(d => ({ ...d, [k]: e.target.value }));
  return (
    <li className={`slider-card${slide.isActive ? '' : ' is-hidden'}`}>
      <div className="slider-thumb">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={slide.imageUrl} alt={slide.altText || slide.title || `Slide ${index + 1}`} />
        <span className="slider-badge">{index + 1}</span>
        {!slide.isActive && <span className="slider-hidden-tag">Hidden</span>}
      </div>
      <div className="slider-fields">
        <TextField label="Title" value={draft.title} onChange={set('title')} maxLength={160} placeholder="Shown over the image" />
        <TextField label="Subtitle" value={draft.subtitle} onChange={set('subtitle')} maxLength={300} placeholder="One short line (optional)" />
        <div className="slider-two">
          <TextField label="Button text" value={draft.linkLabel} onChange={set('linkLabel')} maxLength={60} placeholder="Shop now" />
          <TextField label="Button link" value={draft.linkUrl} onChange={set('linkUrl')} maxLength={500} placeholder="/shop or https://…" hint="Starts with / or https://" />
        </div>
        <TextField label="Image description (for accessibility)" value={draft.altText} onChange={set('altText')} maxLength={240} />
        <div className="row wrap slider-actions">
          {up.input}
          <Button size="sm" disabled={!dirty || busy} loading={busy && dirty} onClick={() => void onSave(draft)}>Save changes</Button>
          <Button size="sm" variant="outline" icon="upload" loading={up.uploading} onClick={up.choose}>Replace image</Button>
          <Button size="sm" variant="outline" onClick={onToggle} disabled={busy}>{slide.isActive ? 'Hide' : 'Show'}</Button>
          <Button size="sm" variant="ghost" iconOnly icon="chevronUp" aria-label="Move up" disabled={index === 0 || busy} onClick={() => onMove(-1)} />
          <Button size="sm" variant="ghost" iconOnly icon="chevronDown" aria-label="Move down" disabled={last || busy} onClick={() => onMove(1)} />
          <Button size="sm" variant="ghost" iconOnly icon="trash" aria-label="Delete slide" disabled={busy} onClick={onDelete} />
        </div>
      </div>
    </li>
  );
}
