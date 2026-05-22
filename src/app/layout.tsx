import type { Metadata } from 'next';
import { Zilla_Slab, Libre_Franklin, JetBrains_Mono } from 'next/font/google';
import './globals.css';

const zillaSlab = Zilla_Slab({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-display',
  display: 'swap',
});

const libreFranklin = Libre_Franklin({
  subsets: ['latin', 'latin-ext'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-body',
  display: 'swap',
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-mono',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Invoice Extractor — Tai Huynh · Tai Huynh',
  description:
    'Upload an invoice or receipt — get clean structured data: vendor, line items, totals, tax. Export to CSV or JSON instantly.',
  openGraph: {
    title: 'Invoice Extractor',
    description: 'Upload an invoice or receipt — get clean structured data instantly.',
    siteName: 'Tai Huynh',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${zillaSlab.variable} ${libreFranklin.variable} ${jetbrainsMono.variable}`}
    >
      <body>{children}</body>
    </html>
  );
}
