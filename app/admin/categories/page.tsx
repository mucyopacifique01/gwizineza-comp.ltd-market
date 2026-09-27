'use client';

import { useState, type FormEvent } from 'react';
import { useApi } from '@/lib/use-api';
import { apiFetch, jsonBody } from '@/lib/http';
import { DashHeader } from '@/components/dash/DashShell';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { TextField } from '@/components/ui/Field';
import { useToast } from '@/components/ui/Toast';

type Category = { id: string; name: string; slug: string; _count?: { products: number } };

export default function CategoriesAdmin() {
  const toast = useToast();
  const { data, error, loading, reload } = useApi<{ categories: Category[] }>('/api/categories');
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);
  const [edit, setEdit] = useState<{ id: string; name: string } | null>(null);

  async function create(e: FormEvent) {
    e.preventDefault();
    setCreating(true);
    try { await apiFetch('/api/categories', { method: 'POST', body: jsonBody({ name }) }); setName(''); toast.show('Category created'); await reload(); }
    catch (err) { toast.show(err instanceof Error ? err.message : 'Could not create', { tone: 'error' }); }
    finally { setCreating(false); }
  }

  async function rename() {
    if (!edit) return;
    try { await apiFetch('/api/categories', { method: 'PATCH', body: jsonBody({ id: edit.id, name: edit.name }) }); toast.show('Category renamed'); setEdit(null); await reload(); }
    catch (err) { toast.show(err instanceof Error ? err.message : 'Could not rename', { tone: 'error' }); }
  }

  return (
    <>
      <DashHeader eyebrow="Catalogue" title="Categories" description="Organise the shop. Categories appear in navigation, filters and the homepage." />
      <div className="dash-grid dash-grid-side">
        <form className="card stack" onSubmit={create}>
          <h2 className="card-title" style={{ margin: 0 }}>New category</h2>
          <TextField label="Name" required minLength={2} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Household goods" hint="The URL slug is created automatically." />
          <Button type="submit" loading={creating} icon="plus">Create category</Button>
        </form>
        <section>
          {loading && !data ? <Skeleton height={300} radius={24} /> : error ? <ErrorState description={error}><Button onClick={() => void reload()}>Retry</Button></ErrorState> : !data?.categories.length ? <EmptyState art="box" title="No categories yet" description="Create your first category." /> : (
            <div className="table-wrap">
              <table className="table">
                <thead><tr><th>Name</th><th>Slug</th><th className="num">Products</th><th /></tr></thead>
                <tbody>{data.categories.map(c => (
                  <tr key={c.id}>
                    <td>{edit?.id === c.id ? <input className="input input-sm" value={edit.name} onChange={e => setEdit({ id: c.id, name: e.target.value })} autoFocus onKeyDown={e => { if (e.key === 'Enter') void rename(); if (e.key === 'Escape') setEdit(null); }} aria-label="Category name" /> : <strong>{c.name}</strong>}</td>
                    <td className="mono muted small">{c.slug}</td>
                    <td className="num">{c._count?.products ?? '—'}</td>
                    <td className="num">{edit?.id === c.id ? <div className="row" style={{ justifyContent: 'flex-end' }}><Button size="sm" onClick={() => void rename()}>Save</Button><Button size="sm" variant="ghost" onClick={() => setEdit(null)}>Cancel</Button></div> : <Button size="sm" variant="ghost" icon="edit" onClick={() => setEdit({ id: c.id, name: c.name })}>Rename</Button>}</td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </>
  );
}
