import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/InfoPage';

export const metadata: Metadata = { title: 'Terms' };

export default function TermsPage() {
  return (
    <InfoPage eyebrow="Legal" title="Terms of use" lead="The basics of shopping on Gwizineza Market.">
      <div className="prose">
        <p><em>Template: have this reviewed before launch.</em></p>
        <h2>Orders</h2>
        <p>Placing an order creates a request to buy. Stock is reserved when the order is created. We confirm delivery by phone and may cancel orders we cannot fulfil.</p>
        <h2>Prices</h2>
        <p>All prices are in Rwandan francs (RWF). The price shown at checkout is the price of your order. Delivery is arranged separately by phone.</p>
        <h2>Payment</h2>
        <p>Payment is currently made on delivery. No payment is taken on the website.</p>
        <h2>Sellers</h2>
        <p>Products are sold by approved sellers or by Gwizineza Market directly. Gwizineza Market manages seller accounts.</p>
      </div>
    </InfoPage>
  );
}
