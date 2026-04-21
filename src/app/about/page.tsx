import type { Metadata } from 'next';
import AboutContent from './AboutContent';
import { siteUrl, OG_IMAGE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'About BodyAtlas — Free Alternative to IMAIOS e-Anatomy | Cross-Sectional Anatomy Atlas',
  description:
    'BodyAtlas is a free interactive cross-sectional anatomy atlas — the best free alternative to IMAIOS e-Anatomy ($0 vs $22/mo). Browse labeled CT and MRI scans online. Perfect for medical students, radiologists, and anatomy learners.',
  keywords:
    'free alternative to IMAIOS e-anatomy, cross-sectional anatomy atlas online free, free anatomy atlas, IMAIOS alternative, interactive anatomy atlas free, medical student anatomy tool, radiology anatomy atlas, free CT MRI anatomy viewer',
  alternates: {
    canonical: siteUrl('/about'),
  },
  openGraph: {
    title: 'About BodyAtlas — Free Alternative to IMAIOS e-Anatomy',
    description:
      'Free interactive cross-sectional anatomy atlas. $0 forever vs IMAIOS at $22/mo. Browse CT/MRI with labeled structures.',
    url: siteUrl('/about'),
    siteName: 'BodyAtlas',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'BodyAtlas — Free Cross-Sectional Anatomy Atlas',
      },
    ],
  },
};

export default function AboutPage() {
  return <AboutContent />;
}
