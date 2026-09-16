'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Seller = {
  id: string;
  businessName: string;
  ownerName: string;
  phone: string;
  email: string | null;
  address: string | null;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED';
  _count: { products: number };
};

type Product = {
  id: string;
  name: string;
  sku: string;
  imageUrl: string | null;
};

type ProductImage = {
  id: string;
  productId: string;
  url: string;
  altText: string | null;
  sortOrder: number;
  isPrimary: boolean;
};

export default function AdminPage() {
  const [sellers, setSellers] = useState<Seller[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [images, setImages] = useState<ProductImage[]>([]);
  const [selectedProductId, setSelectedProductId] = useState('');
  const [loading, setLoading] = useState(true);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [imageForm, setImageForm] = useState({ url: '', altText: '', isPrimary: false });
  const [form, setForm] = useState({ businessName: '', ownerName: '', phone: '', email: '', address: 'Kabarondo, Kayonza, Rwanda' });

  async function loadSellers() {
    const response = await fetch('/api/sellers', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not load sellers.');
    setSellers(data.sellers ?? []);
  }

  async function loadProducts() {
    const response = await fetch('/api/products?admin=true', { cache: 'no-store' });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? 'Could not load products.');
    const nextProducts: Product[] = data.products ?? [];
    setProducts(nextProducts);
    setSelectedProductId(current => current && nextProducts.some(product => product.id === current) ? current : nextProducts[0]?.id ?? '');
  }

  async function loadImages(productId: string) {
    if (!productId) { setImages([]); return; }
    setImagesLoading(true);
    try {
      const response = await fetch(`/api/product-images?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not load pictures.');
      setImages(data.images ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load pictures.');
      setImages([]);
    } finally { setImagesLoading(false); }
  }

  async function load() {
    setLoading(true);
    setMessage('');
    try { await Promise.all([loadSellers(), loadProducts()]); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Could not load admin data.'); }
    finally { setLoading(false); }
  }

  // eslint-disable-next-line react-hooks/exhaustive-deps -- initial load only; reloads are triggered explicitly by admin actions
  useEffect(() => { void load(); }, []);
  useEffect(() => { void loadImages(selectedProductId); }, [selectedProductId]);

  const selectedProduct = useMemo(() => products.find(product => product.id === selectedProductId), [products, selectedProductId]);

  async function addSeller(event: FormEvent) {
    event.preventDefault(); setMessage('');
    try {
      const response = await fetch('/api/sellers', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(form) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not add seller.');
      setForm({ businessName: '', ownerName: '', phone: '', email: '', address: 'Kabarondo, Kayonza, Rwanda' });
      setMessage('Seller added as pending. Approve the seller before assigning products.');
      await loadSellers();
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not add seller.'); }
  }

  async function changeStatus(id: string, status: Seller['status']) {
    try {
      const response = await fetch('/api/sellers', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, status }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not change seller status.');
      await loadSellers();
      setMessage(`Seller status changed to ${status}.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not change seller status.'); }
  }

  async function addImage(event: FormEvent) {
    event.preventDefault();
    if (!selectedProductId) return;
    setMessage('');
    try {
      const response = await fetch('/api/product-images', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ productId: selectedProductId, ...imageForm }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not add image.');
      setImageForm({ url: '', altText: '', isPrimary: false });
      setMessage('Product image added.');
      await loadImages(selectedProductId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not add image.'); }
  }

  async function updateImage(id: string, changes: Partial<ProductImage>) {
    try {
      const response = await fetch('/api/product-images', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ id, ...changes }) });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not update image.');
      await loadImages(selectedProductId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not update image.'); }
  }

  async function deleteImage(id: string) {
    if (!window.confirm('Remove this product image?')) return;
    try {
      const response = await fetch(`/api/product-images?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not remove image.');
      setMessage('Product image removed.');
      await loadImages(selectedProductId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not remove image.'); }
  }

  async function moveImage(image: ProductImage, direction: -1 | 1) {
    const ordered = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex(item => item.id === image.id);
    const target = ordered[index + direction];
    if (!target) return;
    try {
      await updateImage(image.id, { sortOrder: target.sortOrder });
      await updateImage(target.id, { sortOrder: image.sortOrder });
      await loadImages(selectedProductId);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Could not reorder images.'); }
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div><div className="eyebrow">Gwizineza Market</div><h1>Admin · Marketplace</h1><p className="muted">Manage sellers, products, and the product image galleries shown to customers.</p></div>
          <a className="btn btn-secondary" href="/">← Store</a>
        </header>

        <section className="admin-stats">
          <div className="admin-stat"><strong>{sellers.length}</strong><span>Total sellers</span></div>
          <div className="admin-stat"><strong>{sellers.filter(s => s.status === 'APPROVED').length}</strong><span>Approved</span></div>
          <div className="admin-stat"><strong>{sellers.filter(s => s.status === 'PENDING').length}</strong><span>Pending</span></div>
          <div className="admin-stat"><strong>{sellers.reduce((n, s) => n + s._count.products, 0)}</strong><span>Seller products</span></div>
        </section>

        <section className="admin-grid">
          <div className="admin-card">
            <div className="eyebrow">Add seller</div><h2>Create a seller</h2>
            <form className="form" onSubmit={addSeller}>
              <label>Business name</label><input required value={form.businessName} onChange={e => setForm({ ...form, businessName: e.target.value })} placeholder="ABC Shop" />
              <label>Owner name</label><input required value={form.ownerName} onChange={e => setForm({ ...form, ownerName: e.target.value })} placeholder="Seller owner" />
              <label>Phone</label><input required value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" />
              <label>Email</label><input type="email" value={form.email} onChange={e => setForm({ ...form, email: e.target.value })} placeholder="seller@example.com" />
              <label>Business address</label><input value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} />
              <button className="btn btn-primary" type="submit">Add seller</button>
            </form>
            {message && <p className="note">{message}</p>}
          </div>

          <div className="admin-card">
            <div className="eyebrow">Marketplace</div><h2>Seller list</h2>
            {loading ? <p>Loading sellers...</p> : sellers.length === 0 ? <p className="muted">No sellers yet. Add the first seller using the form.</p> : <div className="seller-list">
              {sellers.map(seller => <article className="seller-row" key={seller.id}>
                <div><strong>{seller.businessName}</strong><div className="muted">Owner: {seller.ownerName} · {seller.phone}</div><div className="muted">{seller.address ?? 'No address'} · {seller._count.products} products</div></div>
                <div className="seller-actions"><span className={`status status-${seller.status.toLowerCase()}`}>{seller.status}</span>{seller.status !== 'APPROVED' && <button className="btn btn-primary" onClick={() => changeStatus(seller.id, 'APPROVED')}>Approve</button>}{seller.status === 'APPROVED' && <button className="btn btn-secondary" onClick={() => changeStatus(seller.id, 'SUSPENDED')}>Suspend</button>}{seller.status === 'SUSPENDED' && <button className="btn btn-primary" onClick={() => changeStatus(seller.id, 'APPROVED')}>Reactivate</button>}</div>
              </article>)}
            </div>}
          </div>
        </section>

        <section className="admin-card image-manager">
          <div className="eyebrow">Product gallery</div>
          <h2>Change product pictures</h2>
          <p className="muted">Each product can have several pictures. Choose a main picture, reorder the smaller pictures, or remove them.</p>
          <label>Product</label>
          <select className="admin-select" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}><option value="">Select a product</option>{products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}</select>
          {selectedProduct && <>
            <div className="gallery-preview"><div className="gallery-main">{images.find(image => image.isPrimary) ? <img src={images.find(image => image.isPrimary)?.url} alt={images.find(image => image.isPrimary)?.altText ?? selectedProduct.name} /> : <div className="gallery-empty">No main image yet</div>}</div><div className="gallery-stack">{images.filter(image => !image.isPrimary).slice(0, 4).map((image, index) => <div className="gallery-stack-item" key={image.id} style={{ transform: `translateX(${index * 12}px) scale(${1 - index * 0.06})`, zIndex: 10 - index }}><img src={image.url} alt={image.altText ?? selectedProduct.name} /></div>)}</div></div>
            <form className="image-add-form" onSubmit={addImage}><input required value={imageForm.url} onChange={e => setImageForm({ ...imageForm, url: e.target.value })} placeholder="https://.../soap-box.jpg" /><input value={imageForm.altText} onChange={e => setImageForm({ ...imageForm, altText: e.target.value })} placeholder="Image description" /><label className="checkbox-label"><input type="checkbox" checked={imageForm.isPrimary} onChange={e => setImageForm({ ...imageForm, isPrimary: e.target.checked })} /> Make main image</label><button className="btn btn-primary" type="submit">Add picture</button></form>
            {imagesLoading ? <p>Loading pictures...</p> : images.length === 0 ? <p className="muted">No pictures yet. Add the first picture above.</p> : <div className="image-list">{[...images].sort((a, b) => a.sortOrder - b.sortOrder).map((image, index, ordered) => <article className="image-row" key={image.id}><img src={image.url} alt={image.altText ?? selectedProduct.name} /><div className="image-row-info"><strong>{image.isPrimary ? 'Main image' : `Gallery image ${index + 1}`}</strong><span className="muted">{image.altText || image.url}</span></div><div className="seller-actions">{!image.isPrimary && <button className="btn btn-primary" onClick={() => updateImage(image.id, { isPrimary: true })}>Make main</button>}<button className="btn btn-secondary" disabled={index === 0} onClick={() => moveImage(image, -1)}>←</button><button className="btn btn-secondary" disabled={index === ordered.length - 1} onClick={() => moveImage(image, 1)}>→</button><button className="btn btn-secondary" onClick={() => deleteImage(image.id)}>Remove</button></div></article>)}</div>}
          </>}
        </section>

        <div className="admin-warning"><strong>Security:</strong> Admin API access is protected by the admin session. Product image uploads use protected server-side storage access.</div>
      </div>
    </main>
  );
}
