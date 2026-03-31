import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'BrainAxis — Free Brain DICOM AC-PC Alignment Tool',
  description: 'Align brain DICOM images to AC-PC in your browser. Free, fast, private. No install required. Upload brain MRI, mark AC-PC landmarks, auto-align, and export.',
  keywords: 'free brain DICOM viewer, AC-PC alignment tool online, brain image rotation web app, DICOM viewer no install, brain MRI alignment tool',
  openGraph: {
    title: 'BrainAxis — Free Brain DICOM AC-PC Alignment Tool',
    description: 'Align brain DICOM images to AC-PC in your browser. Free, fast, private.',
    url: 'https://brainaxis.vercel.app',
    siteName: 'BrainAxis',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
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
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
