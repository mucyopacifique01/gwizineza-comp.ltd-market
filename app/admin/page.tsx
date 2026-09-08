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
    setSellers(data.sellers ?? []);
  }

  async function loadProducts() {
    const response = await fetch('/api/products?admin=true', { cache: 'no-store' });
    const data = await response.json();
    const nextProducts: Product[] = data.products ?? [];
    setProducts(nextProducts);
    if (!selectedProductId && nextProducts[0]) setSelectedProductId(nextProducts[0].id);
  }

  async function loadImages(productId: string) {
    if (!productId) {
      setImages([]);
      return;
    }
    setImagesLoading(true);
    const response = await fetch(`/api/product-images?productId=${encodeURIComponent(productId)}`, { cache: 'no-store' });
    const data = await response.json();
    setImages(data.images ?? []);
    setImagesLoading(false);
  }

  async function load() {
    setLoading(true);
    await Promise.all([loadSellers(), loadProducts()]);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { loadImages(selectedProductId); }, [selectedProductId]);

  const selectedProduct = useMemo(() => products.find(product => product.id === selectedProductId), [products, selectedProductId]);

  async function addSeller(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const response = await fetch('/api/sellers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Could not add seller.'); return; }
    setForm({ businessName: '', ownerName: '', phone: '', email: '', address: 'Kabarondo, Kayonza, Rwanda' });
    setMessage('Seller added and approved.');
    await loadSellers();
  }

  async function changeStatus(id: string, status: Seller['status']) {
    const response = await fetch('/api/sellers', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, status }),
    });
    if (response.ok) await loadSellers();
  }

  async function addImage(event: FormEvent) {
    event.preventDefault();
    if (!selectedProductId) return;
    setMessage('');
    const response = await fetch('/api/product-images', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ productId: selectedProductId, ...imageForm }),
    });
    const data = await response.json();
    if (!response.ok) { setMessage(data.error ?? 'Could not add image.'); return; }
    setImageForm({ url: '', altText: '', isPrimary: false });
    setMessage('Product image added.');
    await loadImages(selectedProductId);
  }

  async function updateImage(id: string, changes: Partial<ProductImage>) {
    const response = await fetch('/api/product-images', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id, ...changes }),
    });
    if (response.ok) await loadImages(selectedProductId);
  }

  async function deleteImage(id: string) {
    if (!window.confirm('Remove this product image?')) return;
    const response = await fetch(`/api/product-images?id=${encodeURIComponent(id)}`, { method: 'DELETE' });
    if (response.ok) {
      setMessage('Product image removed.');
      await loadImages(selectedProductId);
    }
  }

  async function moveImage(image: ProductImage, direction: -1 | 1) {
    const ordered = [...images].sort((a, b) => a.sortOrder - b.sortOrder);
    const index = ordered.findIndex(item => item.id === image.id);
    const target = ordered[index + direction];
    if (!target) return;
    await Promise.all([
      updateImage(image.id, { sortOrder: target.sortOrder }),
      updateImage(target.id, { sortOrder: image.sortOrder }),
    ]);
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
          <select className="admin-select" value={selectedProductId} onChange={e => setSelectedProductId(e.target.value)}>
            <option value="">Select a product</option>
            {products.map(product => <option key={product.id} value={product.id}>{product.name} · {product.sku}</option>)}
          </select>

          {selectedProduct && (
            <>
              <div className="gallery-preview">
                <div className="gallery-main">
                  {images.find(image => image.isPrimary) ? <img src={images.find(image => image.isPrimary)?.url} alt={images.find(image => image.isPrimary)?.altText ?? selectedProduct.name} /> : <div className="gallery-empty">No main image yet</div>}
                </div>
                <div className="gallery-stack">
                  {images.filter(image => !image.isPrimary).slice(0, 4).map((image, index) => <div className="gallery-stack-item" key={image.id} style={{ transform: `translateX(${index * 12}px) scale(${1 - index * 0.06})`, zIndex: 10 - index }}><img src={image.url} alt={image.altText ?? selectedProduct.name} /></div>)}
                </div>
              </div>

              <form className="image-add-form" onSubmit={addImage}>
                <input required value={imageForm.url} onChange={e => setImageForm({ ...imageForm, url: e.target.value })} placeholder="https://.../soap-box.jpg" />
                <input value={imageForm.altText} onChange={e => setImageForm({ ...imageForm, altText: e.target.value })} placeholder="Image description" />
                <label className="checkbox-label"><input type="checkbox" checked={imageForm.isPrimary} onChange={e => setImageForm({ ...imageForm, isPrimary: e.target.checked })} /> Make main image</label>
                <button className="btn btn-primary" type="submit">Add picture</button>
              </form>

              {imagesLoading ? <p>Loading pictures...</p> : images.length === 0 ? <p className="muted">No pictures yet. Add the first picture above.</p> : <div className="image-list">
                {[...images].sort((a, b) => a.sortOrder - b.sortOrder).map((image, index, ordered) => <article className="image-row" key={image.id}>
                  <img src={image.url} alt={image.altText ?? selectedProduct.name} />
                  <div className="image-row-info"><strong>{image.isPrimary ? 'Main image' : `Gallery image ${index + 1}`}</strong><span className="muted">{image.altText || image.url}</span></div>
                  <div className="seller-actions">
                    {!image.isPrimary && <button className="btn btn-primary" onClick={() => updateImage(image.id, { isPrimary: true })}>Make main</button>}
                    <button className="btn btn-secondary" disabled={index === 0} onClick={() => moveImage(image, -1)}>←</button>
                    <button className="btn btn-secondary" disabled={index === ordered.length - 1} onClick={() => moveImage(image, 1)}>→</button>
                    <button className="btn btn-secondary" onClick={() => deleteImage(image.id)}>Remove</button>
                  </div>
                </article>)}
              </div>}
            </>
          )}
        </section>

        <div className="admin-warning"><strong>Security:</strong> this is the admin/seller management foundation. Authentication and role-based authorization must be added before this page or its API is exposed publicly. Image URLs can be replaced with secure uploads/storage later.</div>
      </div>
    </main>
  );
}
