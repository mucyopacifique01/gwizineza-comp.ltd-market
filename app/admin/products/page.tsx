'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApi } from '@/lib/use-api';
import { useQueryParam } from '@/lib/use-query-param';
import { apiFetch, jsonBody } from '@/lib/http';
import { formatRwf } from '@/lib/format';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import type { ProductDTO } from '@/lib/types';
import { primaryImage } from '@/lib/merchandising';
import { DashHeader } from '@/components/dash/DashShell';
import { ProductEditor } from '@/components/dash/ProductEditor';
import { StockEditor } from '@/components/dash/StockEditor';
import { ProductImage } from '@/components/product/ProductImage';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Sheet } from '@/components/ui/Modal';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Icon } from '@/components/ui/Icon';
import { useToast } from '@/components/ui/Toast';

type Seller = { id: string; businessName: string; status: string };
type Category = { id: string; name: string };

export default function ProductsAdmin() {
  const toast = useToast();
  const products = useApi<{ products: ProductDTO[] }>('/api/products?admin=true', { loginPath: '/admin/login' });
  const cats = useApi<{ categories: Category[] }>('/api/categories');
  const sellers = useApi<{ sellers: Seller[] }>('/api/sellers', { loginPath: '/admin/login' });
  const qNew = useQueryParam('new');
  const qStock = useQueryParam('stock');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState<'all' | 'active' | 'archived'>('active');
  const [stock, setStock] = useState<'all' | 'low' | 'out'>('all');
  const [sellerFilter, setSellerFilter] = useState('');
  const [editing, setEditing] = useState<ProductDTO | null | 'new'>(null);

  useEffect(() => { if (qNew) setEditing('new'); }, [qNew]);
  useEffect(() => { if (qStock === 'low') setStock('low'); }, [qStock]);

  const list = useMemo(() => (products.data?.products ?? []).filter(p =>
    (status === 'all' || (status === 'active' ? p.isActive : !p.isActive)) &&
    (stock === 'all' || (stock === 'out' ? p.stock === 0 : p.stock <= LOW_STOCK_THRESHOLD)) &&
    (!sellerFilter || (sellerFilter === 'none' ? !p.seller : p.seller?.id === sellerFilter)) &&
    `${p.name} ${p.sku} ${p.category?.name ?? ''}`.toLowerCase().includes(q.toLowerCase())), [products.data, q, status, stock, sellerFilter]);

  async function toggleActive(p: ProductDTO) {
    try {
      if (p.isActive) { if (!window.confirm(`Archive “${p.name}”? It will be hidden from the store.`)) return; await apiFetch(`/api/products/${p.id}`, { method: 'DELETE' }); }
      else await apiFetch(`/api/products/${p.id}`, { method: 'PATCH', body: jsonBody({ isActive: true }) });
      toast.show(p.isActive ? 'Product archived' : 'Product restored');
      await products.reload();
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Action failed', { tone: 'error' }); }
  }

  async function saveStock(p: ProductDTO, value: number) {
    await apiFetch(`/api/products/${p.id}`, { method: 'PATCH', body: jsonBody({ stock: value }) });
    products.setData(d => d && { products: d.products.map(x => (x.id === p.id ? { ...x, stock: value } : x)) });
    toast.show(`Stock for ${p.name}: ${value}`);
  }

  const all = products.data?.products ?? [];
  const lowCount = all.filter(p => p.isActive && p.stock <= LOW_STOCK_THRESHOLD).length;

  return (
    <>
      <DashHeader eyebrow="Catalogue" title="Products & inventory" description={`${all.length} products · ${lowCount} low or out of stock`} actions={<Button icon="plus" onClick={() => setEditing('new')}>Add product</Button>} />
      <div className="dash-toolbar">
        <div className="input-group grow"><Icon name="search" size={18} /><input className="input" placeholder="Search name, SKU or category" value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" /></div>
        <select className="select select-auto" value={status} onChange={e => setStatus(e.target.value as typeof status)} aria-label="Visibility"><option value="active">Live</option><option value="archived">Archived</option><option value="all">All</option></select>
        <select className="select select-auto" value={stock} onChange={e => setStock(e.target.value as typeof stock)} aria-label="Stock"><option value="all">Any stock</option><option value="low">Low stock (≤{LOW_STOCK_THRESHOLD})</option><option value="out">Out of stock</option></select>
        <select className="select select-auto" value={sellerFilter} onChange={e => setSellerFilter(e.target.value)} aria-label="Seller"><option value="">All sellers</option><option value="none">Gwizineza Market</option>{(sellers.data?.sellers ?? []).map(s => <option key={s.id} value={s.id}>{s.businessName}</option>)}</select>
      </div>

      {products.loading && !products.data ? <Skeleton height={420} radius={24} /> : products.error ? <ErrorState description={products.error}><Button onClick={() => void products.reload()}>Retry</Button></ErrorState> : list.length === 0 ? (
        <EmptyState art="box" title="No products found" description="Try different filters or add a new product."><Button icon="plus" onClick={() => setEditing('new')}>Add product</Button></EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th className="hide-md">Category</th><th className="hide-md">Seller</th><th className="num">Price</th><th>Stock</th><th>Status</th><th /></tr></thead>
            <tbody>
              {list.map(p => (
                <tr key={p.id} className={!p.isActive ? 'row-muted' : undefined}>
                  <td><div className="row"><span className="mini-thumb"><ProductImage src={primaryImage(p)} alt="" sizes="48px" /></span><div><strong>{p.name}</strong><div className="muted tiny mono">{p.sku}</div></div></div></td>
                  <td className="hide-md">{p.category?.name ?? <span className="muted">—</span>}</td>
                  <td className="hide-md">{p.seller?.businessName ?? <span className="muted">Marketplace</span>}</td>
                  <td className="num"><strong>{formatRwf(p.priceRwf)}</strong>{p.compareAtPriceRwf ? <div className="muted tiny"><s>{formatRwf(p.compareAtPriceRwf)}</s></div> : null}</td>
                  <td><StockEditor value={p.stock} onSave={v => saveStock(p, v)} /></td>
                  <td>{p.isActive ? <Badge tone="green" dot>Live</Badge> : <Badge tone="outline">Archived</Badge>}{p.isFeatured && <Badge tone="sun" className="ml-4">Featured</Badge>}</td>
                  <td><div className="row" style={{ justifyContent: 'flex-end', gap: 4 }}>
                    <Button size="sm" variant="ghost" iconOnly icon="edit" onClick={() => setEditing(p)} aria-label={`Edit ${p.name}`} />
                    <Button size="sm" variant="ghost" iconOnly icon={p.isActive ? 'trash' : 'refresh'} onClick={() => void toggleActive(p)} aria-label={p.isActive ? `Archive ${p.name}` : `Restore ${p.name}`} />
                  </div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Sheet open={editing !== null} onClose={() => setEditing(null)} side="right" title={editing === 'new' ? 'New product' : 'Edit product'}>
        {editing !== null && (
          <ProductEditor
            key={editing === 'new' ? 'new' : editing.id}
            mode="admin"
            product={editing === 'new' ? null : editing}
            categories={cats.data?.categories ?? []}
            sellers={sellers.data?.sellers ?? []}
            onCancel={() => setEditing(null)}
            onSaved={() => { setEditing(null); void products.reload(); }}
          />
        )}
      </Sheet>
    </>
  );
}
