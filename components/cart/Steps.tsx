import { Icon } from '@/components/ui/Icon';

export function Steps({ current }: { current: 0 | 1 | 2 }) {
  const steps = ['Cart', 'Details', 'Confirmation'];
  return (
    <ol className="steps" aria-label="Checkout progress">
      {steps.map((s, i) => (
        <li key={s} className={i < current ? 'is-done' : i === current ? 'is-current' : undefined} aria-current={i === current ? 'step' : undefined}>
          <span>{i < current ? <Icon name="check" size={14} strokeWidth={2.6} /> : i + 1}</span>{s}
        </li>
      ))}
    </ol>
  );
}
