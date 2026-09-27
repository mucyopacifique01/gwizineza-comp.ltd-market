import { site } from '@/lib/config';
import { Icon } from '@/components/ui/Icon';

/**
 * Map section. Uses the public OpenStreetMap embed already used by the previous site
 * (approximate town-centre pin, no private address). Swap the iframe for another provider later.
 */
export function LocationBand() {
  const { lat, lng } = site.map;
  const bbox = `${lng - 0.025}%2C${lat - 0.018}%2C${lng + 0.025}%2C${lat + 0.018}`;
  return (
    <section className="section" aria-labelledby="loc-title">
      <div className="container location">
        <div className="location-copy">
          <span className="eyebrow">Where we are</span>
          <h2 id="loc-title">Rooted in Kabarondo.<br />Connected beyond it.</h2>
          <p className="muted">Gwizineza Market is based in {site.region}, Rwanda. Orders are prepared locally and delivery is arranged with you after you order.</p>
          <ul className="location-list">
            <li><Icon name="pin" size={18} /> {site.location}</li>
            <li><Icon name="truck" size={18} /> Delivery arranged by phone after your order</li>
            {site.whatsapp && <li><Icon name="whatsapp" size={18} /> <a href={`https://wa.me/${site.whatsapp}`} target="_blank" rel="noopener noreferrer">Chat with us on WhatsApp</a></li>}
          </ul>
          <a className="btn btn-outline" href={`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=14/${lat}/${lng}`} target="_blank" rel="noopener noreferrer"><Icon name="external" size={16} /> Open larger map</a>
        </div>
        <div className="location-map">
          <iframe title="Map of Kabarondo, Rwanda" src={`https://www.openstreetmap.org/export/embed.html?bbox=${bbox}&layer=mapnik&marker=${lat}%2C${lng}`} loading="lazy" referrerPolicy="no-referrer" />
          <div className="map-chip"><span className="pulse-dot" /> Kabarondo</div>
        </div>
      </div>
    </section>
  );
}
