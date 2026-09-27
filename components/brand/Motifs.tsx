/** Signature decorative layers. All aria-hidden and pointer-events: none. */

/** Rolling-hill contour lines (land of a thousand hills), very low contrast. */
export function Hills({ className, tone = 'var(--line-2)' }: { className?: string; tone?: string }) {
  return (
    <svg className={['motif-hills', className].filter(Boolean).join(' ')} viewBox="0 0 1200 320" preserveAspectRatio="none" aria-hidden="true">
      {[0, 1, 2, 3, 4, 5].map(i => (
        <path key={i} d={`M0 ${220 + i * 18} C 160 ${150 + i * 16}, 300 ${250 + i * 12}, 460 ${190 + i * 16} S 760 ${130 + i * 18}, 920 ${200 + i * 14} S 1120 ${170 + i * 16}, 1200 ${190 + i * 16}`} fill="none" stroke={tone} strokeWidth="1" opacity={1 - i * 0.12} />
      ))}
    </svg>
  );
}

/** The connecting thread with nodes — used behind product stacks and journey steps. */
export function Thread({ className, animated = true }: { className?: string; animated?: boolean }) {
  return (
    <svg className={['motif-thread', className].filter(Boolean).join(' ')} viewBox="0 0 600 600" fill="none" aria-hidden="true">
      <path d="M40 470 C 140 380, 120 250, 250 220 S 470 260, 540 120" stroke="var(--ink)" strokeOpacity=".22" strokeWidth="1.6" strokeDasharray="4 8" className={animated ? 'thread-dash' : undefined} />
      <path d="M90 540 C 220 520, 330 460, 380 360 S 520 300, 570 330" stroke="var(--green)" strokeOpacity=".25" strokeWidth="1.2" strokeDasharray="2 7" />
      <circle cx="40" cy="470" r="6" fill="var(--sun)" />
      <circle cx="250" cy="220" r="5" fill="var(--leaf)" />
      <circle cx="540" cy="120" r="7" fill="var(--sky)" />
      <circle cx="380" cy="360" r="4" fill="var(--ink)" />
    </svg>
  );
}
