'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { Icon } from './Icon';

function useDialogBehaviour(open: boolean, onClose: () => void, ref: React.RefObject<HTMLElement>) {
  // Keep the latest onClose without re-running the effect (avoids focus jumping on parent re-renders).
  const closeRef = useRef(onClose);
  closeRef.current = onClose;
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden';
    const node = ref.current;
    const focusables = () => Array.from(node?.querySelectorAll<HTMLElement>('a[href], button:not([disabled]), input:not([disabled]), select, textarea, [tabindex]:not([tabindex="-1"])') ?? []);
    requestAnimationFrame(() => (node?.querySelector<HTMLElement>('[data-autofocus]') ?? focusables()[0])?.focus());
    function onKey(event: KeyboardEvent) {
      if (event.key === 'Escape') { event.stopPropagation(); closeRef.current(); }
      if (event.key === 'Tab') {
        const items = focusables();
        if (!items.length) return;
        const first = items[0];
        const last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    }
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = overflow; previous?.focus?.(); };
  }, [open, ref]);
}

export function Modal({ open, onClose, title, children, labelledBy }: { open: boolean; onClose: () => void; title?: ReactNode; children: ReactNode; labelledBy?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogBehaviour(open, onClose, ref);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className="modal" role="dialog" aria-modal="true" aria-labelledby={labelledBy ?? 'modal-title'}>
        {title !== undefined && (
          <div className="modal-head">
            <h2 id="modal-title">{title}</h2>
            <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
          </div>
        )}
        {children}
      </div>
    </>,
    document.body,
  );
}

export function Sheet({ open, onClose, side = 'bottom', title, children, footer }: { open: boolean; onClose: () => void; side?: 'bottom' | 'right' | 'left'; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  useDialogBehaviour(open, onClose, ref);
  if (!open || typeof document === 'undefined') return null;
  return createPortal(
    <>
      <div className="overlay" onClick={onClose} aria-hidden="true" />
      <div ref={ref} className={`sheet sheet-${side}`} role="dialog" aria-modal="true" aria-label={title}>
        <div className="modal-head" style={{ position: 'static' }}>
          <h2 style={{ fontSize: 'var(--fs-lg)' }}>{title}</h2>
          <button className="btn btn-ghost btn-icon btn-sm" onClick={onClose} aria-label="Close"><Icon name="x" /></button>
        </div>
        <div className="sheet-body">{children}</div>
        {footer && <div style={{ padding: '14px 24px calc(14px + env(safe-area-inset-bottom))', borderTop: '1px solid var(--line)' }}>{footer}</div>}
      </div>
    </>,
    document.body,
  );
}
