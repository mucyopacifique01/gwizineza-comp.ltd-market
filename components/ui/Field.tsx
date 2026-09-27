'use client';

import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

type FieldProps = { label: string; hint?: ReactNode; error?: string | null; optional?: boolean; className?: string };

function Wrap({ id, label, hint, error, optional, className, children }: FieldProps & { id: string; children: ReactNode }) {
  return (
    <div className={['field', className].filter(Boolean).join(' ')}>
      <label className="field-label" htmlFor={id}>{label}{optional && <span className="opt"> (optional)</span>}</label>
      {children}
      {error ? <span className="field-error" id={`${id}-error`} role="alert">{error}</span> : hint ? <span className="field-hint" id={`${id}-hint`}>{hint}</span> : null}
    </div>
  );
}

export function TextField({ label, hint, error, optional, className, id, ...rest }: FieldProps & InputHTMLAttributes<HTMLInputElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} optional={optional} className={className}>
      <input id={fid} className="input" aria-invalid={error ? true : undefined} aria-describedby={error ? `${fid}-error` : hint ? `${fid}-hint` : undefined} {...rest} />
    </Wrap>
  );
}

export function SelectField({ label, hint, error, optional, className, id, children, ...rest }: FieldProps & SelectHTMLAttributes<HTMLSelectElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} optional={optional} className={className}>
      <select id={fid} className="select" aria-invalid={error ? true : undefined} {...rest}>{children}</select>
    </Wrap>
  );
}

export function TextAreaField({ label, hint, error, optional, className, id, ...rest }: FieldProps & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const auto = useId();
  const fid = id ?? auto;
  return (
    <Wrap id={fid} label={label} hint={hint} error={error} optional={optional} className={className}>
      <textarea id={fid} className="textarea" aria-invalid={error ? true : undefined} {...rest} />
    </Wrap>
  );
}
