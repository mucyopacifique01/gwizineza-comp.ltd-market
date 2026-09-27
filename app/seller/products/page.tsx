'use client';

import { useEffect, useMemo, useState } from 'react';
import { useQueryParam } from '@/lib/use-query-param';
import { useApi } from '@/lib/use-api';
import { apiFetch, jsonBody } from '@/lib/http';
import { formatRwf } from '@/lib/format';
import { useSellerProducts, type SellerProduct } from '@/components/dash/useSellerProducts';
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

/** Seller products. Every call goes through /api/seller/* which scopes to the signed-in seller server-side. */
export default function SellerProductsPage() {
  const toast = useToast();
  const products = useSellerProducts();
  const cats = useApi<{ categories: { id: string; name: string }[] }>('/api/categories');
  const qNew = useQueryParam('new');
  const [editing, setEditing] = useState<SellerProduct | null | 'new'>(null);
  const [q, setQ] = useState('');
  useEffect(() => { if (qNew) setEditing('new'); }, [qNew]);

  const list = useMemo(() => (products.data?.products ?? []).filter(p => `${p.name} ${p.sku}`.toLowerCase().includes(q.toLowerCase())), [products.data, q]);

  async function saveStock(p: SellerProduct, stock: number) {
    await apiFetch('/api/seller/products', { method: 'PATCH', body: jsonBody({ id: p.id, stock }) });
    products.setData(d => d && { products: d.products.map(x => (x.id === p.id ? { ...x, stock } : x)) });
    toast.show(`Stock updated: ${stock}`);
  }

  async function toggle(p: SellerProduct) {
    try {
      await apiFetch('/api/seller/products', { method: 'PATCH', body: jsonBody({ id: p.id, isActive: !p.isActive }) });
      products.setData(d => d && { products: d.products.map(x => (x.id === p.id ? { ...x, isActive: !p.isActive } : x)) });
      toast.show(p.isActive ? 'Hidden from the store' : 'Visible in the store');
    } catch (e) { toast.show(e instanceof Error ? e.message : 'Could not update', { tone: 'error' }); }
  }

  return (
    <>
      <DashHeader eyebrow="Catalogue" title="My products" description="Only you (and the owner) can see and edit these products." actions={<Button icon="plus" onClick={() => setEditing('new')}>Add product</Button>} />
      <div className="dash-toolbar"><div className="input-group grow"><Icon name="search" size={18} /><input className="input" placeholder="Search your products" value={q} onChange={e => setQ(e.target.value)} aria-label="Search products" /></div></div>
      {products.loading && !products.data ? <Skeleton height={360} radius={24} /> : products.error ? <ErrorState description={products.error}><Button onClick={() => void products.reload()}>Retry</Button></ErrorState> : list.length === 0 ? (
        <EmptyState art="box" title={products.data?.products.length ? 'No matches' : 'No products yet'} description={products.data?.products.length ? 'Try a different search.' : 'Add your first product to start selling.'}><Button icon="plus" onClick={() => setEditing('new')}>Add product</Button></EmptyState>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead><tr><th>Product</th><th className="hide-md">Category</th><th className="num">Price</th><th>Stock</th><th>Visibility</th><th /></tr></thead>
            <tbody>{list.map(p => (
              <tr key={p.id} className={!p.isActive ? 'row-muted' : undefined}>
                <td><div className="row"><span className="mini-thumb"><ProductImage src={p.imageUrl ?? p.images[0]?.url} alt="" sizes="48px" /></span><div><strong>{p.name}</strong><div className="muted tiny mono">{p.sku}</div></div></div></td>
                <td className="hide-md">{p.category?.name ?? <span className="muted">—</span>}</td>
                <td className="num"><strong>{formatRwf(p.priceRwf)}</strong></td>
                <td><StockEditor value={p.stock} onSave={v => saveStock(p, v)} /></td>
                <td><button className="linklike" onClick={() => void toggle(p)}>{p.isActive ? <Badge tone="green" dot>Visible</Badge> : <Badge tone="outline">Hidden</Badge>}</button></td>
                <td><Button size="sm" variant="ghost" icon="edit" onClick={() => setEditing(p)}>Edit</Button></td>
              </tr>
            ))}</tbody>
          </table>
        </div>
      )}
      <Sheet open={editing !== null} onClose={() => setEditing(null)} side="right" title={editing === 'new' ? 'New product' : 'Edit product'}>
        {editing !== null && (
          <ProductEditor key={editing === 'new' ? 'new' : editing.id} mode="seller" product={editing === 'new' ? null : editing} categories={cats.data?.categories ?? []} onCancel={() => setEditing(null)} onSaved={() => { setEditing(null); void products.reload(); }} />
        )}
      </Sheet>
    </>
  );
}
