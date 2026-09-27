'use client';

import { useRef, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';

export function Carousel({ children, label }: { children: ReactNode; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const move = (dir: 1 | -1) => track.current?.scrollBy({ left: dir * track.current.clientWidth * 0.8, behavior: 'smooth' });
  return (
    <div className="carousel">
      <div className="carousel-nav">
        <button className="btn btn-outline btn-icon btn-sm" onClick={() => move(-1)} aria-label={`Scroll ${label} left`}><Icon name="chevronLeft" size={18} /></button>
        <button className="btn btn-outline btn-icon btn-sm" onClick={() => move(1)} aria-label={`Scroll ${label} right`}><Icon name="chevronRight" size={18} /></button>
      </div>
      <div ref={track} className="carousel-track" role="region" aria-label={label} tabIndex={0}>{children}</div>
    </div>
  );
}
