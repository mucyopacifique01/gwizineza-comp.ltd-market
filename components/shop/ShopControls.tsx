'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState, useTransition, type FormEvent } from 'react';
import type { CategoryDTO } from '@/lib/types';
import { SORT_OPTIONS } from '@/lib/types';
import { Icon } from '@/components/ui/Icon';
import { Sheet } from '@/components/ui/Modal';
import { toQuery, type ShopParams } from './types';

type Props = { params: ShopParams; categories: CategoryDTO[]; sellers: { id: string; businessName: string }[]; total: number };

function FilterPanel({ params, categories, sellers, apply }: Omit<Props, 'total'> & { apply: (next: Partial<ShopParams>) => void }) {
  const [min, setMin] = useState(params.minPrice);
  const [max, setMax] = useState(params.maxPrice);
  useEffect(() => { setMin(params.minPrice); setMax(params.maxPrice); }, [params.minPrice, params.maxPrice]);
  const submitPrice = (e: FormEvent) => { e.preventDefault(); apply({ minPrice: min.replace(/\D/g, ''), maxPrice: max.replace(/\D/g, '') }); };

  return (
    <div className="filters">
      <fieldset className="filter-group">
        <legend>Category</legend>
        <div className="filter-options">
          <label className={`filter-opt${!params.category ? ' is-on' : ''}`}><input type="radio" name="category" checked={!params.category} onChange={() => apply({ category: '' })} /> All categories</label>
          {categories.map(c => (
            <label key={c.id} className={`filter-opt${params.category === c.slug ? ' is-on' : ''}`}><input type="radio" name="category" checked={params.category === c.slug} onChange={() => apply({ category: c.slug })} /> {c.name}</label>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Price (RWF)</legend>
        <form className="price-range" onSubmit={submitPrice}>
          <input className="input" inputMode="numeric" placeholder="Min" value={min} onChange={e => setMin(e.target.value)} aria-label="Minimum price in RWF" />
          <span aria-hidden="true">–</span>
          <input className="input" inputMode="numeric" placeholder="Max" value={max} onChange={e => setMax(e.target.value)} aria-label="Maximum price in RWF" />
          <button className="btn btn-dark btn-sm" type="submit">Apply</button>
        </form>
        <div className="chip-cloud" style={{ marginTop: 10 }}>
          {[[0, 1000], [1000, 5000], [5000, 20000], [20000, 0]].map(([a, b]) => (
            <button key={`${a}-${b}`} type="button" className="chip chip-sm" onClick={() => apply({ minPrice: a ? String(a) : '', maxPrice: b ? String(b) : '' })}>
              {b ? `${a ? a.toLocaleString() : 'Under'}${a ? '–' : ' '}${b.toLocaleString()}` : `${a.toLocaleString()}+`}
            </button>
          ))}
        </div>
      </fieldset>

      <fieldset className="filter-group">
        <legend>Availability</legend>
        <label className="switch"><input type="checkbox" checked={params.inStock} onChange={e => apply({ inStock: e.target.checked })} /><span className="switch-ui" aria-hidden="true" /> In stock only</label>
      </fieldset>

      {sellers.length > 0 && (
        <fieldset className="filter-group">
          <legend>Seller</legend>
          <select className="select" value={params.seller} onChange={e => apply({ seller: e.target.value })} aria-label="Filter by seller">
            <option value="">All sellers</option>
            {sellers.map(s => <option key={s.id} value={s.id}>{s.businessName}</option>)}
          </select>
        </fieldset>
      )}
    </div>
  );
}

export function ShopSidebar(props: Omit<Props, 'total'>) {
  const router = useRouter();
  const [, start] = useTransition();
  const apply = (next: Partial<ShopParams>) => start(() => router.push(`/shop${toQuery({ ...props.params, ...next, page: 1 })}`, { scroll: false }));
  return <aside className="shop-sidebar" aria-label="Filters"><FilterPanel {...props} apply={apply} /></aside>;
}

export function ShopToolbar({ params, categories, sellers, total }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [sheet, setSheet] = useState(false);
  const [q, setQ] = useState(params.q);
  useEffect(() => setQ(params.q), [params.q]);
  const apply = (next: Partial<ShopParams>) => start(() => router.push(`/shop${toQuery({ ...params, ...next, page: next.page ?? 1 })}`, { scroll: false }));
  const activeCount = [params.category, params.seller, params.minPrice, params.maxPrice, params.inStock ? '1' : ''].filter(Boolean).length;

  return (
    <div className={`shop-toolbar${pending ? ' is-pending' : ''}`}>
      <form className="shop-search" role="search" onSubmit={e => { e.preventDefault(); apply({ q: q.trim() }); }}>
        <Icon name="search" size={18} />
        <input className="input" value={q} onChange={e => setQ(e.target.value)} placeholder="Search in the shop…" aria-label="Search products" enterKeyHint="search" />
      </form>
      <div className="row shop-toolbar-right">
        <button className="btn btn-outline only-mobile-tablet" onClick={() => setSheet(true)}><Icon name="filter" size={18} /> Filters{activeCount > 0 && <span className="count-dot">{activeCount}</span>}</button>
        <label className="sr-only" htmlFor="sort">Sort products</label>
        <select id="sort" className="select sort-select" value={params.sort || 'featured'} onChange={e => apply({ sort: e.target.value })}>
          {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
        <div className="segmented hide-sm" role="group" aria-label="Layout">
          <button type="button" aria-pressed={params.view !== 'list'} onClick={() => apply({ view: 'grid', page: params.page })} aria-label="Grid view"><Icon name="grid" size={16} /></button>
          <button type="button" aria-pressed={params.view === 'list'} onClick={() => apply({ view: 'list', page: params.page })} aria-label="List view"><Icon name="list" size={16} /></button>
        </div>
      </div>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="Filters" footer={<button className="btn btn-primary btn-block btn-lg" onClick={() => setSheet(false)}>Show {total} result{total === 1 ? '' : 's'}</button>}>
        <FilterPanel params={params} categories={categories} sellers={sellers} apply={apply} />
      </Sheet>
    </div>
  );
}
