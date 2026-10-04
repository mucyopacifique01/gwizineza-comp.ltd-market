
'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import type { ProductDTO } from '@/lib/types';
import { ProductCard } from '@/components/product/ProductCard';
import { Price } from '@/components/product/Price';
import { Icon, type IconName } from '@/components/ui/Icon';
import { formatDate, formatRwf } from '@/lib/format';

type Kind = 'account'|'wishlist'|'deals'|'trade'|'compare'|'reviews'|'shipping'|'blog'|'analytics'|'finance'|'cms'|'support';
type JsonState<T> = { data: T | null; loading: boolean; error: string };

type Customer = { id: string; name: string; email: string | null; phone: string | null; avatarUrl: string | null; createdAt: string };
type CustomerOrder = { id: string; orderNumber: string; totalRwf: number; status: string; createdAt: string; items: { productName: string; quantity: number; lineTotalRwf: number }[]; payment?: { status: string; method: string } | null };
type WishlistItem = { id: string; product: ProductDTO };
type Review = { id: string; productId: string; rating: number; title: string | null; body: string | null; verified: boolean; createdAt: string; customer?: { name: string; avatarUrl: string | null } | null };
type DeliveryZone = { id: string; name: string; feeRwf: number; etaMinDays: number; etaMaxDays: number; active: boolean };
type ContentPost = { id: string; slug: string; title: string; excerpt: string | null; body: string; status: 'DRAFT'|'PUBLISHED'; publishedAt: string | null; createdAt: string; updatedAt: string };
type AdminStats = { totals: { salesRwf: number; orders: number; products: number; activeProducts: number; sellers: number; pendingSellers: number; customers: number }; salesByDay: { date: string; totalRwf: number; orders: number }[]; recentOrders: { orderNumber: string; customerName: string; totalRwf: number; status: string; createdAt: string }[]; lowStock: { id: string; name: string; stock: number; seller?: { businessName: string } | null }[] };
type Finance = { summary: { paidRwf: number; pendingRwf: number; refundedRwf: number; cancelledRwf: number; orders: number } };
type Ticket = { id: string; subject: string; message: string; status: string; priority: string; createdAt: string; updatedAt: string; customer?: { name: string; email: string | null; phone: string | null } | null };

const meta: Record<Kind,{eyebrow:string;title:string;description:string;icon:IconName}>= {
 account:{eyebrow:'My Gwizineza',title:'Your marketplace account',description:'Manage your profile, orders, saved products, and buying activity from one place.',icon:'user'},
 wishlist:{eyebrow:'Saved products',title:'Your wishlist',description:'Keep products you want to compare, revisit, or buy later in one clean workspace.',icon:'heart'},
 deals:{eyebrow:'Deals & promotions',title:'Best deals from trusted sellers',description:'Discover products with real markdowns from the marketplace catalogue.',icon:'tag'},
 trade:{eyebrow:'Buyer protection',title:'Trade Assurance',description:'A clearer buying journey with seller verification, order records, delivery visibility, and support.',icon:'shield'},
 compare:{eyebrow:'Compare',title:'Compare products side by side',description:'Select products and compare price, stock, category, and seller before buying.',icon:'layers'},
 reviews:{eyebrow:'Reviews & ratings',title:'What buyers are saying',description:'Published reviews from real customer accounts, including verified-purchase status.',icon:'star'},
 shipping:{eyebrow:'Shipping & logistics',title:'Delivery that stays visible',description:'See the active delivery zones, fees, and expected delivery windows configured by the owner.',icon:'truck'},
 blog:{eyebrow:'Gwizineza Journal',title:'Market news & buying guides',description:'Published marketplace articles and buying guidance managed from the owner CMS.',icon:'image'},
 analytics:{eyebrow:'Owner console',title:'Marketplace analytics',description:'Monitor sales, customers, sellers, orders, stock, and recent activity from live database totals.',icon:'chart'},
 finance:{eyebrow:'Owner console',title:'Finance & settlements',description:'Track paid, pending, refunded, and cancelled payment amounts from the payment ledger.',icon:'money'},
 cms:{eyebrow:'Owner console',title:'Content management',description:'Create and publish marketplace articles and messages without changing code.',icon:'layers'},
 support:{eyebrow:'Owner console',title:'Support tickets',description:'Review support requests and move them through the real ticket workflow.',icon:'users'},
};

const features:[IconName,string,string][] = [
 ['shield','Verified marketplace','Approved sellers and clear marketplace ownership.'],
 ['receipt','Order clarity','Order numbers, items, totals, and status stay easy to find.'],
 ['truck','Delivery visibility','Keep delivery expectations and handoff information visible.'],
 ['whatsapp','Local support','Connect with Gwizineza through familiar communication channels.'],
];

async function request<T>(url: string, init?: RequestInit, loginPath?: string): Promise<T> {
 const response = await fetch(url, { ...init, credentials:'include', headers:{'Content-Type':'application/json', ...(init?.headers || {})}, cache:'no-store' });
 const body = await response.json().catch(() => ({}));
 if (!response.ok) { if ((response.status === 401 || response.status === 403) && loginPath && typeof window !== 'undefined') window.location.assign(loginPath); throw new Error(body?.error || (response.status === 401 ? 'Please sign in to continue.' : 'You do not have permission to access this page.')); }
 return body as T;
}

function useJson<T>(url: string | null, loginPath?: string): JsonState<T> & { reload: () => void } {
 const [state,setState] = useState<JsonState<T>>({data:null,loading:Boolean(url),error:''});
 const [nonce,setNonce] = useState(0);
 useEffect(() => {
  if (!url) { setState({data:null,loading:false,error:''}); return; }
  let alive = true;
  setState(s => ({...s,loading:true,error:''}));
  void request<T>(url, undefined, loginPath).then(data => { if (alive) setState({data,loading:false,error:''}); }).catch(error => { if (alive) setState({data:null,loading:false,error:error instanceof Error ? error.message : 'Could not load data'}); });
  return () => { alive = false; };
 }, [url,nonce]);
 return {...state,reload:() => setNonce(n => n+1)};
}

function Hero({kind}:{kind:Kind}) {
 const m=meta[kind];
 return <section className="fig-page-hero"><div className="container"><span className="eyebrow">{m.eyebrow}</span><div className="fig-page-hero-grid"><div><h1>{m.title}</h1><p>{m.description}</p><div className="row wrap fig-page-actions"><Link href="/shop" className="btn btn-primary">Continue shopping <Icon name="arrowRight" size={17}/></Link><Link href="/contact" className="btn btn-outline">Need help?</Link></div></div><div className="fig-hero-orb"><Icon name={m.icon} size={54}/><span/><span/><span/></div></div></div></section>;
}

function LoadingBlock(){return <div className="fig-empty"><span className="spinner" aria-label="Loading"/><p>Loading live marketplace data…</p></div>}
function ErrorBlock({error,retry}:{error:string;retry?:()=>void}){return <div className="fig-empty"><Icon name="alert" size={34}/><h3>Could not load this section</h3><p>{error}</p>{retry&&<button className="btn btn-outline" onClick={retry}>Retry</button>}</div>}

function AccountSection(){
 const account=useJson<{customer:Customer}>('/api/customer/account','/auth');
 const orders=useJson<{orders:CustomerOrder[]}>('/api/customer/orders','/auth');
 const wishlist=useJson<{items:WishlistItem[]}>('/api/wishlist','/auth');
 if(account.loading&&!account.data) return <LoadingBlock/>;
 if(account.error) return <ErrorBlock error={account.error+' Sign in to use your customer account.'}/>;
 const c=account.data!.customer;
 return <section className="fig-panel-grid">
  <div className="fig-panel"><h2>Profile</h2><div className="spec"><div><dt>Name</dt><dd>{c.name}</dd></div><div><dt>Email</dt><dd>{c.email||'Not set'}</dd></div><div><dt>Phone</dt><dd>{c.phone||'Not set'}</dd></div><div><dt>Member since</dt><dd>{formatDate(c.createdAt)}</dd></div></div><Link href="/auth" className="btn btn-outline" style={{marginTop:16}}>Profile & security</Link></div>
  <div className="fig-panel"><h2>Buying activity</h2><div className="fig-metric-grid"><div><small>Orders</small><strong>{orders.data?.orders.length??'—'}</strong></div><div><small>Saved items</small><strong>{wishlist.data?.items.length??'—'}</strong></div><div><small>Delivered</small><strong>{orders.data?.orders.filter(o=>o.status==='DELIVERED').length??'—'}</strong></div></div><div className="fig-links"><Link href="/orders">Order history <Icon name="arrowRight" size={16}/></Link><Link href="/wishlist">Wishlist <Icon name="arrowRight" size={16}/></Link></div></div>
 </section>;
}

function WishlistSection(){
 const state=useJson<{items:WishlistItem[]}>('/api/wishlist');
 if(state.loading&&!state.data) return <LoadingBlock/>;
 if(state.error) return <ErrorBlock error={state.error+' Sign in to manage saved products.'}/>;
 const items=state.data!.items;
 return <section><div className="section-head"><div><span className="eyebrow">Saved for later</span><h2>{items.length} saved product{items.length===1?'':'s'}</h2></div><Link href="/shop" className="link-arrow">Browse products <Icon name="arrowRight" size={16}/></Link></div>{items.length?<div className="product-grid">{items.map(item=><ProductCard key={item.id} product={item.product}/>)}</div>:<div className="fig-empty"><Icon name="heart" size={34}/><h3>Your wishlist is empty</h3><p>Save products from any product card and they will appear here.</p><Link href="/shop" className="btn btn-primary">Find products</Link></div>}</section>;
}

function DealsSection({products}:{products:ProductDTO[]}){
 const deals=products.filter(p=>(p.compareAtPriceRwf??0)>p.priceRwf);
 return <section><div className="section-head"><div><span className="eyebrow">Live catalogue</span><h2>{deals.length} current deal{deals.length===1?'':'s'}</h2></div></div>{deals.length?<div className="product-grid">{deals.map(p=><ProductCard key={p.id} product={p}/>)}</div>:<div className="fig-empty"><Icon name="tag" size={34}/><h3>No marked-down products yet</h3><p>Admins can add a compare-at price in Product Management to publish a real deal.</p><Link href="/shop" className="btn btn-primary">Browse catalogue</Link></div>}</section>;
}

function CompareSection({products}:{products:ProductDTO[]}){
 const [selected,setSelected]=useState<string[]>([]);
 const choices=useMemo(()=>products.filter(p=>selected.includes(p.id)).slice(0,4),[products,selected]);
 return <section className="fig-panel"><div className="row-between"><div><h2>Comparison workspace</h2><p className="muted small">Choose up to four products.</p></div><span className="badge badge-green">{selected.length}/4 selected</span></div><div className="product-grid product-grid-4" style={{marginTop:18}}>{products.slice(0,8).map(p=><label className="fig-feature" key={p.id} style={{cursor:'pointer'}}><div className="row-between"><input type="checkbox" checked={selected.includes(p.id)} disabled={!selected.includes(p.id)&&selected.length>=4} onChange={e=>setSelected(s=>e.target.checked?[...s,p.id]:s.filter(id=>id!==p.id))}/><strong>{p.name}</strong></div><small className="muted">{p.seller?.businessName??'Gwizineza Market'}</small></label>)}</div>{choices.length?<div className="fig-compare" style={{marginTop:24}}><div className="fig-compare-head"><span>Product</span><span>Price</span><span>Stock</span><span>Seller</span></div>{choices.map(p=><Link className="fig-compare-row" key={p.id} href={'/product/'+p.slug}><span>{p.name}</span><Price value={p.priceRwf} size="sm"/><span>{p.stock}</span><span>{p.seller?.businessName??'Gwizineza Market'}</span></Link>)}</div>:<div className="fig-empty" style={{marginTop:18}}>Select products above to compare them.</div>}</section>;
}

function ReviewsSection({products}:{products:ProductDTO[]}){
 const [reviews,setReviews]=useState<Review[]>([]); const [loading,setLoading]=useState(true);
 useEffect(()=>{let alive=true;setLoading(true);void Promise.all(products.slice(0,8).map(p=>request<{reviews:Review[]}>('/api/reviews?productId='+encodeURIComponent(p.id)).catch(()=>({reviews:[]})))).then(all=>{if(alive)setReviews(all.flatMap(x=>x.reviews).sort((a,b)=>+new Date(b.createdAt)-+new Date(a.createdAt)));}).finally(()=>{if(alive)setLoading(false)});return()=>{alive=false}},[products]);
 if(loading) return <LoadingBlock/>;
 return <section><div className="section-head"><div><span className="eyebrow">Published feedback</span><h2>{reviews.length} review{reviews.length===1?'':'s'}</h2></div></div>{reviews.length?<div className="fig-review-grid">{reviews.slice(0,9).map(r=><article className="fig-review" key={r.id}><div className="row"><span className="fig-avatar">{(r.customer?.name||'B').slice(0,1).toUpperCase()}</span><div><strong>{r.customer?.name||'Gwizineza buyer'}</strong><div className="fig-stars">{'★'.repeat(r.rating)}{'☆'.repeat(5-r.rating)}</div></div></div>{r.verified&&<span className="badge badge-green" style={{marginTop:10}}>Verified purchase</span>}{r.title&&<h3 style={{marginTop:12}}>{r.title}</h3>}{r.body&&<p>{r.body}</p>}</article>)}</div>:<div className="fig-empty"><Icon name="star" size={34}/><h3>No published reviews yet</h3><p>Customers can review products after a delivered order. Admins moderate reviews before publication.</p></div>}</section>;
}

function ShippingSection(){
 const zones=useJson<{zones:DeliveryZone[]}>('/api/delivery/zones');
 if(zones.loading&&!zones.data)return <LoadingBlock/>;
 if(zones.error)return <ErrorBlock error={zones.error} retry={zones.reload}/>;
 return <section><div className="section-head"><div><span className="eyebrow">Active delivery zones</span><h2>{zones.data!.zones.length} delivery option{zones.data!.zones.length===1?'':'s'}</h2></div></div>{zones.data!.zones.length?<div className="fig-process">{zones.data!.zones.map((z,i)=><div key={z.id}><span className="fig-step"><Icon name="truck" size={21}/></span><small>{String(i+1).padStart(2,'0')}</small><h3>{z.name}</h3><p>{formatRwf(z.feeRwf)} · {z.etaMinDays}–{z.etaMaxDays} days</p></div>)}</div>:<div className="fig-empty"><Icon name="truck" size={34}/><h3>Delivery zones are not configured yet</h3><p>The owner can add delivery zones and fees from the admin delivery settings.</p></div>}</section>;
}

function BlogSection(){
 const state=useJson<{posts:ContentPost[]}>('/api/content');
 if(state.loading&&!state.data)return <LoadingBlock/>;
 if(state.error)return <ErrorBlock error={state.error} retry={state.reload}/>;
 return <section><div className="section-head"><div><span className="eyebrow">Published content</span><h2>{state.data!.posts.length} article{state.data!.posts.length===1?'':'s'}</h2></div></div>{state.data!.posts.length?<div className="fig-review-grid">{state.data!.posts.map(p=><article className="fig-review" key={p.id}><span className="badge badge-sky">Journal</span><h3 style={{marginTop:12}}>{p.title}</h3>{p.excerpt&&<p>{p.excerpt}</p>}<small className="muted">{p.publishedAt?formatDate(p.publishedAt):formatDate(p.createdAt)}</small></article>)}</div>:<div className="fig-empty"><Icon name="image" size={34}/><h3>No published articles</h3><p>Create and publish content from the owner CMS.</p></div>}</section>;
}

function AdminAnalytics(){
 const s=useJson<AdminStats>('/api/admin/stats','/admin/login');
 if(s.loading&&!s.data)return <LoadingBlock/>;
 if(s.error)return <ErrorBlock error={s.error} retry={s.reload}/>;
 const t=s.data!.totals;
 const maxDay=Math.max(...s.data!.salesByDay.map(x=>x.totalRwf),1);
 return <section className="fig-admin-grid"><div className="fig-panel"><h2>Live marketplace totals</h2><div className="fig-metric-grid"><div><small>Sales</small><strong>{formatRwf(t.salesRwf)}</strong></div><div><small>Orders</small><strong>{t.orders}</strong></div><div><small>Customers</small><strong>{t.customers}</strong></div><div><small>Products</small><strong>{t.activeProducts}/{t.products}</strong></div><div><small>Sellers</small><strong>{t.sellers}</strong></div><div><small>Pending sellers</small><strong>{t.pendingSellers}</strong></div></div></div><div className="fig-panel"><h2>Recent orders</h2><div className="fig-links">{s.data!.recentOrders.map(o=><Link key={o.orderNumber} href={'/orders/'+o.orderNumber}><span>{o.orderNumber} · {o.customerName}</span><strong>{formatRwf(o.totalRwf)}</strong></Link>)}</div></div><div className="fig-panel"><h2>Low stock</h2>{s.data!.lowStock.length?<div className="fig-links">{s.data!.lowStock.map(p=><Link key={p.id} href="/admin/products"><span>{p.name}</span><strong>{p.stock}</strong></Link>)}</div>:<p className="muted">No active products are below the low-stock threshold.</p>}</div><div className="fig-panel"><h2>14-day sales</h2><div className="fig-chart">{s.data!.salesByDay.map(d=><span key={d.date} title={d.date+': '+formatRwf(d.totalRwf)} style={{height:Math.max(4,Math.round(d.totalRwf/maxDay*100))+'%'}}/>)}</div></div></section>;
}

function AdminFinance(){
 const s=useJson<Finance>('/api/admin/finance','/admin/login');
 if(s.loading&&!s.data)return <LoadingBlock/>;
 if(s.error)return <ErrorBlock error={s.error} retry={s.reload}/>;
 const x=s.data!.summary;
 return <section className="fig-panel-grid"><div className="fig-panel"><h2>Payment ledger</h2><div className="fig-metric-grid"><div><small>Paid</small><strong>{formatRwf(x.paidRwf)}</strong></div><div><small>Pending</small><strong>{formatRwf(x.pendingRwf)}</strong></div><div><small>Refunded</small><strong>{formatRwf(x.refundedRwf)}</strong></div></div></div><div className="fig-panel"><h2>Operations</h2><div className="fig-links"><Link href="/admin/orders">Orders <strong>{x.orders}</strong></Link><Link href="/admin/settings">Payment configuration <Icon name="arrowRight" size={16}/></Link></div><p className="alert alert-warn" style={{marginTop:16}}>MoMo, Airtel Money and card provider integration is not configured yet; recorded payments remain PENDING until an approved provider/webhook is connected.</p></div></section>;
}

function AdminCms(){
 const posts=useJson<{posts:ContentPost[]}>('/api/content?admin=true','/admin/login');
 const [title,setTitle]=useState(''); const [slug,setSlug]=useState(''); const [body,setBody]=useState(''); const [saving,setSaving]=useState(false); const [message,setMessage]=useState('');
 async function create(){setSaving(true);setMessage('');try{await request('/api/content',{method:'POST',body:JSON.stringify({title,slug,body,status:'PUBLISHED'})});setTitle('');setSlug('');setBody('');setMessage('Published');posts.reload()}catch(e){setMessage(e instanceof Error?e.message:'Could not publish')}finally{setSaving(false)}}
 if(posts.loading&&!posts.data)return <LoadingBlock/>; if(posts.error)return <ErrorBlock error={posts.error} retry={posts.reload}/>;
 return <section className="fig-panel-grid"><div className="fig-panel"><h2>Publish article</h2><div className="stack"><input className="input" placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)}/><input className="input" placeholder="Slug" value={slug} onChange={e=>setSlug(e.target.value)}/><textarea className="textarea" placeholder="Article body" value={body} onChange={e=>setBody(e.target.value)}/><button className="btn btn-primary" disabled={saving||!title||!slug||!body} onClick={()=>void create()}>{saving?'Publishing…':'Publish'}</button>{message&&<p className="alert">{message}</p>}</div></div><div className="fig-panel"><h2>Content library</h2><div className="fig-links">{posts.data!.posts.map(p=><div key={p.id} className="row-between" style={{padding:'14px 0',borderBottom:'1px solid var(--fig-line)'}}><span><strong>{p.title}</strong><small className="muted" style={{display:'block'}}>{p.status} · {p.slug}</small></span><span className="badge">{p.status}</span></div>)}</div></div></section>;
}

function AdminSupport(){
 const s=useJson<{tickets:Ticket[]}>('/api/admin/support','/admin/login');
 async function change(id:string,status:string){try{await request('/api/admin/support',{method:'PATCH',body:JSON.stringify({id,status})});s.reload()}catch{}}
 if(s.loading&&!s.data)return <LoadingBlock/>; if(s.error)return <ErrorBlock error={s.error} retry={s.reload}/>;
 return <section className="fig-panel"><h2>{s.data!.tickets.length} support ticket{s.data!.tickets.length===1?'':'s'}</h2>{s.data!.tickets.length?<div className="table-wrap"><table className="table"><thead><tr><th>Subject</th><th>Customer</th><th>Priority</th><th>Status</th><th>Updated</th></tr></thead><tbody>{s.data!.tickets.map(t=><tr key={t.id}><td><strong>{t.subject}</strong><div className="muted tiny">{t.message.slice(0,100)}</div></td><td>{t.customer?.name||'Guest'}</td><td>{t.priority}</td><td><select className="select select-sm" value={t.status} onChange={e=>void change(t.id,e.target.value)}><option>OPEN</option><option>IN_PROGRESS</option><option>RESOLVED</option><option>CLOSED</option></select></td><td>{formatDate(t.updatedAt,true)}</td></tr>)}</tbody></table></div>:<div className="fig-empty"><Icon name="users" size={34}/><h3>No support tickets</h3><p>Customer requests will appear here when submitted.</p></div>}</section>;
}

export function FigmaMarketplacePage({kind,products=[]}:{kind:Kind;products?:ProductDTO[]}){
 return <main className="fig-page"><Hero kind={kind}/><div className="container fig-page-body"><section className="fig-feature-grid">{features.map(([icon,title,text])=><article className="fig-feature" key={title}><span><Icon name={icon} size={22}/></span><h3>{title}</h3><p>{text}</p></article>)}</section>
  {kind==='account'&&<AccountSection/>}
  {kind==='wishlist'&&<WishlistSection/>}
  {kind==='deals'&&<DealsSection products={products}/>}
  {kind==='trade'&&<section className="fig-process">{[['shield','Seller verification'],['receipt','Order record'],['truck','Delivery handoff'],['users','Support if needed']].map(([icon,title],i)=><div key={title}><span className="fig-step"><Icon name={icon as IconName} size={21}/></span><small>0{i+1}</small><h3>{title}</h3><p>Use approved sellers, keep the order number, track the handoff, and contact support if anything goes wrong.</p></div>)}</section>}
  {kind==='compare'&&<CompareSection products={products}/>}
  {kind==='reviews'&&<ReviewsSection products={products}/>}
  {kind==='shipping'&&<ShippingSection/>}
  {kind==='blog'&&<BlogSection/>}
  {kind==='analytics'&&<AdminAnalytics/>}
  {kind==='finance'&&<AdminFinance/>}
  {kind==='cms'&&<AdminCms/>}
  {kind==='support'&&<AdminSupport/>}
 </div></main>;
}
