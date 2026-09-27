'use client';

import { FormEvent, useEffect, useState } from 'react';

type Seller = { id: string; businessName: string; ownerName: string; phone: string; email: string | null; address: string | null; status: string; _count: { products: number } };
type Category = { id: string; name: string; slug: string };
type Product = { id: string; sku: string; name: string; slug: string; description: string | null; priceRwf: number; stock: number; imageUrl: string | null; isActive: boolean; categoryId: string | null };

const emptyForm = { sku: '', name: '', slug: '', description: '', priceRwf: '', stock: '0', imageUrl: '', categoryId: '' };

export default function SellerDashboard() {
  const [seller, setSeller] = useState<Seller | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [editingId, setEditingId] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [meResponse, productsResponse, categoriesResponse] = await Promise.all([
        fetch('/api/seller/me', { cache: 'no-store' }),
        fetch('/api/seller/products', { cache: 'no-store' }),
        fetch('/api/categories', { cache: 'no-store' }),
      ]);
      const me = await meResponse.json();
      const productData = await productsResponse.json();
      const categoryData = await categoriesResponse.json();
      if (!meResponse.ok) throw new Error(me.error ?? 'Seller session expired');
      if (!productsResponse.ok) throw new Error(productData.error ?? 'Could not load products');
      setSeller(me.seller);
      setProducts(productData.products ?? []);
      setCategories(categoryData.categories ?? []);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not load seller dashboard');
      if (error instanceof Error && /session|authentication/i.test(error.message)) window.location.href = '/seller/login';
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { void load(); }, []);

  function editProduct(product: Product) {
    setEditingId(product.id);
    setForm({
      sku: product.sku,
      name: product.name,
      slug: product.slug,
      description: product.description ?? '',
      priceRwf: String(product.priceRwf),
      stock: String(product.stock),
      imageUrl: product.imageUrl ?? '',
      categoryId: product.categoryId ?? '',
    });
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function resetForm() {
    setEditingId('');
    setForm(emptyForm);
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage('');
    const payload = {
      ...form,
      priceRwf: Number(form.priceRwf),
      stock: Number(form.stock),
    };
    try {
      const response = await fetch('/api/seller/products', {
        method: editingId ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingId ? { id: editingId, ...payload } : payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not save product');
      setMessage(editingId ? 'Product updated successfully.' : 'Product added successfully.');
      resetForm();
      await load();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not save product');
    }
  }

  async function logout() {
    await fetch('/api/seller/auth/logout', { method: 'POST' });
    window.location.href = '/seller/login';
  }

  return (
    <main className="admin-page">
      <div className="admin-shell">
        <header className="admin-header">
          <div>
            <div className="eyebrow">Gwizineza Market</div>
            <h1>Seller Admin</h1>
            <p className="muted">{seller ? seller.businessName : 'Loading seller...'} · Manage your products</p>
          </div>
          <div className="seller-actions">
            <a className="btn btn-secondary" href="/">Store</a>
            <button className="btn btn-secondary" onClick={logout}>Sign out</button>
          </div>
        </header>

        {seller && <section className="admin-stats">
          <div className="admin-stat"><strong>{seller._count.products}</strong><span>Your products</span></div>
          <div className="admin-stat"><strong>{seller.status}</strong><span>Account status</span></div>
          <div className="admin-stat"><strong>{seller.phone}</strong><span>Phone</span></div>
        </section>}

        <section className="admin-grid">
          <div className="admin-card">
            <div className="eyebrow">{editingId ? 'Edit product' : 'Add product'}</div>
            <h2>{editingId ? 'Update your product' : 'Create a product'}</h2>
            <form className="form" onSubmit={submit}>
              <label>SKU</label><input required value={form.sku} onChange={e => setForm({ ...form, sku: e.target.value })} disabled={Boolean(editingId)} placeholder="SOAP-001" />
              <label>Product name</label><input required value={form.name} onChange={e => setForm({ ...form, name: e.target.value })} placeholder="Soap Box" />
              <label>Slug</label><input required value={form.slug} onChange={e => setForm({ ...form, slug: e.target.value })} placeholder="soap-box" />
              <label>Description</label><textarea value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} placeholder="Product description" />
              <label>Price (RWF)</label><input required type="number" min="0" step="1" value={form.priceRwf} onChange={e => setForm({ ...form, priceRwf: e.target.value })} />
              <label>Stock</label><input required type="number" min="0" step="1" value={form.stock} onChange={e => setForm({ ...form, stock: e.target.value })} />
              <label>Category</label><select value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">No category</option>{categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}</select>
              <label>Image URL</label><input value={form.imageUrl} onChange={e => setForm({ ...form, imageUrl: e.target.value })} placeholder="https://..." />
              <div className="seller-actions">
                <button className="btn btn-primary" type="submit">{editingId ? 'Save changes' : 'Add product'}</button>
                {editingId && <button className="btn btn-secondary" type="button" onClick={resetForm}>Cancel</button>}
              </div>
            </form>
            {message && <p className="note">{message}</p>}
          </div>

          <div className="admin-card">
            <div className="eyebrow">My products</div>
            <h2>Product list</h2>
            {loading ? <p>Loading products...</p> : products.length === 0 ? <p className="muted">You have not added any products yet.</p> : (
              <div className="seller-list">
                {products.map(product => (
                  <article className="seller-row" key={product.id}>
                    {product.imageUrl ? <img src={product.imageUrl} alt={product.name} style={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 12 }} /> : <div style={{ width: 72, height: 72, borderRadius: 12, background: '#eee' }} />}
                    <div style={{ flex: 1 }}><strong>{product.name}</strong><div className="muted">{product.sku} · {product.priceRwf.toLocaleString()} RWF · Stock {product.stock}</div><div className="muted">{product.isActive ? 'Visible in store when seller is approved' : 'Hidden'}</div></div>
                    <button className="btn btn-secondary" onClick={() => editProduct(product)}>Edit</button>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
