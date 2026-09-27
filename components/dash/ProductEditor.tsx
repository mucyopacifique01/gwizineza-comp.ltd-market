'use client';

import { useEffect, useRef, useState, type FormEvent } from 'react';
import { apiFetch, jsonBody } from '@/lib/http';
import { slugify } from '@/lib/format';
import { TextField, SelectField, TextAreaField } from '@/components/ui/Field';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';
import { ProductImage } from '@/components/product/ProductImage';
import { GalleryManager } from './GalleryManager';
import { uploadImage, type EditorMode } from './upload';

export type { EditorMode };
export type EditableProduct = {
  id: string; sku: string; name: string; slug: string; description: string | null; priceRwf: number; compareAtPriceRwf?: number | null;
  stock: number; imageUrl: string | null; isActive: boolean; categoryId?: string | null; category?: { id: string } | null; sellerId?: string | null; seller?: { id: string } | null;
};

/** One editor for both consoles. Seller mode never sends sellerId/featuring fields (the API ignores them anyway). */
export function ProductEditor({ mode, product, categories, sellers = [], onSaved, onCancel }: { mode: EditorMode; product: EditableProduct | null; categories: { id: string; name: string }[]; sellers?: { id: string; businessName: string; status: string }[]; onSaved: () => void; onCancel: () => void }) {
  const toast = useToast();
  const editing = Boolean(product);
  const [form, setForm] = useState(() => ({
    name: product?.name ?? '', sku: product?.sku ?? '', slug: product?.slug ?? '', description: product?.description ?? '',
    priceRwf: product ? String(product.priceRwf) : '', compareAtPriceRwf: product?.compareAtPriceRwf ? String(product.compareAtPriceRwf) : '',
    stock: product ? String(product.stock) : '0', imageUrl: product?.imageUrl ?? '',
    categoryId: product?.categoryId ?? product?.category?.id ?? '', sellerId: product?.sellerId ?? product?.seller?.id ?? '', isActive: product?.isActive ?? true,
  }));
  const [slugTouched, setSlugTouched] = useState(editing);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!slugTouched) setForm(f => ({ ...f, slug: slugify(f.name) })); }, [form.name, slugTouched]);
  useEffect(() => { if (!editing && !form.sku && form.name.length > 2) setForm(f => ({ ...f, sku: `${slugify(f.name).replace(/-/g, '').slice(0, 4).toUpperCase()}-${Math.floor(Math.random() * 900 + 100)}` })); }, [editing, form.name, form.sku]);

  const set = (key: keyof typeof form) => (e: { target: { value: string } }) => setForm(f => ({ ...f, [key]: e.target.value }));

  async function onFile(file: File) {
    setUploading(true); setError(null);
    try { const url = await uploadImage(mode, file); setForm(f => ({ ...f, imageUrl: url })); toast.show('Image uploaded. Save to publish it.'); }
    catch (e) { setError(e instanceof Error ? e.message : 'Upload failed'); }
    finally { setUploading(false); }
  }

  async function save(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const price = Number(form.priceRwf);
    const stock = Number(form.stock);
    const compare = form.compareAtPriceRwf ? Number(form.compareAtPriceRwf) : null;
    if (!Number.isInteger(price) || price < 0) return setError('Price must be a whole number of RWF.');
    if (!Number.isInteger(stock) || stock < 0) return setError('Stock must be a whole number.');
    if (compare !== null && (!Number.isInteger(compare) || compare <= price)) return setError('“Was” price must be higher than the current price, or empty.');
    setSaving(true);
    const common = { name: form.name.trim(), slug: form.slug.trim(), description: form.description.trim(), priceRwf: price, stock, imageUrl: form.imageUrl.trim(), categoryId: form.categoryId || null, compareAtPriceRwf: compare };
    try {
      if (mode === 'admin') {
        const body = { ...common, sku: form.sku.trim(), sellerId: form.sellerId || null, ...(editing ? { isActive: form.isActive } : {}) };
        await apiFetch(editing ? `/api/products/${product!.id}` : '/api/products', { method: editing ? 'PATCH' : 'POST', body: jsonBody(body) });
      } else {
        await apiFetch('/api/seller/products', { method: editing ? 'PATCH' : 'POST', body: jsonBody(editing ? { id: product!.id, ...common, isActive: form.isActive } : { ...common, sku: form.sku.trim() }) });
      }
      toast.show(editing ? 'Product updated' : 'Product created');
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save product');
    } finally { setSaving(false); }
  }

  return (
    <form className="stack editor" onSubmit={save}>
      <div className="editor-image">
        <div className="editor-image-preview"><ProductImage src={form.imageUrl || null} alt={form.name || 'Product'} sizes="160px" /></div>
        <div className="stack" style={{ gap: 8 }}>
          <strong className="small">Main image</strong>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={e => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ''; }} />
          <Button variant="outline" size="sm" icon="upload" loading={uploading} onClick={() => fileRef.current?.click()}>Upload image</Button>
          <input className="input" type="url" value={form.imageUrl} onChange={set('imageUrl')} placeholder="…or paste an image URL" aria-label="Image URL" />
          <span className="field-hint">JPG/PNG/WebP up to 8 MB. Stored in Supabase Storage.</span>
        </div>
      </div>

      <div className="form-grid cols-2">
        <TextField label="Product name" required value={form.name} onChange={set('name')} className="span-2" placeholder="e.g. Soap box (12 bars)" />
        <TextField label="SKU" required value={form.sku} onChange={set('sku')} disabled={mode === 'seller' && editing} hint={mode === 'seller' && editing ? 'SKU can’t be changed' : undefined} />
        <TextField label="URL slug" required value={form.slug} onChange={e => { setSlugTouched(true); set('slug')(e); }} hint="Used in the product link" />
        <TextField label="Price (RWF)" required inputMode="numeric" value={form.priceRwf} onChange={set('priceRwf')} />
        <TextField label="“Was” price (RWF)" optional inputMode="numeric" value={form.compareAtPriceRwf} onChange={set('compareAtPriceRwf')} hint="Shows a discount badge when higher than price" />
        <TextField label="Stock" required inputMode="numeric" value={form.stock} onChange={set('stock')} />
        <SelectField label="Category" value={form.categoryId} onChange={set('categoryId')}>
          <option value="">No category</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </SelectField>
        {mode === 'admin' && (
          <SelectField label="Seller" value={form.sellerId} onChange={set('sellerId')} className="span-2" hint="Only approved sellers can receive products">
            <option value="">Gwizineza Market (no seller)</option>
            {sellers.filter(s => s.status === 'APPROVED' || s.id === form.sellerId).map(s => <option key={s.id} value={s.id}>{s.businessName}</option>)}
          </SelectField>
        )}
        <TextAreaField label="Description" optional value={form.description} onChange={set('description')} className="span-2" rows={4} />
        {editing && <label className="switch span-2"><input type="checkbox" checked={form.isActive} onChange={e => setForm(f => ({ ...f, isActive: e.target.checked }))} /><span className="switch-ui" aria-hidden="true" /> Visible in the store</label>}
      </div>

      {editing && product && <GalleryManager mode={mode} productId={product.id} productName={product.name} onPrimaryChange={url => setForm(f => ({ ...f, imageUrl: url ?? '' }))} />}

      {error && <p className="alert alert-error" role="alert"><Icon name="alert" size={16} /> {error}</p>}
      <div className="editor-actions">
        <Button variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={saving} disabled={uploading}>{editing ? 'Save changes' : 'Create product'}</Button>
      </div>
    </form>
  );
}
