import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Gwizineza Market | Shop Online in Rwanda',
  description: 'A modern Rwanda-focused online marketplace for ordering goods and receiving receipts by WhatsApp.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
