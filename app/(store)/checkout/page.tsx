'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState, type FormEvent } from 'react';
import { useCart } from '@/components/providers/CartProvider';
import { OrderSummary } from '@/components/cart/OrderSummary';
import { Steps } from '@/components/cart/Steps';
import { ProductImage } from '@/components/product/ProductImage';
import { TextField, SelectField, TextAreaField } from '@/components/ui/Field';
import { Button, ButtonLink } from '@/components/ui/Button';
import { EmptyState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Icon } from '@/components/ui/Icon';
import { apiFetch, jsonBody } from '@/lib/http';
import { formatRwf } from '@/lib/format';
import { RWANDA_DISTRICTS, isValidRwPhone } from '@/lib/rwanda';

type Form = { fullName: string; phone: string; email: string; address: string; sector: string; district: string; notes: string };
const SAVED_KEY = 'gwizineza-checkout-details';
const blank: Form = { fullName: '', phone: '', email: '', address: '', sector: 'Kabarondo', district: 'Kayonza', notes: '' };

export default function CheckoutPage() {
  const router = useRouter();
  const { cart, cartId, count, ready, refresh } = useCart();
  const [form, setForm] = useState<Form>(blank);
  const [remember, setRemember] = useState(true);
  const [errors, setErrors] = useState<Partial<Record<keyof Form, string>>>({});
  const [submitting, setSubmitting] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);

  useEffect(() => {
    try { const saved = JSON.parse(localStorage.getItem(SAVED_KEY) ?? 'null'); if (saved && typeof saved === 'object') setForm(f => ({ ...f, ...saved, notes: '' })); } catch { /* ignore */ }
  }, []);

  const set = (key: keyof Form) => (e: { target: { value: string } }) => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: undefined })); };
  const stockProblem = cart.items.find(i => i.quantity > i.product.stock);

  function validate() {
    const next: Partial<Record<keyof Form, string>> = {};
    if (form.fullName.trim().length < 2) next.fullName = 'Please enter your full name.';
    if (!isValidRwPhone(form.phone)) next.phone = 'Enter a Rwandan mobile number, e.g. 078 123 4567.';
    if (form.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) next.email = 'This email address doesn’t look right.';
    if (form.address.trim().length < 3) next.address = 'Add a street, landmark or village so we can find you.';
    if (form.sector.trim().length < 2) next.sector = 'Enter your sector.';
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function submit(e: FormEvent) {
    e.preventDefault();
    setServerError(null);
    if (!validate()) { document.querySelector<HTMLElement>('[aria-invalid="true"]')?.focus(); return; }
    setSubmitting(true);
    const deliveryAddress = [form.address.trim(), form.sector.trim(), `${form.district} District`, form.notes.trim() && `Note: ${form.notes.trim()}`].filter(Boolean).join(', ');
    try {
      const data = await apiFetch<{ order: { orderNumber: string } }>('/api/checkout', {
        method: 'POST',
        body: jsonBody({ cartId, customerName: form.fullName.trim(), phone: form.phone.trim(), customerEmail: form.email.trim() || undefined, deliveryAddress }),
      });
      try {
        if (remember) localStorage.setItem(SAVED_KEY, JSON.stringify({ ...form, notes: '' }));
        else localStorage.removeItem(SAVED_KEY);
      } catch { /* ignore */ }
      await refresh().catch(() => undefined);
      router.replace(`/orders/${encodeURIComponent(data.order.orderNumber)}?placed=1`);
    } catch (err) {
      setServerError(err instanceof Error ? err.message : 'We could not place your order. Please try again.');
      setSubmitting(false);
      await refresh().catch(() => undefined);
    }
  }

  if (!ready) return <div className="container checkout-page"><Skeleton width="30%" height={40} /><div className="checkout-layout" style={{ marginTop: 24 }}><Skeleton height={520} radius={24} /><Skeleton height={360} radius={24} /></div></div>;

  if (cart.items.length === 0) {
    return (
      <div className="container checkout-page">
        <EmptyState art="cart" title="Nothing to check out yet" description="Your cart is empty. Add a few products and come back here.">
          <ButtonLink href="/shop" icon="grid">Go to the shop</ButtonLink>
        </EmptyState>
      </div>
    );
  }

  return (
    <div className="container checkout-page">
      <header className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/cart">Cart</Link><Icon name="chevronRight" size={14} /><span aria-current="page">Checkout</span></nav>
        <h1>Checkout</h1>
        <Steps current={1} />
      </header>

      <form className="checkout-layout" onSubmit={submit} noValidate>
        <div className="stack" style={{ gap: 20 }}>
          <section className="card checkout-card" aria-labelledby="co-contact">
            <div className="checkout-card-head"><span className="step-num">1</span><div><h2 id="co-contact">Your details</h2><p className="muted small">We use these to confirm your order and delivery.</p></div></div>
            <div className="form-grid cols-2">
              <TextField label="Full name" value={form.fullName} onChange={set('fullName')} error={errors.fullName} autoComplete="name" required className="span-2" />
              <TextField label="Phone number" type="tel" inputMode="tel" value={form.phone} onChange={set('phone')} error={errors.phone} placeholder="078 123 4567" autoComplete="tel" required hint="We’ll call or WhatsApp this number." />
              <TextField label="Email" type="email" value={form.email} onChange={set('email')} error={errors.email} placeholder="you@example.com" autoComplete="email" optional />
            </div>
          </section>

          <section className="card checkout-card" aria-labelledby="co-delivery">
            <div className="checkout-card-head"><span className="step-num">2</span><div><h2 id="co-delivery">Delivery location</h2><p className="muted small">Orders are prepared in Kabarondo and delivery is confirmed by phone.</p></div></div>
            <div className="form-grid cols-2">
              <TextField label="Address / landmark" value={form.address} onChange={set('address')} error={errors.address} placeholder="Village, street or nearby landmark" autoComplete="street-address" required className="span-2" />
              <TextField label="Sector" value={form.sector} onChange={set('sector')} error={errors.sector} autoComplete="address-level3" required />
              <SelectField label="District" value={form.district} onChange={set('district')}>
                {RWANDA_DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </SelectField>
              <TextAreaField label="Delivery notes" value={form.notes} onChange={set('notes')} optional placeholder="Best time to call, gate colour, etc." className="span-2" rows={3} maxLength={140} />
            </div>
          </section>

          <section className="card checkout-card" aria-labelledby="co-pay">
            <div className="checkout-card-head"><span className="step-num">3</span><div><h2 id="co-pay">Payment</h2><p className="muted small">No payment is taken on this page.</p></div></div>
            <div className="pay-options" role="radiogroup" aria-label="Payment method">
              <label className="pay-option is-selected"><input type="radio" name="pay" defaultChecked /><span className="pay-ico"><Icon name="money" size={20} /></span><span><strong>Pay on delivery</strong><small>Pay when your order is delivered. Our team confirms the payment method with you by phone.</small></span><Icon name="check" size={18} className="pay-check" /></label>
              <label className="pay-option is-disabled" aria-disabled="true"><input type="radio" name="pay" disabled /><span className="pay-ico momo">MoMo</span><span><strong>MTN Mobile Money</strong><small>Coming soon</small></span></label>
              <label className="pay-option is-disabled" aria-disabled="true"><input type="radio" name="pay" disabled /><span className="pay-ico airtel">AM</span><span><strong>Airtel Money</strong><small>Coming soon</small></span></label>
            </div>
          </section>

          <label className="check"><input type="checkbox" checked={remember} onChange={e => setRemember(e.target.checked)} /> Remember my details on this device</label>
        </div>

        <aside className="checkout-aside">
          <OrderSummary subtotal={cart.subtotalRwf} itemCount={count} title="Your order">
            <ul className="mini-lines">
              {cart.items.map(i => (
                <li key={i.productId}>
                  <span className="mini-thumb"><ProductImage src={i.product.imageUrl} alt="" sizes="48px" /><span className="mini-qty">{i.quantity}</span></span>
                  <span className="grow"><strong>{i.product.name}</strong><small className="muted">{i.quantity} × {formatRwf(i.product.priceRwf)}</small></span>
                  <span className="mini-total">{formatRwf(i.quantity * i.product.priceRwf)}</span>
                </li>
              ))}
            </ul>
            {stockProblem && <div className="alert alert-warn"><Icon name="alert" size={16} /> Only {stockProblem.product.stock} “{stockProblem.product.name}” left. <Link href="/cart">Update cart</Link></div>}
            {serverError && <div className="alert alert-error" role="alert"><Icon name="alert" size={16} /> {serverError}</div>}
            <Button type="submit" size="lg" block loading={submitting} disabled={Boolean(stockProblem)}>{submitting ? 'Placing your order…' : `Place order · ${formatRwf(cart.subtotalRwf)}`}</Button>
            <p className="summary-note"><Icon name="lock" size={14} /> Your details are only used to process this order.</p>
          </OrderSummary>
        </aside>
      </form>
    </div>
  );
}
