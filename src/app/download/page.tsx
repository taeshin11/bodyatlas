import type { Metadata } from 'next';
import DownloadContent from './DownloadContent';

export const metadata: Metadata = {
  title: 'Download BodyAtlas — Free Anatomy Atlas App for Desktop & Mobile',
  description:
    'Download BodyAtlas as a free desktop or mobile app. Install the PWA for offline access to interactive cross-sectional anatomy. Works on Windows, Mac, Android, iOS, and Chrome OS.',
  keywords:
    'download anatomy atlas app, free anatomy app desktop, offline anatomy atlas, PWA anatomy atlas, free medical app download',
  alternates: {
    canonical: 'https://bodyatlas-ten.vercel.app/download',
  },
  openGraph: {
    title: 'Download BodyAtlas — Free Anatomy Atlas App',
    description:
      'Install BodyAtlas as a free app on any device. Offline access, instant launch, zero cost.',
    url: 'https://bodyatlas-ten.vercel.app/download',
    siteName: 'BodyAtlas',
    type: 'website',
  },
};

export default function DownloadPage() {
  return <DownloadContent />;
}
