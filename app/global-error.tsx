'use client';

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ fontFamily: 'system-ui, sans-serif', background: '#f5f0e6', color: '#0e1c17', display: 'grid', placeItems: 'center', minHeight: '100vh', margin: 0 }}>
        <div style={{ textAlign: 'center', padding: 24 }}>
          <h1>Gwizineza Market</h1>
          <p>Something went wrong while loading the site. Please try again.</p>
          <button onClick={reset} style={{ marginTop: 16, padding: '12px 20px', borderRadius: 999, border: 0, background: '#14704c', color: '#fff', fontWeight: 700 }}>Try again</button>
        </div>
      </body>
    </html>
  );
}
