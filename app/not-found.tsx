import Link from 'next/link';

export default function RootNotFound() {
  return (
    <main className="container section" style={{ textAlign: 'center' }}>
      <p className="eyebrow no-rule">404</p>
      <h1 style={{ fontSize: 'var(--fs-3xl)', margin: '12px 0' }}>Page not found</h1>
      <p className="muted">The link may be broken or the page was moved.</p>
      <p style={{ marginTop: 24 }}><Link href="/" className="btn btn-primary">Back to Gwizineza Market</Link></p>
    </main>
  );
}
