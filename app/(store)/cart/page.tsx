'use client';

import Link from 'next/link';
import { useCart } from '@/components/providers/CartProvider';
import { ProductImage } from '@/components/product/ProductImage';
import { QuantityStepper } from '@/components/product/QuantityStepper';
import { OrderSummary } from '@/components/cart/OrderSummary';
import { EmptyState, ErrorState } from '@/components/ui/States';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button, ButtonLink } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { formatRwf } from '@/lib/format';
import { Steps } from '@/components/cart/Steps';

export default function CartPage() {
  const { cart, count, ready, error, pending, setQuantity, remove, refresh } = useCart();

  return (
    <div className="container cart-page">
      <header className="page-head">
        <nav className="crumbs" aria-label="Breadcrumb"><Link href="/">Home</Link><Icon name="chevronRight" size={14} /><span aria-current="page">Cart</span></nav>
        <h1>Your cart</h1>
        <Steps current={0} />
      </header>

      {!ready ? (
        <div className="cart-layout"><div className="stack">{[0, 1, 2].map(i => <Skeleton key={i} height={120} radius={24} />)}</div><Skeleton height={280} radius={24} /></div>
      ) : error ? (
        <ErrorState art="offline" title="We couldn't load your cart" description={error}><Button icon="refresh" onClick={() => void refresh()}>Try again</Button></ErrorState>
      ) : cart.items.length === 0 ? (
        <EmptyState art="cart" title="Your cart is empty" description="Discover everyday goods from trusted local sellers and add them here.">
          <ButtonLink href="/shop" icon="grid">Start shopping</ButtonLink>
          <ButtonLink href="/categories" variant="outline">Browse categories</ButtonLink>
        </EmptyState>
      ) : (
        <div className="cart-layout">
          <ul className="cart-lines" aria-label="Items in your cart">
            {cart.items.map(line => (
              <li key={line.productId} className={`cart-line${pending[line.productId] ? ' is-pending' : ''}`}>
                <Link href={`/product/${line.product.slug}`} className="cart-thumb"><ProductImage src={line.product.imageUrl} alt={line.product.name} sizes="120px" /></Link>
                <div className="cart-line-info">
                  <Link href={`/product/${line.product.slug}`} className="cart-line-name">{line.product.name}</Link>
                  <span className="pcard-seller"><span className="node" aria-hidden="true" />{line.product.seller?.businessName ?? 'Gwizineza Market'}</span>
                  <span className="muted small">{formatRwf(line.product.priceRwf)} each</span>
                  {line.quantity > line.product.stock && <span className="field-error">Only {line.product.stock} left. Reduce the quantity to continue.</span>}
                </div>
                <div className="cart-line-qty">
                  <QuantityStepper size="sm" value={line.quantity} max={Math.max(line.product.stock, 1)} onChange={q => void setQuantity(line, q)} disabled={Boolean(pending[line.productId])} label={`Quantity of ${line.product.name}`} />
                  <button className="link-danger" onClick={() => void remove(line.productId)} disabled={Boolean(pending[line.productId])}><Icon name="trash" size={14} /> Remove</button>
                </div>
                <strong className="cart-line-total">{formatRwf(line.quantity * line.product.priceRwf)}</strong>
              </li>
            ))}
          </ul>
          <aside className="cart-aside">
            <OrderSummary subtotal={cart.subtotalRwf} itemCount={count}>
              <ButtonLink href="/checkout" size="lg" block iconRight="arrowRight">Checkout</ButtonLink>
              <ButtonLink href="/shop" variant="ghost" block icon="arrowLeft">Continue shopping</ButtonLink>
            </OrderSummary>
            <div className="trust-mini"><Icon name="lock" size={16} /> Your cart is saved securely on our server.</div>
          </aside>
          <div className="mobile-cta only-mobile">
            <div><span className="muted tiny">Total</span><strong>{formatRwf(cart.subtotalRwf)}</strong></div>
            <ButtonLink href="/checkout" size="lg" iconRight="arrowRight">Checkout</ButtonLink>
          </div>
        </div>
      )}
    </div>
  );
}
