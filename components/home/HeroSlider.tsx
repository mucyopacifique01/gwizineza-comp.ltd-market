'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { HeroSlideDTO } from '@/lib/site-settings';

const INTERVAL_MS = 5500;

/** Sliding banner for the homepage. Slides are managed by the owner in Admin → Homepage slider. */
export function HeroSlider({ slides }: { slides: HeroSlideDTO[] }) {
  const count = slides.length;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reduceMotion, setReduceMotion] = useState(false);
  const touchStart = useRef<number | null>(null);

  useEffect(() => {
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const update = () => setReduceMotion(query.matches);
    update();
    query.addEventListener('change', update);
    return () => query.removeEventListener('change', update);
  }, []);

  // If the owner removes slides while the page is open, keep the index valid.
  useEffect(() => { if (index >= count) setIndex(0); }, [count, index]);

  const go = useCallback((next: number) => { if (count) setIndex(((next % count) + count) % count); }, [count]);

  useEffect(() => {
    if (count < 2 || paused || reduceMotion) return;
    const timer = window.setInterval(() => setIndex(i => (i + 1) % count), INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [count, paused, reduceMotion, index]);

  if (!count) return null;

  return (
    <section
      className="hs"
      aria-roledescription="carousel"
      aria-label="Gwizineza Trading Company highlights"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onKeyDown={e => { if (e.key === 'ArrowLeft') go(index - 1); if (e.key === 'ArrowRight') go(index + 1); }}
      onTouchStart={e => { touchStart.current = e.touches[0].clientX; }}
      onTouchEnd={e => {
        if (touchStart.current === null) return;
        const delta = e.changedTouches[0].clientX - touchStart.current;
        touchStart.current = null;
        if (Math.abs(delta) > 45) go(index + (delta < 0 ? 1 : -1));
      }}
    >
      <div className="container">
        <div className="hs-frame">
          <div className="hs-track" style={{ transform: `translateX(-${index * 100}%)`, transitionDuration: reduceMotion ? '0s' : undefined }}>
            {slides.map((slide, i) => (
              <figure
                className="hs-slide"
                key={slide.id}
                role="group"
                aria-roledescription="slide"
                aria-label={`${i + 1} of ${count}`}
                aria-hidden={i !== index}
              >
                {/* Plain <img>: slide images can come from the repo or any HTTPS host the owner pastes. */}
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={slide.imageUrl} alt={slide.altText || slide.title || ''} loading={i === 0 ? 'eager' : 'lazy'} decoding="async" draggable={false} />
                {(slide.title || slide.subtitle || (slide.linkUrl && slide.linkLabel)) && (
                  <figcaption className="hs-cap">
                    {slide.title && <strong>{slide.title}</strong>}
                    {slide.subtitle && <span>{slide.subtitle}</span>}
                    {slide.linkUrl && slide.linkLabel && (
                      /^https?:\/\//.test(slide.linkUrl)
                        ? <a className="btn btn-primary btn-sm" href={slide.linkUrl} tabIndex={i === index ? 0 : -1} rel="noopener noreferrer">{slide.linkLabel} <Icon name="arrowRight" size={15} /></a>
                        : <Link className="btn btn-primary btn-sm" href={slide.linkUrl} tabIndex={i === index ? 0 : -1}>{slide.linkLabel} <Icon name="arrowRight" size={15} /></Link>
                    )}
                  </figcaption>
                )}
              </figure>
            ))}
          </div>

          {count > 1 && (
            <>
              <button type="button" className="hs-arrow hs-prev" onClick={() => go(index - 1)} aria-label="Previous slide"><Icon name="chevronLeft" size={22} /></button>
              <button type="button" className="hs-arrow hs-next" onClick={() => go(index + 1)} aria-label="Next slide"><Icon name="chevronRight" size={22} /></button>
              <div className="hs-dots" role="tablist" aria-label="Choose slide">
                {slides.map((slide, i) => (
                  <button key={slide.id} type="button" role="tab" aria-selected={i === index} aria-label={`Go to slide ${i + 1}`} className={i === index ? 'is-active' : ''} onClick={() => go(i)} />
                ))}
              </div>
            </>
          )}
        </div>
        <p className="sr-only" aria-live="polite">{`Slide ${index + 1} of ${count}${slides[index]?.title ? ': ' + slides[index].title : ''}`}</p>
      </div>
    </section>
  );
}
