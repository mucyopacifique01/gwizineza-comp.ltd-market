import Link from 'next/link';
import type { ProductDTO } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Icon, type IconName } from '@/components/ui/Icon';
import { Price } from '@/components/product/Price';

type Kind = 'account'|'wishlist'|'deals'|'trade'|'compare'|'reviews'|'shipping'|'blog'|'analytics'|'finance'|'cms'|'support';

const meta: Record<Kind,{eyebrow:string;title:string;description:string;icon:IconName}>={
 account:{eyebrow:'My Gwizineza',title:'Your marketplace account',description:'Manage your profile, orders, saved products, and buying activity from one place.',icon:'user'},
 wishlist:{eyebrow:'Saved products',title:'Your wishlist',description:'Keep products you want to compare, revisit, or buy later in one clean workspace.',icon:'heart'},
 deals:{eyebrow:'Deals & promotions',title:'Best deals from trusted sellers',description:'Discover limited-time offers, volume pricing, and products selected for value.',icon:'tag'},
 trade:{eyebrow:'Buyer protection',title:'Trade Assurance',description:'A clearer buying journey with seller verification, order records, delivery visibility, and support.',icon:'shield'},
 compare:{eyebrow:'Compare',title:'Compare products side by side',description:'Review price, stock, seller, category, and key product details before you buy.',icon:'layers'},
 reviews:{eyebrow:'Reviews & ratings',title:'What buyers are saying',description:'Build confidence with transparent ratings and verified purchase feedback.',icon:'star'},
 shipping:{eyebrow:'Shipping & logistics',title:'Delivery that stays visible',description:'Understand delivery coverage, handoff, tracking, and support from order to door.',icon:'truck'},
 blog:{eyebrow:'Gwizineza Journal',title:'Market news & buying guides',description:'Practical stories, product guides, seller highlights, and marketplace updates.',icon:'image'},
 analytics:{eyebrow:'Owner console',title:'Marketplace analytics',description:'Monitor sales, customers, sellers, conversion, and product performance.',icon:'chart'},
 finance:{eyebrow:'Owner console',title:'Finance & settlements',description:'Track marketplace revenue, seller balances, orders, refunds, and financial operations.',icon:'money'},
 cms:{eyebrow:'Owner console',title:'Content management',description:'Control homepage sections, promotions, banners, editorial content, and marketplace messaging.',icon:'layers'},
 support:{eyebrow:'Owner console',title:'Support tickets',description:'Centralize customer and seller support, assignments, responses, and resolution tracking.',icon:'users'},
};

function Hero({kind}:{kind:Kind}){const m=meta[kind];return <section className="fig-page-hero"><div className="container"><span className="eyebrow">{m.eyebrow}</span><div className="fig-page-hero-grid"><div><h1>{m.title}</h1><p>{m.description}</p><div className="row wrap" style={{marginTop:24}}><Link href="/shop" className="btn btn-primary">Continue shopping <Icon name="arrowRight" size={17}/></Link><Link href="/contact" className="btn btn-outline">Need help?</Link></div></div><div className="fig-hero-orb"><Icon name={m.icon} size={54}/><span className="orb-dot orb-a"/><span className="orb-dot orb-b"/><span className="orb-dot orb-c"/></div></div></div></section>}

const features:{icon:IconName;title:string;text:string}[]=[
 {icon:'shield',title:'Verified marketplace',text:'Approved sellers and clear marketplace ownership.'},
 {icon:'receipt',title:'Order clarity',text:'Order numbers, items, totals, and status stay easy to find.'},
 {icon:'truck',title:'Delivery visibility',text:'Keep delivery expectations and handoff information visible.'},
 {icon:'whatsapp',title:'Local support',text:'Connect with Gwizineza through familiar communication channels.'},
];

export function FigmaMarketplacePage({kind,products=[]}:{kind:Kind;products?:ProductDTO[]}){
 const m=meta[kind];
 return <main className="fig-page"><Hero kind={kind}/><div className="container fig-page-body">
   <section className="fig-feature-grid">{features.map(f=><article className="fig-feature" key={f.title}><span><Icon name={f.icon} size={22}/></span><h3>{f.title}</h3><p>{f.text}</p></article>)}</section>
   {kind==='account'&&<section className="fig-panel-grid"><div className="fig-panel"><h2>Account overview</h2><div className="fig-metric-grid"><div><small>Orders</small><strong>0</strong></div><div><small>Saved items</small><strong>0</strong></div><div><small>Reviews</small><strong>0</strong></div></div></div><div className="fig-panel"><h2>Quick links</h2><div className="fig-links"><Link href="/orders">Order history <Icon name="arrowRight" size={16}/></Link><Link href="/wishlist">Wishlist <Icon name="arrowRight" size={16}/></Link><Link href="/auth">Profile & security <Icon name="arrowRight" size={16}/></Link></div></div></section>}
   {kind==='wishlist'&&<section><div className="section-head"><div><span className="eyebrow">Saved for later</span><h2>Products you want to revisit</h2></div><Link href="/shop" className="link-arrow">Browse products <Icon name="arrowRight" size={16}/></Link></div>{products.length?<div className="product-grid">{products.slice(0,8).map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="fig-empty"><Icon name="heart" size={34}/><h3>Your wishlist is ready</h3><p>Save products from any product card and they will appear here.</p><Link href="/shop" className="btn btn-primary">Find products</Link></div>}</section>}
   {['deals','blog'].includes(kind)&&<section><div className="section-head"><div><span className="eyebrow">Featured</span><h2>{kind==='deals'?'Today’s marketplace offers':'Latest from Gwizineza'}</h2></div></div>{products.length?<div className="product-grid">{products.slice(0,8).map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="fig-empty"><Icon name={m.icon} size={34}/><h3>Content is being prepared</h3><p>Connect your catalog or publish content from the owner console.</p></div>}</section>}
   {kind==='compare'&&<section className="fig-panel"><h2>Comparison workspace</h2><div className="fig-compare"><div className="fig-compare-head"><span>Product</span><span>Price</span><span>Stock</span><span>Seller</span></div>{products.slice(0,4).map(p=><Link className="fig-compare-row" key={p.id} href={`/product/${p.slug}`}><span>{p.name}</span><Price value={p.priceRwf} size="sm"/><span>{p.stock}</span><span>{p.seller?.businessName??'Gwizineza Market'}</span></Link>)}{!products.length&&<div className="fig-empty">Add products from the shop to compare them.</div>}</div></section>}
   {kind==='reviews'&&<section className="fig-review-grid">{[1,2,3].map(i=><article className="fig-review" key={i}><div className="row"><span className="fig-avatar">{String.fromCharCode(64+i)}</span><div><strong>{['Verified buyer','Repeat customer','Business buyer'][i-1]}</strong><div className="fig-stars">★★★★★</div></div></div><p>Clear product information and a straightforward buying experience. The marketplace made it easy to understand the seller and order.</p></article>)}</section>}
   {['trade','shipping'].includes(kind)&&<section className="fig-process">{(kind==='trade'?[['shield','Seller verification'],['receipt','Order record'],['truck','Delivery handoff'],['users','Support if needed']]:[['box','Order prepared'],['truck','Dispatched'],['pin','Delivery arranged'],['check','Completed']]).map(([icon,title],i)=><div key={title}><span className="fig-step"><Icon name={icon as IconName} size={21}/></span><small>0{i+1}</small><h3>{title}</h3><p>Clear status, ownership, and next action.</p></div>)}</section>}
   {['analytics','finance','cms','support'].includes(kind)&&<section className="fig-admin-grid"><div className="fig-panel"><h2>Operational overview</h2><div className="fig-chart"><span style={{height:'42%'}}/><span style={{height:'64%'}}/><span style={{height:'51%'}}/><span style={{height:'78%'}}/><span style={{height:'69%'}}/><span style={{height:'92%'}}/><span style={{height:'84%'}}/></div></div><div className="fig-panel"><h2>Actions</h2><div className="fig-links"><Link href="/admin">Dashboard <Icon name="arrowRight" size={16}/></Link><Link href="/admin/orders">Orders <Icon name="arrowRight" size={16}/></Link><Link href="/admin/products">Products <Icon name="arrowRight" size={16}/></Link><Link href="/admin/settings">Settings <Icon name="arrowRight" size={16}/></Link></div></div></section>}
 </div></main>
}
