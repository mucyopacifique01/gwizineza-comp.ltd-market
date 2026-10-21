'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { site } from '@/lib/config';
import { Icon, type IconName } from '@/components/ui/Icon';

/**
 * "Connect with us" band with a scrollable Google Map embed (like the reference design).
 * The floating info card is enriched by SerpApi (business name, address, rating) through
 * /api/map/place, and degrades gracefully to site settings when that is unavailable.
 */
type Place = {
  name: string; address: string; rating?: number | null; reviews?: number | null;
  phone?: string | null; website?: string | null; lat?: number | null; lng?: number | null;
};
type MapPlace = { place: Place | null; pin?: { lat: number; lng: number } | null; fallback: { name: string; address: string } };
type Settings = { siteName?: string; location?: string; phone?: string | null; email?: string | null; whatsapp?: string | null };

export function ConnectMap() {
  const [info, setInfo] = useState<MapPlace | null>(null);
  const [siteInfo, setSiteInfo] = useState<Settings>({});

  useEffect(() => {
    fetch('/api/map/place', { cache: 'no-store' })
      .then(r => r.json())
      .then((d: MapPlace) => setInfo(d))
      .catch(() => setInfo({ place: null, fallback: { name: 'Gwizineza Market', address: 'Kabarondo, Rwanda' } }));
    fetch('/api/site/settings', { cache: 'no-store' })
      .then(r => r.json())
      .then(d => setSiteInfo(d.settings ?? {}))
      .catch(() => {});
  }, []);

  const place = info?.place ?? null;
  const name = place?.name || info?.fallback?.name || siteInfo.siteName || 'Gwizineza Market';
  // Keep the map view/pin unchanged while showing the exact business address requested.
  const address = 'XHP5+W7H, Kabarondo';
  const locationQuery = encodeURIComponent(`${name}, ${address}, Rwanda`);
  const target = place?.lat != null && place?.lng != null
    ? `${place.lat},${place.lng}`
    : info?.pin?.lat != null && info?.pin?.lng != null
      ? `${info.pin.lat},${info.pin.lng}`
      : `${site.map.lat},${site.map.lng}`; // saved town pin until the API answers
  const embedSrc = `https://www.google.com/maps?q=${target}&z=15&hl=en&output=embed`;
  const openInMaps = `https://www.google.com/maps/search/?api=1&query=${locationQuery}`;
  const directions = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(`${address}, Rwanda`)}`;

  const phone = siteInfo.phone || site.phone;
  const email = siteInfo.email || site.email;
  const whatsapp = siteInfo.whatsapp || site.whatsapp;
  const socials = ([
    ['instagram', site.social.instagram, 'Instagram'],
    ['facebook', site.social.facebook, 'Facebook'],
    ['tiktok', site.social.tiktok, 'TikTok'],
    ['xlogo', site.social.x, 'X'],
    ['whatsapp', whatsapp ? `https://wa.me/${whatsapp}` : '', 'WhatsApp'],
  ] as [IconName, string, string][]).filter(([, url]) => Boolean(url));

  const rows = [
    phone && { icon: 'phone' as IconName, label: `Hotline: ${phone}`, href: `tel:${phone.replace(/\s/g, '')}` },
    email && { icon: 'mail' as IconName, label: email, href: `mailto:${email}` },
    whatsapp && { icon: 'whatsapp' as IconName, label: 'WhatsApp chat', href: `https://wa.me/${whatsapp}` },
    { icon: 'pin' as IconName, label: address, href: '' },
  ].filter(Boolean) as { icon: IconName; label: string; href: string }[];

  return (
    <section className="connect-map" aria-labelledby="connect-title">
      <div className="container connect-grid">
        <div className="connect-copy">
          <h2 id="connect-title">Connect with us</h2>
          <ul className="connect-list">
            {rows.map(r => {
              const row = <><span className="connect-ic"><Icon name={r.icon} size={18} /></span><span>{r.label}</span></>;
              return r.href
                ? <li key={r.label}>{r.href.startsWith('http') ? <a href={r.href} target="_blank" rel="noopener noreferrer">{row}</a> : <a href={r.href}>{row}</a>}</li>
                : <li key={r.label}>{row}</li>;
            })}
            <li><Link href="/contact"><><span className="connect-ic"><Icon name="arrowRight" size={18} /></span><span>Contact us →</span></></Link></li>
          </ul>
          {socials.length > 0 && (
            <div className="connect-socials">
              {socials.map(([icon, url, label]) => (
                <a key={label} href={url} aria-label={label} target="_blank" rel="noopener noreferrer"><Icon name={icon} size={16} /></a>
              ))}
            </div>
          )}
          <p className="connect-copyright">© {new Date().getFullYear()} {siteInfo.siteName || site.name} · {address}</p>
        </div>
        <div className="connect-map-area">
          <iframe
            title={`Google Map — ${name}`}
            src={embedSrc}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
          <div className="map-info-card">
            <strong>{name}</strong>
            <span className="map-info-address">{address}</span>
            {place?.rating != null && (
              <div className="map-info-rating">
                <span className="map-stars" aria-hidden>★</span> {place.rating}
                {place?.reviews != null && <span className="map-info-reviews"> ({place.reviews})</span>}
              </div>
            )}
            <div className="map-info-actions">
              <a className="map-open-btn" href={openInMaps} target="_blank" rel="noopener noreferrer">Open in Maps <Icon name="external" size={13} /></a>
              <a className="map-dir-btn" href={directions} target="_blank" rel="noopener noreferrer" aria-label="Get directions"><Icon name="truck" size={16} /></a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
