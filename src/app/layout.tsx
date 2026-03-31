import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import { I18nProvider } from '@/lib/i18n-context';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BrainAxis — Free Brain DICOM AC-PC Alignment Tool',
  description: 'Align brain DICOM images to AC-PC in your browser. Free, fast, private. No install required. Upload brain MRI, mark AC-PC landmarks, auto-align, and export. 뇌 DICOM AC-PC 정렬 도구.',
  keywords: 'free brain DICOM viewer, AC-PC alignment tool online, brain image rotation web app, DICOM viewer no install, brain MRI alignment tool, 뇌 DICOM 뷰어, AC-PC 정렬 도구, 무료 DICOM 뷰어, 脳 DICOM ビューア, AC-PC アライメント, 脑 DICOM 查看器',
  icons: {
    icon: '/favicon.svg',
    apple: '/favicon.svg',
  },
  alternates: {
    canonical: 'https://brainaxis.vercel.app',
  },
  openGraph: {
    title: 'BrainAxis — Free Brain DICOM AC-PC Alignment Tool',
    description: 'Align brain DICOM images to AC-PC in your browser. Free, fast, private. No install required.',
    url: 'https://brainaxis.vercel.app',
    siteName: 'BrainAxis',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'BrainAxis — Free Brain DICOM AC-PC Alignment',
    description: 'Align brain DICOM images to AC-PC in your browser. Free, fast, private.',
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
    name: 'BrainAxis',
    applicationCategory: 'HealthApplication',
    operatingSystem: 'Web Browser',
    offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' },
    description: 'Free web-based brain DICOM AC-PC alignment tool. No install required.',
    url: 'https://brainaxis.vercel.app',
    applicationSubCategory: 'Medical Imaging',
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
      </body>
    </html>
  );
}
