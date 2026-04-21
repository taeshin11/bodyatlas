import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { siteUrl, SITE_HOST } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'Terms of Service — BodyAtlas Free Anatomy Atlas',
  description:
    'Terms of Service for BodyAtlas, a free interactive cross-sectional anatomy atlas. Read our usage terms, disclaimers, and acceptable use policy.',
  keywords:
    'BodyAtlas terms of service, anatomy atlas terms, free medical tool terms, usage policy',
  alternates: { canonical: siteUrl('/terms') },
  openGraph: {
    title: 'Terms of Service — BodyAtlas',
    description: 'Terms and conditions for using BodyAtlas free anatomy atlas.',
    url: siteUrl('/terms'),
    siteName: 'BodyAtlas',
    type: 'website',
  },
};

export default function TermsPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-indigo-50/80 to-transparent border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Terms of Service
            </h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: April 9, 2026</p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 prose prose-slate prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-indigo-600 max-w-none">
          <h2>1. Acceptance of Terms</h2>
          <p>
            By accessing or using <strong>BodyAtlas</strong> (&quot;the Service&quot;), available at{' '}
            <Link href="/">{SITE_HOST}</Link>, you agree to be bound by these Terms of
            Service (&quot;Terms&quot;). If you do not agree to these Terms, please do not use the Service.
          </p>
          <p>
            BodyAtlas is operated by SPINAI (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). We reserve the right to
            update or modify these Terms at any time without prior notice. Your continued use of the
            Service after any changes constitutes acceptance of the revised Terms.
          </p>

          <h2>2. Description of Service</h2>
          <p>
            BodyAtlas is a free, web-based interactive cross-sectional anatomy atlas designed for
            educational purposes. The Service provides:
          </p>
          <ul>
            <li>Interactive viewing of labeled CT and MRI cross-sectional anatomy images</li>
            <li>Anatomical structure search and identification tools</li>
            <li>Multi-plane viewing (axial, sagittal, coronal)</li>
            <li>Offline access through Progressive Web App (PWA) technology</li>
            <li>Multi-language support for anatomical terminology</li>
          </ul>
          <p>
            The Service is provided free of charge. We reserve the right to modify, suspend, or
            discontinue any part of the Service at any time without notice or liability.
          </p>

          <h2>3. Educational Use Only — Medical Disclaimer</h2>
          <p>
            <strong>
              BodyAtlas is strictly an educational and reference tool. It is NOT a medical device
              and is NOT intended for clinical diagnosis, treatment planning, or any form of
              patient care.
            </strong>
          </p>
          <ul>
            <li>
              The anatomical images and labels are derived from reference datasets and may contain
              inaccuracies or simplifications
            </li>
            <li>
              Do not use BodyAtlas as a substitute for professional medical advice, diagnosis, or
              treatment
            </li>
            <li>
              Always consult qualified healthcare professionals for medical decisions
            </li>
            <li>
              The anatomical structures shown represent generalized anatomy and may not reflect
              individual anatomical variation
            </li>
          </ul>

          <h2>4. Acceptable Use Policy</h2>
          <p>You agree to use BodyAtlas only for lawful purposes. You may NOT:</p>
          <ul>
            <li>Use the Service for clinical diagnosis or patient care decisions</li>
            <li>
              Attempt to reverse-engineer, decompile, or extract the underlying data, images, or
              source code
            </li>
            <li>
              Scrape, crawl, or use automated tools to mass-download images or data from the
              Service
            </li>
            <li>
              Redistribute, resell, or commercially exploit the content without prior written
              permission
            </li>
            <li>
              Interfere with or disrupt the Service, servers, or networks connected to the Service
            </li>
            <li>
              Upload or transmit viruses, malware, or any harmful code through the feedback system
            </li>
            <li>
              Impersonate any person or entity, or misrepresent your affiliation with any person
              or entity
            </li>
          </ul>

          <h2>5. Intellectual Property</h2>
          <p>
            The BodyAtlas name, logo, website design, user interface, and original educational
            content are the intellectual property of SPINAI. The anatomical imaging data used in
            BodyAtlas is derived from publicly available medical imaging datasets used under their
            respective licenses for educational purposes.
          </p>
          <p>
            You may use BodyAtlas for personal educational purposes, including taking screenshots
            for non-commercial academic work with proper attribution to BodyAtlas.
          </p>

          <h2>6. User-Submitted Content</h2>
          <p>
            When you submit feedback or suggestions through our feedback form, you grant us a
            non-exclusive, royalty-free, worldwide license to use, modify, and incorporate your
            feedback to improve the Service. We are not obligated to act on any feedback received.
          </p>

          <h2>7. Third-Party Services and Advertising</h2>
          <p>
            BodyAtlas may display advertisements provided by Google AdSense and use analytics
            services. These third-party services are governed by their own terms and privacy
            policies:
          </p>
          <ul>
            <li>
              <a href="https://policies.google.com/terms" target="_blank" rel="noopener noreferrer">
                Google Terms of Service
              </a>
            </li>
            <li>
              <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">
                Google Privacy Policy
              </a>
            </li>
          </ul>
          <p>
            We are not responsible for the content, privacy practices, or terms of any third-party
            services.
          </p>

          <h2>8. Disclaimer of Warranties</h2>
          <p>
            THE SERVICE IS PROVIDED &quot;AS IS&quot; AND &quot;AS AVAILABLE&quot; WITHOUT WARRANTIES OF ANY KIND,
            EITHER EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO IMPLIED WARRANTIES OF
            MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, ACCURACY, AND NON-INFRINGEMENT.
          </p>
          <p>We do not warrant that:</p>
          <ul>
            <li>The Service will be uninterrupted, error-free, or secure</li>
            <li>The anatomical labels and images are 100% accurate or complete</li>
            <li>The Service will meet your specific educational requirements</li>
            <li>Any errors in the Service will be corrected in a timely manner</li>
          </ul>

          <h2>9. Limitation of Liability</h2>
          <p>
            TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL SPINAI, ITS
            OFFICERS, DIRECTORS, EMPLOYEES, OR AGENTS BE LIABLE FOR ANY INDIRECT, INCIDENTAL,
            SPECIAL, CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO:
          </p>
          <ul>
            <li>Loss of profits, data, or goodwill</li>
            <li>Service interruption or computer damage</li>
            <li>
              Any damages resulting from reliance on anatomical information presented in the
              Service
            </li>
            <li>
              Any damages arising from unauthorized access to or alteration of your data
            </li>
          </ul>
          <p>
            OUR TOTAL LIABILITY FOR ALL CLAIMS RELATED TO THE SERVICE SHALL NOT EXCEED THE AMOUNT
            YOU PAID TO USE THE SERVICE (WHICH IS $0, AS BODYATLAS IS FREE).
          </p>

          <h2>10. Indemnification</h2>
          <p>
            You agree to indemnify and hold harmless SPINAI and its affiliates from any claims,
            damages, losses, or expenses (including reasonable attorney&apos;s fees) arising from your
            use of the Service, your violation of these Terms, or your violation of any rights of
            a third party.
          </p>

          <h2>11. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the
            Republic of Korea, without regard to its conflict of law provisions. Any disputes
            arising from these Terms or the Service shall be subject to the exclusive jurisdiction
            of the courts of the Republic of Korea.
          </p>

          <h2>12. Severability</h2>
          <p>
            If any provision of these Terms is found to be unenforceable or invalid, that provision
            shall be limited or eliminated to the minimum extent necessary so that the remaining
            provisions of these Terms shall remain in full force and effect.
          </p>

          <h2>13. Contact Us</h2>
          <p>
            If you have any questions about these Terms of Service, please contact us:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:taeshinkim11@gmail.com">taeshinkim11@gmail.com</a>
            </li>
            <li>
              <strong>Website:</strong>{' '}
              <Link href="/">{SITE_HOST}</Link>
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
