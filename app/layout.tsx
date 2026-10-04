import type { Metadata, Viewport } from 'next';
import { Inter, Outfit } from 'next/font/google';
import '@/styles/base.css';
import '@/styles/store.css';
import '@/styles/dashboard.css';
import '@/styles/figma.css';
import '@/styles/figma-marketplace.css';
import '@/styles/figma-console.css';
import '@/styles/figma-47-completion.css';

const display = Outfit({ subsets: ['latin'], variable: '--font-bricolage', display: 'swap' });
const body = Inter({ subsets: ['latin'], variable: '--font-manrope', display: 'swap' });

export const metadata: Metadata = {
  title: { default: 'Gwizineza Market · B2B Marketplace', template: '%s · Gwizineza Market' },
  description: 'Gwizineza Market connects trusted sellers and buyers from Kabarondo, Rwanda.',
  applicationName: 'Gwizineza Market',
  authors: [{ name: 'Mucyo Pacifique' }],
  creator: 'Mucyo Pacifique',
};

export const viewport: Viewport = { themeColor: '#0b1017', width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return <html lang="en" className={`${display.variable} ${body.variable}`}><body>{children}</body></html>;
}