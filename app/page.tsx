const products = [
  { name: 'Everyday Essentials', price: '12,500 RWF', icon: '🛍️', category: 'Featured' },
  { name: 'Home & Kitchen', price: '18,000 RWF', icon: '🏠', category: 'Popular' },
  { name: 'Personal Care', price: '9,500 RWF', icon: '✨', category: 'New' },
];

export default function Home() {
  return (
    <>
      <header className="nav">
        <div className="container nav-inner">
          <div className="logo">Gwizineza<span> Market</span></div>
          <nav className="nav-links"><a href="#products">Products</a><a href="#how">How it works</a><a href="#checkout">Checkout</a></nav>
          <button className="btn btn-primary">Cart (0)</button>
        </div>
      </header>

      <main>
        <section className="hero">
          <div className="container hero-grid">
            <div>
              <div className="eyebrow">Online shopping in Rwanda</div>
              <h1>Shop what you need. We deliver.</h1>
              <p>Discover goods, order online, pay securely, and receive your purchase details and receipt directly on WhatsApp.</p>
              <div className="actions"><a className="btn btn-primary" href="#products">Start shopping</a><a className="btn btn-secondary" href="#how">How it works</a></div>
            </div>
            <div className="hero-card"><div className="badge">Simple checkout</div><h2>Your order, from click to delivery</h2><p className="muted">Products → Cart → Customer details → Payment → EBM receipt → WhatsApp</p><div className="amount">Fast & clear</div><div className="muted">A shared foundation for web and future mobile app.</div></div>
          </div>
        </section>

        <section id="products" className="section">
          <div className="container"><h2>Featured products</h2><p className="muted">The catalog foundation is ready for real products and inventory.</p>
            <div className="products">{products.map((product) => <article className="product" key={product.name}><div className="product-image">{product.icon}</div><div className="product-body"><div className="badge">{product.category}</div><h3>{product.name}</h3><div className="price">{product.price}</div><button className="btn btn-primary" style={{marginTop: 14, width: '100%'}}>Add to cart</button></div></article>)}</div>
          </div>
        </section>

        <section id="how" className="section"><div className="container"><div className="checkout"><div><div className="eyebrow">Checkout foundation</div><h2>Payment + TIN + EBM + WhatsApp</h2><p>At checkout, the customer can provide a phone number and TIN when an EBM invoice is required. After the payment is verified by the backend, the order can trigger EBM processing and send the receipt to that same WhatsApp number.</p></div><div id="checkout" className="form"><label>Customer phone / WhatsApp</label><input placeholder="07XX XXX XXX" /><label>TIN (if required)</label><input placeholder="Enter TIN" /><label>Delivery address</label><input placeholder="Kigali, district, sector..." /><button className="btn btn-primary">Continue to payment</button><div className="note">Payment, EBM and WhatsApp integrations will be connected through secure server-side services.</div></div></div></div></section>
      </main>

      <footer className="footer"><div className="container">© 2026 Gwizineza Market · E-commerce foundation</div></footer>
    </>
  );
}
