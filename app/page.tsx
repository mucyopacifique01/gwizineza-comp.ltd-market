'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';

type Product = {
  id: string;
  name: string;
  priceRwf: number;
  stock: number;
  category: { name: string } | null;
  imageUrl?: string | null;
};

type CartItem = {
  productId: string;
  quantity: number;
  product: Product;
};

type Cart = {
  items: CartItem[];
  subtotalRwf: number;
};

const money = (value: number) => `${value.toLocaleString('en-US')} RWF`;

function getCartId() {
  const existing = window.localStorage.getItem('gwizineza-cart-id');
  if (existing) return existing;
  const id = window.crypto.randomUUID();
  window.localStorage.setItem('gwizineza-cart-id', id);
  return id;
}

export default function Home() {
  const [products, setProducts] = useState<Product[]>([]);
  const [cart, setCart] = useState<Cart>({ items: [], subtotalRwf: 0 });
  const [cartId, setCartId] = useState('');
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [order, setOrder] = useState<{ orderNumber: string; totalRwf: number; status: string } | null>(null);
  const [form, setForm] = useState({ customerName: '', phone: '', deliveryAddress: '' });

  const cartCount = useMemo(() => cart.items.reduce((sum, item) => sum + item.quantity, 0), [cart.items]);

  async function loadCart(id: string) {
    const response = await fetch(`/api/cart?cartId=${encodeURIComponent(id)}`, { cache: 'no-store' });
    if (!response.ok) throw new Error('Could not load cart');
    const data = await response.json();
    setCart(data.cart);
  }

  useEffect(() => {
    const id = getCartId();
    setCartId(id);

    Promise.all([
      fetch('/api/products', { cache: 'no-store' }).then(async (response) => {
        if (!response.ok) throw new Error('Could not load products');
        return response.json();
      }),
      loadCart(id),
    ])
      .then(([productData]) => setProducts(productData.products ?? []))
      .catch(() => setMessage('We could not load the store right now. Please refresh and try again.'))
      .finally(() => setLoading(false));
  }, []);

  async function addToCart(product: Product) {
    setMessage('');
    const existing = cart.items.find((item) => item.productId === product.id);
    const quantity = (existing?.quantity ?? 0) + 1;
    if (quantity > product.stock) {
      setMessage(`Only ${product.stock} ${product.name} available.`);
      return;
    }

    const response = await fetch('/api/cart', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, productId: product.id, quantity }),
    });
    const data = await response.json();
    if (!response.ok) {
      setMessage(data.error ?? 'Could not add this product.');
      return;
    }
    await loadCart(cartId);
    setMessage(`${product.name} added to your cart.`);
  }

  async function removeFromCart(productId: string) {
    await fetch('/api/cart', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cartId, productId }),
    });
    await loadCart(cartId);
  }

  async function submitCheckout(event: FormEvent) {
    event.preventDefault();
    setSubmitting(true);
    setMessage('');

    try {
      const response = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ cartId, ...form }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? 'Could not place order');
      setOrder(data.order);
      setCheckoutOpen(false);
      await loadCart(cartId);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not place order.');
    } finally {
      setSubmitting(false);
    }
  }

  const openShop = () => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <div className="logo">Gwizineza<span> Market</span></div>
          <nav className="nav-links"><a href="#products">Products</a><a href="#how">How it works</a><a href="#location">Location</a><a href="#checkout">Checkout</a></nav>
          <button className="btn btn-primary" onClick={() => setCheckoutOpen(true)}>Cart ({cartCount})</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">ONLINE SHOPPING IN RWANDA</div>
              <h1>Shop what you need.<br />We deliver.</h1>
              <p>Discover goods, choose what you need, place your order online, and receive your order details.</p>
              <div className="actions"><button className="btn btn-primary" onClick={openShop}>Start shopping</button><a className="btn btn-secondary" href="#how">How it works</a></div>
            </div>
            <div className="hero-card"><div className="badge">Live store</div><h2>Your order, from click to delivery</h2><p className="muted">Products → Cart → Customer details → Order confirmation</p><div className="amount">{cartCount} item{cartCount === 1 ? '' : 's'} in cart</div><div className="muted">The website and future mobile app can share the same backend.</div></div>
          </div>
        </section>

        <section id="products" className="section">
          <div className="container"><h2>Shop products</h2><p className="muted">Choose a product and add it to your cart.</p>
            {loading ? <p>Loading products...</p> : products.length === 0 ? <div className="note">No products are available yet. Add products from the admin area.</div> : <div className="products">{products.map((product) => <article className="product" key={product.id}><div className="product-image">{product.imageUrl ? <img src={product.imageUrl} alt={product.name} /> : '🛍️'}</div><div className="product-body"><div className="badge">{product.category?.name ?? 'Featured'}</div><h3>{product.name}</h3><div className="price">{money(product.priceRwf)}</div><div className="muted">{product.stock} in stock</div><button className="btn btn-primary" style={{ marginTop: 14, width: '100%' }} onClick={() => addToCart(product)} disabled={product.stock < 1}>Add to cart</button></div></article>)}</div>}
            {message && <div className="note" style={{ marginTop: 18 }}>{message}</div>}
          </div>
        </section>

        <section id="location" className="section">
          <div className="container">
            <div className="checkout">
              <div>
                <div className="eyebrow">Our location</div>
                <h2>Gwizineza Market — Kabarondo, Rwanda</h2>
                <p className="muted">Our business location is in Kabarondo, Kayonza District, Eastern Province, Rwanda.</p>
                <p className="muted">Approximate map coordinates: <strong>-2.0127, 30.5585</strong>.</p>
                <a className="btn btn-secondary" href="https://www.openstreetmap.org/?mlat=-2.0127&mlon=30.5585#map=15/-2.0127/30.5585" target="_blank" rel="noreferrer">Open map</a>
              </div>
              <div style={{ overflow: 'hidden', borderRadius: 16, minHeight: 320, border: '1px solid #ddd' }}>
                <iframe title="Gwizineza Market location in Kabarondo, Rwanda" src="https://www.openstreetmap.org/export/embed.html?bbox=30.535%2C-2.030%2C30.582%2C-1.995&layer=mapnik&marker=-2.0127%2C30.5585" style={{ width: '100%', height: 320, border: 0 }} loading="lazy" />
              </div>
            </div>
          </div>
        </section>

        <section id="how" className="section"><div className="container"><div className="checkout"><div><div className="eyebrow">Simple ordering</div><h2>Order online</h2><p>Customers provide their name, phone number, and delivery address. The server creates the order and reserves stock.</p></div><div id="checkout" className="form"><label>Customer name</label><input value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Your name" /><label>Customer phone</label><input value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" /><label>Delivery address</label><input value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Kabarondo, district, sector..." /><button className="btn btn-primary" onClick={() => setCheckoutOpen(true)} disabled={cartCount === 0}>Review cart & place order</button><div className="note">No payment or tax information is requested at this stage.</div></div></div></div></section>

        {order && <section className="section"><div className="container"><div className="checkout"><div><div className="eyebrow">Order created</div><h2>Order {order.orderNumber}</h2><p>Your order has been created successfully.</p></div><div><div className="price">{money(order.totalRwf)}</div><div className="muted">Status: {order.status}</div></div></div></div></section>}
      </main>

      {checkoutOpen && <div className="modal-backdrop" role="presentation" onClick={() => setCheckoutOpen(false)}><div className="modal" role="dialog" aria-modal="true" aria-labelledby="cart-title" onClick={(e) => e.stopPropagation()}><button className="modal-close" onClick={() => setCheckoutOpen(false)} aria-label="Close">×</button><h2 id="cart-title">Your cart</h2>{cart.items.length === 0 ? <p className="muted">Your cart is empty.</p> : <><div>{cart.items.map((item) => <div className="cart-row" key={item.productId}><div><strong>{item.product.name}</strong><div className="muted">{item.quantity} × {money(item.product.priceRwf)}</div></div><button className="btn btn-secondary" onClick={() => removeFromCart(item.productId)}>Remove</button></div>)}</div><div className="cart-total">Total: {money(cart.subtotalRwf)}</div><form className="form" onSubmit={submitCheckout}><label>Customer name</label><input required value={form.customerName} onChange={(e) => setForm({ ...form, customerName: e.target.value })} placeholder="Your name" /><label>Phone</label><input required value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="07XX XXX XXX" /><label>Delivery address</label><input required value={form.deliveryAddress} onChange={(e) => setForm({ ...form, deliveryAddress: e.target.value })} placeholder="Kabarondo, district, sector..." /><button className="btn btn-primary" type="submit" disabled={submitting}>{submitting ? 'Placing order...' : 'Place order'}</button></form></>}</div></div>}

      <footer className="footer"><div className="container">© 2026 Gwizineza Market · Kabarondo, Rwanda · E-commerce foundation</div></footer>
    </>
  );
}
