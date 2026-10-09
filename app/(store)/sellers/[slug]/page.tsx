import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProducts, getPublicSellers } from '@/lib/catalog';
import { ProductCard } from '@/components/product/ProductCard';
import { Icon } from '@/components/ui/Icon';

export const dynamic = 'force-dynamic';

export default async function SellerStorefront({ params }: { params: { slug: string } }) {
  const sellers = await getPublicSellers();
  const seller = sellers.find(s => s.id === params.slug);
  if (!seller) notFound();
  const { products } = await getProducts({ seller: seller.id, pageSize: 24, sort: 'newest' });
  const productCount = seller.products?.length ?? products.length;

  return (
    <main className="fig-page">
      <section className="fig-page-hero">
        <div className="container">
          <span className="eyebrow">Verified supplier</span>
          <div className="fig-page-hero-grid">
            <div>
              <h1>{seller.businessName}</h1>
              <p>{seller.address || 'Approved Gwizineza seller'} · {productCount} marketplace products</p>
              <div className="row wrap" style={{ marginTop: 24 }}>
                <Link href="/shop" className="btn btn-primary">Browse marketplace <Icon name="arrowRight" size={17} /></Link>
                <Link href="/contact" className="btn btn-outline">Contact support</Link>
              </div>
            </div>
            <div className="fig-hero-orb"><Icon name="store" size={54} /></div>
          </div>
        </div>
      </section>
      <section className="container section-tight">
        <div className="section-head"><div><span className="eyebrow">Storefront</span><h2>Products from {seller.businessName}</h2></div></div>
        {products.length ? <div className="product-grid">{products.map(p => <ProductCard key={p.id} product={p} />)}</div> : (
          <div className="fig-empty"><Icon name="box" size={34} /><h3>No products published yet</h3><p>This approved seller is preparing their storefront.</p></div>
        )}
      </section>
    </main>
  );
}
