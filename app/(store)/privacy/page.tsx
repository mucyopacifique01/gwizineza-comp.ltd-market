import type { Metadata } from 'next';
import { InfoPage } from '@/components/content/InfoPage';

export const metadata: Metadata = { title: 'Privacy' };

export default function PrivacyPage() {
  return (
    <InfoPage eyebrow="Legal" title="Privacy" lead="How Gwizineza Market handles your information.">
      <div className="prose">
        <p><em>Template: have this reviewed before launch to make sure it matches your actual practices and Rwandan data-protection law.</em></p>
        <h2>What we collect</h2>
        <p>When you place an order we collect your name, phone number, optional email and delivery location. Your cart is linked to an anonymous id stored in your browser.</p>
        <h2>How we use it</h2>
        <p>We use these details only to process and deliver your order and to contact you about it. We do not sell your information.</p>
        <h2>Sellers</h2>
        <p>Sellers see the items ordered from them and a delivery area. They do not see your full phone number through the platform.</p>
        <h2>Your choices</h2>
        <p>You can ask us to correct or delete your information at any time through the contact page.</p>
      </div>
    </InfoPage>
  );
}
