'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import type { CategoryDTO, ProductDTO } from '@/lib/types';
import { apiFetch } from '@/lib/http';
import { primaryImage } from '@/lib/merchandising';
import { Icon } from '@/components/ui/Icon';
import { Skeleton } from '@/components/ui/Skeleton';
import { ProductImage } from '@/components/product/ProductImage';

const RECENT_KEY = 'gwizineza-recent-searches';

function readRecent(): string[] {
  try { const v = JSON.parse(localStorage.getItem(RECENT_KEY) ?? '[]'); return Array.isArray(v) ? v.filter((x): x is string => typeof x === 'string').slice(0, 6) : []; } catch { return []; }
}

export function SearchOverlay({ open, onClose, categories }: { open: boolean; onClose: () => void; categories: CategoryDTO[] }) {
  const router = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState('');
  const [recent, setRecent] = useState<string[]>([]);
  const [results, setResults] = useState<ProductDTO[]>([]);
  const [suggested, setSuggested] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    setRecent(readRecent());
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => input.current?.focus());
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') closeRef.current(); };
    document.addEventListener('keydown', onKey);
    return () => { document.body.style.overflow = overflow; document.removeEventListener('keydown', onKey); };
  }, [open]);

  useEffect(() => {
    if (!open || suggested.length) return;
    apiFetch<{ products: ProductDTO[] }>('/api/products?sort=featured&pageSize=4&inStock=1').then(d => setSuggested(d.products)).catch(() => undefined);
  }, [open, suggested.length]);

  useEffect(() => {
    const term = q.trim();
    if (!term) { setResults([]); setError(null); return; }
    setLoading(true);
    const controller = new AbortController();
    const timer = window.setTimeout(() => {
      apiFetch<{ products: ProductDTO[] }>(`/api/products?q=${encodeURIComponent(term)}&pageSize=6`, { signal: controller.signal })
        .then(d => { setResults(d.products); setError(null); })
        .catch(e => { if ((e as Error).name !== 'AbortError') setError((e as Error).message); })
        .finally(() => setLoading(false));
    }, 220);
    return () => { window.clearTimeout(timer); controller.abort(); };
  }, [q]);

  function remember(term: string) {
    const next = [term, ...readRecent().filter(t => t.toLowerCase() !== term.toLowerCase())].slice(0, 6);
    try { localStorage.setItem(RECENT_KEY, JSON.stringify(next)); } catch { /* ignore */ }
  }

  function submit(term = q) {
    const clean = term.trim();
    if (!clean) return;
    remember(clean);
    onClose();
    router.push(`/shop?q=${encodeURIComponent(clean)}`);
  }

  if (!open) return null;
  const term = q.trim();
  const matchedCats = term ? categories.filter(c => c.name.toLowerCase().includes(term.toLowerCase())) : categories.slice(0, 8);

  return (
    <div className="search-layer" role="dialog" aria-modal="true" aria-label="Search products">
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <div className="search-panel">
        <form className="search-bar" onSubmit={e => { e.preventDefault(); submit(); }} role="search">
          <Icon name="search" size={22} />
          <input ref={input} value={q} onChange={e => setQ(e.target.value)} placeholder="Search soap, sugar, rice, household goods…" aria-label="Search products" enterKeyHint="search" autoComplete="off" />
          {q && <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={() => setQ('')} aria-label="Clear search"><Icon name="x" size={18} /></button>}
          <button type="button" className="btn btn-outline btn-sm" onClick={onClose}>Close</button>
        </form>

        <div className="search-body">
          {!term && recent.length > 0 && (
            <section>
              <div className="row-between"><h3 className="search-h">Recent searches</h3><button className="btn btn-ghost btn-sm" onClick={() => { localStorage.removeItem(RECENT_KEY); setRecent([]); }}>Clear</button></div>
              <div className="chip-cloud">{recent.map(r => <button key={r} className="chip" onClick={() => { setQ(r); submit(r); }}><Icon name="clock" size={14} />{r}</button>)}</div>
            </section>
          )}

          {matchedCats.length > 0 && (
            <section>
              <h3 className="search-h">Categories</h3>
              <div className="chip-cloud">{matchedCats.map(c => <Link key={c.id} href={`/shop?category=${c.slug}`} className="chip" onClick={onClose}>{c.name}</Link>)}</div>
            </section>
          )}

          <section>
            <h3 className="search-h">{term ? 'Products' : 'Suggested for you'}</h3>
            {error ? <div className="alert alert-error">{error}</div>
              : loading && term ? <div className="search-results">{Array.from({ length: 3 }, (_, i) => <div key={i} className="search-hit"><Skeleton width={56} height={56} radius={14} /><div className="grow stack" style={{ gap: 6 }}><Skeleton width="60%" /><Skeleton width="30%" height={10} /></div></div>)}</div>
              : term && results.length === 0 ? <p className="muted">No products match “{term}”. Try a shorter word or browse a category.</p>
              : (
                <ul className="search-results">
                  {(term ? results : suggested).map(p => (
                    <li key={p.id}>
                      <Link href={`/product/${p.slug}`} className="search-hit" onClick={() => { if (term) remember(term); onClose(); }}>
                        <span className="search-thumb"><ProductImage src={primaryImage(p)} alt="" sizes="56px" /></span>
                        <span className="grow"><strong>{p.name}</strong><span className="muted tiny">{p.category?.name ?? 'Product'} · {p.seller?.businessName ?? 'Gwizineza Market'}</span></span>
                        <span className="search-price">{p.priceRwf.toLocaleString('en-US')} RWF</span>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            {term && results.length > 0 && <button className="btn btn-dark btn-block" style={{ marginTop: 12 }} onClick={() => submit()}>See all results for “{term}” <Icon name="arrowRight" size={16} /></button>}
          </section>
        </div>
      </div>
    </div>
  );
}
