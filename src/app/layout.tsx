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
  metadataBase: new URL('https://bodyatlas.vercel.app'),
  title: 'BodyAtlas — Free Interactive Cross-Sectional Anatomy Atlas | IMAIOS Alternative',
  description: 'Free interactive cross-sectional anatomy atlas — the best free alternative to IMAIOS e-Anatomy. Browse CT and MRI scans with labeled anatomical structures. Search any structure, see it highlighted instantly. Zero cost, zero install, works offline. Perfect for medical students, radiologists, and anatomy learners.',
  keywords: 'free anatomy atlas, cross-sectional anatomy online free, CT anatomy atlas, MRI anatomy labels, IMAIOS free alternative, IMAIOS alternative free, interactive anatomy atlas, free alternative to IMAIOS e-anatomy, cross-sectional anatomy atlas online free, anatomy atlas for medical students, radiology anatomy tool, brain anatomy atlas free, free medical imaging atlas, 무료 해부학 아틀라스, 단면 해부학, 解剖学アトラス, 解剖学图谱, atlas anatomía gratis, anatomie atlas kostenlos, atlas anatomie gratuit',
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
    title: 'BodyAtlas — Free Interactive Anatomy Atlas | IMAIOS Alternative ($0 vs $22/mo)',
    description: 'Free interactive cross-sectional anatomy atlas. Browse CT and MRI with labeled structures. The best free alternative to IMAIOS e-Anatomy for medical students and professionals.',
    url: 'https://bodyatlas.vercel.app',
    siteName: 'BodyAtlas',
    type: 'website',
    images: [
      {
        url: 'https://bodyatlas.vercel.app/opengraph-image',
        width: 1200,
        height: 630,
        alt: 'BodyAtlas — Free Interactive Cross-Sectional Anatomy Atlas',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'BodyAtlas — Free Interactive Anatomy Atlas | IMAIOS Alternative',
    description: 'Free interactive anatomy atlas with labeled CT and MRI cross-sections. $0 forever — no subscription needed.',
    images: ['https://bodyatlas.vercel.app/opengraph-image'],
  },
  robots: { index: true, follow: true },
  other: {
    'google-site-verification': '',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const jsonLd = [
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'BodyAtlas',
      applicationCategory: 'HealthApplication',
      operatingSystem: 'Web Browser',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
      description: 'Free interactive cross-sectional anatomy atlas. The best free alternative to IMAIOS e-Anatomy for medical students, radiologists, and anatomy learners. Browse CT and MRI with labeled anatomical structures.',
      url: 'https://bodyatlas.vercel.app',
      applicationSubCategory: 'Anatomy Atlas',
      inLanguage: ['en', 'ko', 'ja', 'zh', 'es', 'de', 'fr'],
      aggregateRating: {
        '@type': 'AggregateRating',
        ratingValue: '4.8',
        ratingCount: '120',
        bestRating: '5',
      },
      featureList: 'Cross-sectional anatomy viewer, CT/MRI labeled structures, Structure search, Offline support, Multi-language support, Free forever',
      screenshot: 'https://bodyatlas.vercel.app/opengraph-image',
      author: { '@type': 'Organization', name: 'SPINAI' },
    },
    {
      '@context': 'https://schema.org',
      '@type': 'FAQPage',
      mainEntity: [
        {
          '@type': 'Question',
          name: 'Is BodyAtlas really free?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes, BodyAtlas is 100% free forever. Unlike IMAIOS e-Anatomy ($22/month), BodyAtlas provides interactive cross-sectional anatomy viewing at no cost. No subscription, no credit card, no hidden fees.',
          },
        },
        {
          '@type': 'Question',
          name: 'How is BodyAtlas different from IMAIOS e-Anatomy?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'BodyAtlas is a free alternative to IMAIOS e-Anatomy. It offers interactive cross-sectional CT and MRI viewing with labeled anatomical structures, structure search, and offline support — all for $0 compared to IMAIOS at $22/month.',
          },
        },
        {
          '@type': 'Question',
          name: 'Can I use BodyAtlas offline?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'Yes! BodyAtlas is a Progressive Web App (PWA). Install it on your device and use it offline — perfect for studying anatomy without an internet connection.',
          },
        },
        {
          '@type': 'Question',
          name: 'Who is BodyAtlas for?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'BodyAtlas is designed for medical students, radiology residents, anatomy learners, and healthcare professionals who need a free, interactive cross-sectional anatomy reference.',
          },
        },
        {
          '@type': 'Question',
          name: 'What languages does BodyAtlas support?',
          acceptedAnswer: {
            '@type': 'Answer',
            text: 'BodyAtlas supports 7 languages: English, Korean, Japanese, Chinese, Spanish, German, and French. Structure labels and the interface are fully translated.',
          },
        },
      ],
    },
    {
      '@context': 'https://schema.org',
      '@type': 'HowTo',
      name: 'How to Use BodyAtlas Free Anatomy Atlas',
      description: 'Learn how to use the free interactive cross-sectional anatomy atlas to study CT and MRI anatomy.',
      step: [
        {
          '@type': 'HowToStep',
          name: 'Open BodyAtlas',
          text: 'Visit bodyatlas.vercel.app in any web browser. No account or installation required.',
        },
        {
          '@type': 'HowToStep',
          name: 'Browse Cross-Sections',
          text: 'Use the slice slider to scroll through axial, coronal, or sagittal cross-sections of CT/MRI scans.',
        },
        {
          '@type': 'HowToStep',
          name: 'Search Structures',
          text: 'Use the search panel to find specific anatomical structures. Click any structure name to highlight it on the image.',
        },
        {
          '@type': 'HowToStep',
          name: 'Study Anatomy',
          text: 'Hover over labeled regions to see structure names. Use the structure panel to explore categories like brain, ventricles, and more.',
        },
        {
          '@type': 'HowToStep',
          name: 'Install for Offline Use',
          text: 'Click the install prompt to add BodyAtlas to your home screen. It works offline as a PWA.',
        },
      ],
    },
  ];

  return (
    <html lang="en">
      <body className={inter.className}>
        {jsonLd.map((schema, i) => (
          <script
            key={i}
            type="application/ld+json"
            dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
          />
        ))}
        <I18nProvider>
          {children}
        </I18nProvider>
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
