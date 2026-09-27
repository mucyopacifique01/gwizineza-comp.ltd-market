'use client';

import { useEffect, useState } from 'react';
import { LOW_STOCK_THRESHOLD } from '@/lib/config';
import { Icon } from '@/components/ui/Icon';

/** Inline stock control: -/+ buttons and direct entry, saved on blur/enter. */
export function StockEditor({ value, onSave }: { value: number; onSave: (value: number) => Promise<void> }) {
  const [draft, setDraft] = useState(String(value));
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState(false);
  useEffect(() => setDraft(String(value)), [value]);
  const tone = value === 0 ? 'out' : value <= LOW_STOCK_THRESHOLD ? 'low' : 'ok';

  async function commit(next: number) {
    if (!Number.isInteger(next) || next < 0) { setDraft(String(value)); return; }
    if (next === value) return;
    setSaving(true); setErr(false);
    try { await onSave(next); setDraft(String(next)); } catch { setErr(true); setDraft(String(value)); } finally { setSaving(false); }
  }

  return (
    <div className={`stock-editor stock-editor-${tone}${saving ? ' is-saving' : ''}${err ? ' is-error' : ''}`}>
      <button type="button" onClick={() => void commit(value - 1)} disabled={saving || value <= 0} aria-label="Decrease stock"><Icon name="minus" size={14} /></button>
      <input value={draft} inputMode="numeric" onChange={e => setDraft(e.target.value.replace(/\D/g, ''))} onBlur={() => void commit(Number(draft))} onKeyDown={e => { if (e.key === 'Enter') (e.target as HTMLInputElement).blur(); }} aria-label="Stock quantity" />
      <button type="button" onClick={() => void commit(value + 1)} disabled={saving} aria-label="Increase stock"><Icon name="plus" size={14} /></button>
    </div>
  );
}
