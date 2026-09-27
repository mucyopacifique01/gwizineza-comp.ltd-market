import { Icon, type IconName } from '@/components/ui/Icon';

const STEPS: { icon: IconName; title: string; text: string }[] = [
  { icon: 'search', title: 'Discover', text: 'Browse categories or search in seconds.' },
  { icon: 'bag', title: 'Add to cart', text: 'Your cart is saved on the server, not lost on refresh.' },
  { icon: 'user', title: 'Checkout', text: 'Name, phone and delivery location. That’s it.' },
  { icon: 'check', title: 'Confirmation', text: 'Instant order number with every item and total.' },
  { icon: 'whatsapp', title: 'Receipt', text: 'Print it or share it straight to WhatsApp.' },
];

export function Journey() {
  return (
    <section className="section journey" aria-labelledby="journey-title">
      <div className="container">
        <div className="section-head">
          <div><span className="eyebrow">How it works</span><h2 id="journey-title">From “I need this” to “it’s ordered”.</h2></div>
          <p>Five clear steps. No surprises, no hidden fees added at checkout.</p>
        </div>
        <ol className="journey-track">
          {STEPS.map((step, i) => (
            <li key={step.title} className="journey-step">
              <span className="journey-node"><Icon name={step.icon} size={22} /></span>
              <span className="journey-index">0{i + 1}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}
