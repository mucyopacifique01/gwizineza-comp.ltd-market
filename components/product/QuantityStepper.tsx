'use client';

import { Icon } from '@/components/ui/Icon';

export function QuantityStepper({ value, max, onChange, disabled, label = 'Quantity', size = 'md' }: { value: number; max: number; onChange: (value: number) => void; disabled?: boolean; label?: string; size?: 'sm' | 'md' }) {
  return (
    <div className={`stepper stepper-${size}`} role="group" aria-label={label}>
      <button type="button" onClick={() => onChange(Math.max(1, value - 1))} disabled={disabled || value <= 1} aria-label="Decrease quantity"><Icon name="minus" size={16} /></button>
      <output aria-live="polite">{value}</output>
      <button type="button" onClick={() => onChange(Math.min(max, value + 1))} disabled={disabled || value >= max} aria-label="Increase quantity"><Icon name="plus" size={16} /></button>
    </div>
  );
}
