import { formatRwf } from '@/lib/format';

/** Minimal 14-day bar chart (pure SVG/CSS, no chart library). */
export function SalesChart({ days }: { days: { date: string; totalRwf: number; orders: number }[] }) {
  const max = Math.max(...days.map(d => d.totalRwf), 1);
  const total = days.reduce((s, d) => s + d.totalRwf, 0);
  const orders = days.reduce((s, d) => s + d.orders, 0);
  return (
    <div className="chart">
      <div className="row-between wrap">
        <div><span className="stat-label">Last 14 days</span><strong className="chart-total">{formatRwf(total)}</strong></div>
        <span className="badge badge-green">{orders} order{orders === 1 ? '' : 's'}</span>
      </div>
      <div className="chart-bars" role="img" aria-label={`Sales over the last 14 days, total ${formatRwf(total)}`}>
        {days.map(d => (
          <div key={d.date} className="chart-col" title={`${d.date}: ${formatRwf(d.totalRwf)} · ${d.orders} orders`}>
            <span className="chart-bar" style={{ height: `${Math.max((d.totalRwf / max) * 100, d.totalRwf ? 6 : 2)}%` }} />
            <span className="chart-day">{new Date(d.date).toLocaleDateString('en-GB', { day: '2-digit' })}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
