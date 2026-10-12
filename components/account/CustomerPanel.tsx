'use client';

import Link from 'next/link';
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Icon, type IconName } from '@/components/ui/Icon';
import { StatusBadge } from '@/components/ui/Badge';
import { ProductCard } from '@/components/product/ProductCard';
import { useCart } from '@/components/providers/CartProvider';
import { useWishlist } from '@/components/providers/WishlistProvider';
import { formatDate, formatRwf } from '@/lib/format';
import type { ProductDTO } from '@/lib/types';

type Customer = { id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null; createdAt: string };
type OrderItem = { id: string; productName: string; quantity: number; lineTotalRwf: number; imageUrl?: string | null; slug?: string | null };
type Order = { id: string; orderNumber: string; totalRwf: number; status: string; createdAt: string; items: OrderItem[]; payment?: { status: string; method: string } | null };
type TabKey = 'overview' | 'profile' | 'cart' | 'saved' | 'orders';

const TABS: { key: TabKey; label: string; icon: IconName }[] = [
  { key: 'overview', label: 'Overview', icon: 'home' },
  { key: 'profile', label: 'My details', icon: 'user' },
  { key: 'cart', label: 'My cart', icon: 'bag' },
  { key: 'saved', label: 'Saved products', icon: 'heart' },
  { key: 'orders', label: 'My orders', icon: 'receipt' },
];

async function call<T>(url: string, init?: RequestInit): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      credentials: 'include',
      cache: 'no-store',
      ...init,
      headers: init?.body ? { 'Content-Type': 'application/json', ...(init.headers || {}) } : init?.headers,
    });
  } catch {
    throw Object.assign(new Error('We could not reach Gwizineza Market. Check your connection and try again.'), { status: 0 });
  }
  const body = (await response.json().catch(() => ({}))) as { error?: string } & T;
  if (!response.ok) throw Object.assign(new Error(body.error || 'Something went wrong. Please try again.'), { status: response.status });
  return body;
}

export function CustomerPanel() {
  const router = useRouter();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [state, setState] = useState<'loading' | 'signedOut' | 'error' | 'ready'>('loading');
  const [loadError, setLoadError] = useState('');
  const [tab, setTab] = useState<TabKey>('overview');
  const [orders, setOrders] = useState<Order[] | null>(null);
  const [ordersError, setOrdersError] = useState('');
  const [signingOut, setSigningOut] = useState(false);

  const loadCustomer = useCallback(async () => {
    setState('loading');
    try {
      const data = await call<{ customer: Customer }>('/api/customer/me');
      setCustomer(data.customer);
      setState('ready');
    } catch (e) {
      const status = (e as { status?: number }).status;
      if (status === 401) setState('signedOut');
      else { setLoadError(e instanceof Error ? e.message : 'Could not load your account.'); setState('error'); }
    }
  }, []);

  const loadOrders = useCallback(async () => {
    setOrdersError('');
    try {
      const data = await call<{ orders: Order[] }>('/api/customer/orders');
      setOrders(data.orders || []);
    } catch (e) {
      setOrdersError(e instanceof Error ? e.message : 'Could not load your orders.');
      setOrders([]);
    }
  }, []);

  useEffect(() => { void loadCustomer(); }, [loadCustomer]);
  useEffect(() => { if (state === 'ready') void loadOrders(); }, [state, loadOrders]);

  // Deep-link support: /account#cart, /account#orders ...
  useEffect(() => {
    const fromHash = window.location.hash.replace('#', '') as TabKey;
    if (TABS.some(t => t.key === fromHash)) setTab(fromHash);
  }, []);
  const selectTab = (key: TabKey) => { setTab(key); window.history.replaceState(null, '', '#' + key); };

  async function signOut() {
    setSigningOut(true);
    try { await call('/api/customer/auth/logout', { method: 'POST' }); } catch { /* cookie cleared best-effort; still leave */ }
    window.dispatchEvent(new Event('gwizineza-auth-changed'));
    router.push('/auth');
    router.refresh();
  }

  if (state === 'loading') return <div className="fig-empty"><span className="spinner" aria-label="Loading" /><p>Loading your account…</p></div>;
  if (state === 'signedOut') {
    return (
      <div className="fig-empty">
        <Icon name="user" size={34} />
        <h3>Sign in to manage your account</h3>
        <p>Your details, cart, saved products and orders live here once you sign in.</p>
        <Link href="/auth" className="btn btn-primary">Sign in or join free</Link>
      </div>
    );
  }
  if (state === 'error' || !customer) {
    return (
      <div className="fig-empty">
        <Icon name="alert" size={34} />
        <h3>Could not load your account</h3>
        <p>{loadError}</p>
        <button className="btn btn-outline" onClick={() => void loadCustomer()}>Try again</button>
      </div>
    );
  }

  return (
    <div className="acct-shell">
      <aside className="acct-side" aria-label="Account menu">
        <div className="acct-id">
          <span className="acct-avatar" aria-hidden="true">{(customer.name || '?').trim().charAt(0).toUpperCase()}</span>
          <div>
            <strong>{customer.name}</strong>
            <small>{customer.email || customer.phone || 'Gwizineza customer'}</small>
          </div>
        </div>
        <nav className="acct-nav" role="tablist" aria-orientation="vertical">
          {TABS.map(t => (
            <button key={t.key} type="button" role="tab" aria-selected={tab === t.key} className={tab === t.key ? 'is-active' : ''} onClick={() => selectTab(t.key)}>
              <Icon name={t.icon} size={18} /> {t.label}
            </button>
          ))}
          <button type="button" className="acct-signout" onClick={() => void signOut()} disabled={signingOut}>
            <Icon name="logout" size={18} /> {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </nav>
      </aside>

      <section className="acct-main" role="tabpanel">
        {tab === 'overview' && <Overview customer={customer} orders={orders} onGo={selectTab} />}
        {tab === 'profile' && <Profile customer={customer} onSaved={setCustomer} />}
        {tab === 'cart' && <CartTab />}
        {tab === 'saved' && <SavedTab />}
        {tab === 'orders' && <OrdersTab orders={orders} error={ordersError} retry={() => void loadOrders()} />}
      </section>
    </div>
  );
}

function Overview({ customer, orders, onGo }: { customer: Customer; orders: Order[] | null; onGo: (t: TabKey) => void }) {
  const { count, cart } = useCart();
  const wishlist = useWishlist();
  const latest = orders?.[0];
  return (
    <div className="acct-stack">
      <h2>Welcome back, {customer.name.split(' ')[0]}</h2>
      <div className="acct-stats">
        <button type="button" onClick={() => onGo('cart')}><small>Items in cart</small><strong>{count}</strong><span>{formatRwf(cart.subtotalRwf)}</span></button>
        <button type="button" onClick={() => onGo('saved')}><small>Saved products</small><strong>{wishlist.ready ? wishlist.ids.length : '…'}</strong><span>Wishlist</span></button>
        <button type="button" onClick={() => onGo('orders')}><small>Orders</small><strong>{orders ? orders.length : '…'}</strong><span>{latest ? 'Latest: ' + latest.orderNumber : 'No orders yet'}</span></button>
      </div>
      <div className="acct-card">
        <div className="row-between"><h3>Your details</h3><button type="button" className="btn btn-outline btn-sm" onClick={() => onGo('profile')}>Edit</button></div>
        <dl className="acct-dl">
          <div><dt>Name</dt><dd>{customer.name}</dd></div>
          <div><dt>Email</dt><dd>{customer.email || 'Not set'}</dd></div>
          <div><dt>Phone</dt><dd>{customer.phone || 'Not set'}</dd></div>
          <div><dt>Member since</dt><dd>{formatDate(customer.createdAt)}</dd></div>
        </dl>
      </div>
    </div>
  );
}

function Profile({ customer, onSaved }: { customer: Customer; onSaved: (c: Customer) => void }) {
  const [name, setName] = useState(customer.name);
  const [phone, setPhone] = useState(customer.phone || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const dirty = name.trim() !== customer.name || phone.trim() !== (customer.phone || '');

  async function save(event: React.FormEvent) {
    event.preventDefault();
    setError(''); setNotice('');
    if (name.trim().length < 2) { setError('Enter your name using at least two characters.'); return; }
    setSaving(true);
    try {
      const data = await call<{ customer: Customer }>('/api/customer/me', { method: 'PATCH', body: JSON.stringify({ name: name.trim(), phone: phone.trim() }) });
      onSaved(data.customer);
      setName(data.customer.name);
      setPhone(data.customer.phone || '');
      setNotice('Your details were saved.');
      window.dispatchEvent(new Event('gwizineza-auth-changed'));
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not save your details.');
    } finally { setSaving(false); }
  }

  return (
    <form className="acct-stack" onSubmit={save} noValidate>
      <h2>My details</h2>
      <div className="acct-card acct-form">
        <label><span>Full name</span><input className="input" value={name} onChange={e => setName(e.target.value)} maxLength={120} autoComplete="name" required /></label>
        <label><span>Phone number</span><input className="input" type="tel" value={phone} onChange={e => setPhone(e.target.value)} maxLength={20} autoComplete="tel" placeholder="078 123 4567" /></label>
        <label><span>Email</span><input className="input" value={customer.email || 'Not set'} disabled readOnly /><small className="muted">Your email comes from how you signed in and can&apos;t be changed here.</small></label>
        {error && <p className="alert alert-error" role="alert">{error}</p>}
        {notice && <p className="alert alert-success" role="status">{notice}</p>}
        <div className="row wrap">
          <button className="btn btn-primary" type="submit" disabled={saving || !dirty}>{saving ? 'Saving…' : 'Save changes'}</button>
          <button className="btn btn-outline" type="button" disabled={saving || !dirty} onClick={() => { setName(customer.name); setPhone(customer.phone || ''); setError(''); setNotice(''); }}>Reset</button>
        </div>
      </div>
    </form>
  );
}

function CartTab() {
  const { cart, ready, error, pending, setQuantity, remove, refresh } = useCart();
  if (!ready) return <div className="fig-empty"><span className="spinner" aria-label="Loading" /><p>Loading your cart…</p></div>;
  if (error) return <div className="fig-empty"><Icon name="alert" size={34} /><h3>Could not load your cart</h3><p>{error}</p><button className="btn btn-outline" onClick={() => void refresh()}>Try again</button></div>;
  if (!cart.items.length) return <div className="fig-empty"><Icon name="bag" size={34} /><h3>Your cart is empty</h3><p>Add products from the shop and they will show up here.</p><Link href="/shop" className="btn btn-primary">Browse products</Link></div>;
  return (
    <div className="acct-stack">
      <h2>My cart</h2>
      <div className="acct-card">
        <ul className="acct-lines">
          {cart.items.map(line => {
            const busy = Boolean(pending[line.productId]);
            return (
              <li key={line.productId}>
                {line.product.imageUrl ? /* eslint-disable-next-line @next/next/no-img-element */ <img src={line.product.imageUrl} alt="" width={64} height={64} /> : <span className="acct-noimg"><Icon name="bag" size={22} /></span>}
                <div className="acct-line-main">
                  <Link href={'/product/' + line.product.slug}>{line.product.name}</Link>
                  <small>{formatRwf(line.product.priceRwf)} each{line.product.stock < 6 ? ' · only ' + line.product.stock + ' left' : ''}</small>
                </div>
                <div className="acct-qty" aria-label={'Quantity for ' + line.product.name}>
                  <button type="button" disabled={busy || line.quantity <= 1} onClick={() => void setQuantity(line, line.quantity - 1)} aria-label="Decrease quantity"><Icon name="minus" size={14} /></button>
                  <span aria-live="polite">{line.quantity}</span>
                  <button type="button" disabled={busy || line.quantity >= line.product.stock} onClick={() => void setQuantity(line, line.quantity + 1)} aria-label="Increase quantity"><Icon name="plus" size={14} /></button>
                </div>
                <strong className="acct-line-total">{formatRwf(line.product.priceRwf * line.quantity)}</strong>
                <button type="button" className="acct-remove" disabled={busy} onClick={() => void remove(line.productId)} aria-label={'Remove ' + line.product.name}><Icon name="trash" size={17} /></button>
              </li>
            );
          })}
        </ul>
        <div className="acct-total"><span>Subtotal</span><strong>{formatRwf(cart.subtotalRwf)}</strong></div>
        <div className="row wrap">
          <Link href="/checkout" className="btn btn-primary">Checkout <Icon name="arrowRight" size={16} /></Link>
          <Link href="/shop" className="btn btn-outline">Keep shopping</Link>
        </div>
      </div>
    </div>
  );
}

function SavedTab() {
  const wishlist = useWishlist();
  const [items, setItems] = useState<ProductDTO[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  const idKey = wishlist.ids.join(',');

  useEffect(() => {
    if (!wishlist.ready) return;
    if (!wishlist.ids.length) { setItems([]); setLoading(false); return; }
    let alive = true;
    setLoading(true); setError('');
    void Promise.all(wishlist.ids.map(id => call<{ product: ProductDTO }>('/api/products/' + encodeURIComponent(id)).then(r => r.product).catch(() => null)))
      .then(found => { if (alive) setItems(found.filter((p): p is ProductDTO => Boolean(p))); })
      .catch(() => { if (alive) setError('Could not load your saved products.'); })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [idKey, wishlist.ready, retry]);

  if (loading) return <div className="fig-empty"><span className="spinner" aria-label="Loading" /><p>Loading saved products…</p></div>;
  if (error) return <div className="fig-empty"><Icon name="alert" size={34} /><h3>{error}</h3><button className="btn btn-outline" onClick={() => setRetry(n => n + 1)}>Try again</button></div>;
  if (!items.length) return <div className="fig-empty"><Icon name="heart" size={34} /><h3>No saved products yet</h3><p>Tap the heart on any product to keep it here.</p><Link href="/shop" className="btn btn-primary">Find products</Link></div>;
  return (
    <div className="acct-stack">
      <h2>Saved products <span className="muted">({items.length})</span></h2>
      <div className="product-grid">{items.map(p => <ProductCard key={p.id} product={p} />)}</div>
    </div>
  );
}

function OrdersTab({ orders, error, retry }: { orders: Order[] | null; error: string; retry: () => void }) {
  const [open, setOpen] = useState<string | null>(null);
  const sorted = useMemo(() => orders ?? [], [orders]);
  if (orders === null) return <div className="fig-empty"><span className="spinner" aria-label="Loading" /><p>Loading your orders…</p></div>;
  if (error) return <div className="fig-empty"><Icon name="alert" size={34} /><h3>Could not load your orders</h3><p>{error}</p><button className="btn btn-outline" onClick={retry}>Try again</button></div>;
  if (!sorted.length) return <div className="fig-empty"><Icon name="receipt" size={34} /><h3>No orders yet</h3><p>When you place an order while signed in, it will appear here.</p><Link href="/shop" className="btn btn-primary">Start shopping</Link></div>;
  return (
    <div className="acct-stack">
      <h2>My orders</h2>
      {sorted.map(order => (
        <div className="acct-card" key={order.id}>
          <button type="button" className="acct-order-head" aria-expanded={open === order.id} onClick={() => setOpen(open === order.id ? null : order.id)}>
            <span><strong>{order.orderNumber}</strong><small>{formatDate(order.createdAt)}</small></span>
            <span className="acct-order-meta"><StatusBadge status={order.status} /><strong>{formatRwf(order.totalRwf)}</strong></span>
          </button>
          {open === order.id && (
            <div className="acct-order-body">
              <ul>{order.items.map(item => <li key={item.id}><span>{item.productName} × {item.quantity}</span><span>{formatRwf(item.lineTotalRwf)}</span></li>)}</ul>
              {order.payment && <p className="muted small">Payment: {order.payment.method} · {order.payment.status}</p>}
              <Link href={'/orders/' + order.orderNumber} className="link-arrow">View full order <Icon name="arrowRight" size={15} /></Link>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
