import type { Metadata, Viewport } from 'next';
import { Inter } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n-context';
import './globals.css';
import ServiceWorkerRegister from '@/components/ServiceWorkerRegister';

const inter = Inter({ subsets: ['latin'] });

export const viewport: Viewport = {
  themeColor: '#6366F1',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
  viewportFit: 'cover',
};

export const metadata: Metadata = {
  title: 'BodyAtlas — Free Brain DICOM Free Interactive Anatomy Atlas',
  description: 'Free interactive cross-sectional anatomy atlas. Browse CT and MRI with labeled anatomical structures. Search any structure, see it highlighted. Zero install, works offline. 무료 해부학 아틀라스.',
  keywords: 'free anatomy atlas, cross-sectional anatomy online, CT anatomy atlas, MRI anatomy labels, IMAIOS free alternative, interactive anatomy, 무료 해부학 아틀라스, 단면 해부학, 解剖学アトラス, 解剖学图谱',
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.svg',
    apple: '/apple-touch-icon.png',
    other: [
      { rel: 'icon', url: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
      { rel: 'icon', url: '/icon-512x512.png', sizes: '512x512', type: 'image/png' },
    ],
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'BodyAtlas',
  },
  alternates: {
    canonical: 'https://bodyatlas.vercel.app',
  },
  openGraph: {
    title: 'BodyAtlas — Free Brain DICOM Free Interactive Anatomy Atlas',
    description: 'Free interactive cross-sectional anatomy atlas. Browse CT and MRI with labeled structures. No install required.',
    url: 'https://bodyatlas.vercel.app',
    siteName: 'BodyAtlas',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'BodyAtlas — Free Brain DICOM AC-PC Alignment',
    description: 'Free interactive anatomy atlas with labeled CT and MRI cross-sections.',
  },
  robots: { index: true, follow: true },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    name: 'BodyAtlas',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web Browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'Free interactive cross-sectional anatomy atlas for medical professionals.',
    url: 'https://bodyatlas.vercel.app',
    applicationSubCategory: 'Anatomy Atlas',
    inLanguage: ['en', 'ko', 'ja', 'zh', 'es', 'de', 'fr'],
  };

  return (
    <html lang="en">
      <body className={inter.className}>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <I18nProvider>
          {children}
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
