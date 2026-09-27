'use client';

import Link from 'next/link';
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { Icon } from './Icon';

type Tone = 'success' | 'error' | 'info';
type Toast = { id: number; message: string; tone: Tone; action?: { label: string; href: string } };
type ToastApi = { show: (message: string, options?: { tone?: Tone; action?: { label: string; href: string } }) => void };

const ToastContext = createContext<ToastApi>({ show: () => undefined });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const seq = useRef(0);
  const show = useCallback<ToastApi['show']>((message, options) => {
    const id = ++seq.current;
    setToasts(list => [...list.slice(-2), { id, message, tone: options?.tone ?? 'success', action: options?.action }]);
    window.setTimeout(() => setToasts(list => list.filter(t => t.id !== id)), options?.tone === 'error' ? 6000 : 3800);
  }, []);
  const api = useMemo(() => ({ show }), [show]);
  return (
    <ToastContext.Provider value={api}>
      {children}
      <div className="toasts" role="status" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast ${t.tone}`}>
            <span className="toast-icon"><Icon name={t.tone === 'error' ? 'alert' : t.tone === 'info' ? 'sparkle' : 'check'} size={16} strokeWidth={2.4} /></span>
            <span>{t.message}</span>
            {t.action && <Link href={t.action.href}>{t.action.label}</Link>}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
