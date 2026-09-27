import type { Metadata, Viewport } from 'next';
import { Bricolage_Grotesque, Manrope } from 'next/font/google';
import '@/styles/base.css';
import '@/styles/store.css';
import '@/styles/dashboard.css';

const display = Bricolage_Grotesque({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' });
const body = Manrope({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Gwizineza Market · Everyday goods from trusted local sellers', template: '%s · Gwizineza Market' },
  description: 'Gwizineza Market is a modern marketplace from Kabarondo, Rwanda. Browse products from approved local sellers, order online and get a clear order confirmation you can share on WhatsApp.',
  applicationName: 'Gwizineza Market',
  authors: [{ name: 'Mucyo Pacifique' }],
  creator: 'Mucyo Pacifique',
};

export const viewport: Viewport = { themeColor: '#0e1c17', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>{children}</body>
    </html>
  );
}
