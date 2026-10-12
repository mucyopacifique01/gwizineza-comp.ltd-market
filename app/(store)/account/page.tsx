import type { Metadata } from 'next';
import { CustomerPanel } from '@/components/account/CustomerPanel';

export const dynamic = 'force-dynamic';
export const metadata: Metadata = { title: 'My account | Gwizineza Market' };

export default function AccountPage() {
  return (
    <main className="fig-page">
      <section className="fig-page-hero">
        <div className="container">
          <span className="eyebrow">My Gwizineza</span>
          <h1>My account</h1>
          <p>Manage your details, cart, saved products and orders in one place.</p>
        </div>
      </section>
      <div className="container fig-page-body">
        <CustomerPanel />
      </div>
    </main>
  );
}
