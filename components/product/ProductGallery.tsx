'use client';

import { useState, type CSSProperties, type MouseEvent } from 'react';
import { ProductImage } from './ProductImage';
import { Icon } from '@/components/ui/Icon';

type GalleryImage = { src: string | null; alt: string };

/** Main image with hover zoom (desktop) + tap-to-zoom (mobile), thumbnails, and layered peeks of the next images. */
export function ProductGallery({ images, name }: { images: GalleryImage[]; name: string }) {
  const list = images.length ? images : [{ src: null, alt: name }];
  const [active, setActive] = useState(0);
  const [zoom, setZoom] = useState(false);
  const [origin, setOrigin] = useState('50% 50%');
  const peeks = list.map((img, i) => ({ ...img, i })).filter(x => x.i !== active).slice(0, 2);

  const onMove = (e: MouseEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    setOrigin(`${((e.clientX - r.left) / r.width) * 100}% ${((e.clientY - r.top) / r.height) * 100}%`);
  };

  return (
    <div className="gallery">
      <div className="gallery-stage">
        {peeks.map((p, idx) => (
          <button key={p.i} type="button" className={`gallery-peek gallery-peek-${idx + 1}`} onClick={() => setActive(p.i)} aria-label={`Show image ${p.i + 1}`}>
            <ProductImage src={p.src} alt="" sizes="200px" />
          </button>
        ))}
        <div
          className={`gallery-main${zoom ? ' is-zoomed' : ''}`}
          onMouseEnter={() => setZoom(true)}
          onMouseLeave={() => setZoom(false)}
          onMouseMove={onMove}
          onClick={() => setZoom(z => !z)}
          style={{ '--zoom-origin': origin } as CSSProperties}
        >
          <ProductImage src={list[active]?.src} alt={list[active]?.alt ?? name} priority sizes="(max-width: 900px) 92vw, 560px" />
          {list[active]?.src && <span className="gallery-hint" aria-hidden="true"><Icon name="zoom" size={14} /> Hover or tap to zoom</span>}
        </div>
      </div>
      {list.length > 1 && (
        <div className="thumbs thumbs-lg" role="tablist" aria-label="Product images">
          {list.map((img, i) => (
            <button key={i} type="button" role="tab" aria-selected={i === active} className={`thumb${i === active ? ' is-active' : ''}`} onClick={() => setActive(i)} aria-label={`Image ${i + 1} of ${list.length}`}>
              <ProductImage src={img.src} alt="" sizes="80px" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
