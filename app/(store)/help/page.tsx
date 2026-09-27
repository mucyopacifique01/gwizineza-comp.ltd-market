import type { Metadata } from 'next';
import Link from 'next/link';
import { InfoPage } from '@/components/content/InfoPage';

export const metadata: Metadata = { title: 'Help' };

const FAQ = [
  ['How do I place an order?', 'Add products to your cart, open the cart, press Checkout, enter your name, phone and delivery location, then press Place order. You get an order number immediately.'],
  ['How do I pay?', 'Right now you pay on delivery. Our team confirms the payment method with you by phone. Online Mobile Money payments are coming soon.'],
  ['How is delivery arranged?', 'Orders are prepared in Kabarondo. After you order, we call the phone number you provided to confirm delivery details.'],
  ['Where is my receipt?', 'Your order page shows a full confirmation you can print, save as PDF, or share via WhatsApp. Official EBM receipts will be available once EBM integration is enabled.'],
  ['How do I track my order?', 'Open the link on your order confirmation, or visit /orders/ followed by your order number.'],
  ['Can I sell on Gwizineza Market?', 'Yes. Seller accounts are created and approved by the owner. Contact us to apply.'],
];

export default function HelpPage() {
  return (
    <InfoPage eyebrow="Help centre" title="How can we help?" lead="Quick answers to the most common questions.">
      <div className="faq">
        {FAQ.map(([q, a]) => <details key={q} className="faq-item"><summary>{q}</summary><p>{a}</p></details>)}
      </div>
      <p className="muted" style={{ marginTop: 24 }}>Still stuck? <Link href="/contact" className="link-arrow">Contact us</Link></p>
    </InfoPage>
  );
}
