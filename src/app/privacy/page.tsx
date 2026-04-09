import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';

export const metadata: Metadata = {
  title: 'Privacy Policy — BodyAtlas Free Anatomy Atlas',
  description:
    'BodyAtlas privacy policy. Learn how we handle your data, cookies, and third-party services on our free interactive anatomy atlas.',
  keywords:
    'BodyAtlas privacy policy, anatomy atlas privacy, free medical tool privacy, data protection',
  alternates: { canonical: 'https://bodyatlas-ten.vercel.app/privacy' },
  openGraph: {
    title: 'Privacy Policy — BodyAtlas',
    description: 'How BodyAtlas handles your data and privacy.',
    url: 'https://bodyatlas-ten.vercel.app/privacy',
    siteName: 'BodyAtlas',
    type: 'website',
  },
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />
      <main className="flex-1">
        <section className="bg-gradient-to-b from-indigo-50/80 to-transparent border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              Privacy Policy
            </h1>
            <p className="mt-2 text-sm text-slate-500">Last updated: April 9, 2026</p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 prose prose-slate prose-headings:text-slate-900 prose-p:text-slate-600 prose-li:text-slate-600 prose-a:text-indigo-600 max-w-none">
          <h2>1. Introduction</h2>
          <p>
            Welcome to <strong>BodyAtlas</strong> (&quot;we,&quot; &quot;our,&quot; or &quot;us&quot;). BodyAtlas is a free interactive
            cross-sectional anatomy atlas available at{' '}
            <Link href="/">bodyatlas-ten.vercel.app</Link>. We are committed to protecting your
            privacy and being transparent about how we collect, use, and share information when you
            use our website and services (collectively, the &quot;Service&quot;).
          </p>
          <p>
            This Privacy Policy explains what information we collect, how we use it, and what choices
            you have. By using BodyAtlas, you agree to the collection and use of information in
            accordance with this policy.
          </p>

          <h2>2. Information We Collect</h2>

          <h3>2.1 Information You Provide Voluntarily</h3>
          <p>
            BodyAtlas does not require you to create an account or provide any personal information
            to use the core anatomy viewing features. However, if you choose to use our feedback
            form, you may voluntarily provide:
          </p>
          <ul>
            <li>Your email address (optional, for follow-up communication)</li>
            <li>Feedback messages or suggestions you submit</li>
          </ul>

          <h3>2.2 Information Collected Automatically</h3>
          <p>
            When you visit BodyAtlas, certain information is collected automatically by our hosting
            provider and third-party analytics services:
          </p>
          <ul>
            <li>
              <strong>Usage data:</strong> Pages viewed, features used, time spent on the site,
              referring URLs, and navigation patterns
            </li>
            <li>
              <strong>Device information:</strong> Browser type, operating system, screen resolution,
              and device type (desktop, tablet, mobile)
            </li>
            <li>
              <strong>IP address:</strong> Collected by our hosting provider (Vercel) and analytics
              services for security and analytics purposes
            </li>
            <li>
              <strong>Cookies and similar technologies:</strong> See Section 4 below for details
            </li>
          </ul>

          <h3>2.3 Information We Do NOT Collect</h3>
          <p>
            BodyAtlas does not collect, store, or process any medical data, health records, patient
            information, or diagnostic data. The anatomical images displayed are educational
            reference materials derived from publicly available medical imaging datasets. We do not
            collect payment information, as BodyAtlas is entirely free.
          </p>

          <h2>3. How We Use Your Information</h2>
          <p>We use the information we collect for the following purposes:</p>
          <ul>
            <li>
              <strong>Providing the Service:</strong> To deliver, maintain, and improve the BodyAtlas
              anatomy viewing experience
            </li>
            <li>
              <strong>Analytics:</strong> To understand how users interact with BodyAtlas so we can
              improve features, performance, and user experience
            </li>
            <li>
              <strong>Communication:</strong> To respond to feedback or inquiries you submit through
              our feedback form
            </li>
            <li>
              <strong>Security:</strong> To detect and prevent fraud, abuse, or security incidents
            </li>
            <li>
              <strong>Advertising:</strong> To display relevant advertisements through Google AdSense
              (see Section 4)
            </li>
          </ul>

          <h2>4. Cookies and Third-Party Services</h2>

          <h3>4.1 Google AdSense</h3>
          <p>
            BodyAtlas uses Google AdSense to display advertisements. Google AdSense may use cookies
            and web beacons to serve ads based on your prior visits to BodyAtlas or other websites.
            Google&apos;s use of advertising cookies enables it and its partners to serve ads based on
            your visit to BodyAtlas and/or other sites on the Internet.
          </p>
          <p>
            You may opt out of personalized advertising by visiting{' '}
            <a href="https://www.google.com/settings/ads" target="_blank" rel="noopener noreferrer">
              Google Ads Settings
            </a>
            . Alternatively, you can opt out of third-party vendor cookies by visiting{' '}
            <a href="https://www.aboutads.info/choices/" target="_blank" rel="noopener noreferrer">
              aboutads.info
            </a>
            .
          </p>

          <h3>4.2 Google Analytics</h3>
          <p>
            We use Google Analytics to collect anonymized usage statistics. Google Analytics uses
            cookies to track user interactions. The information generated is transmitted to and
            stored by Google. We use this data to understand usage patterns and improve the Service.
            You can opt out of Google Analytics by installing the{' '}
            <a
              href="https://tools.google.com/dlpage/gaoptout"
              target="_blank"
              rel="noopener noreferrer"
            >
              Google Analytics Opt-out Browser Add-on
            </a>
            .
          </p>

          <h3>4.3 Vercel (Hosting)</h3>
          <p>
            BodyAtlas is hosted on Vercel. Vercel may collect server logs including IP addresses,
            request timestamps, and page URLs for security and performance monitoring purposes.
            Please refer to{' '}
            <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              Vercel&apos;s Privacy Policy
            </a>{' '}
            for more information.
          </p>

          <h3>4.4 Formspree (Feedback Forms)</h3>
          <p>
            If you submit feedback through our feedback form, your message and optional email address
            are processed through Formspree. Please refer to{' '}
            <a href="https://formspree.io/legal/privacy-policy" target="_blank" rel="noopener noreferrer">
              Formspree&apos;s Privacy Policy
            </a>{' '}
            for information on how they handle data.
          </p>

          <h2>5. Data Retention</h2>
          <p>
            We retain automatically collected analytics data for up to 26 months, in accordance with
            Google Analytics default retention settings. Feedback submissions are retained
            indefinitely for product improvement purposes unless you request deletion.
          </p>

          <h2>6. Data Sharing</h2>
          <p>
            We do not sell, rent, or trade your personal information. We may share data with the
            following categories of third parties:
          </p>
          <ul>
            <li>
              <strong>Service providers:</strong> Google (Analytics, AdSense), Vercel (hosting),
              Formspree (feedback forms) — only as necessary to operate the Service
            </li>
            <li>
              <strong>Legal requirements:</strong> If required by law, regulation, or legal process
            </li>
          </ul>

          <h2>7. Your Rights</h2>
          <p>Depending on your jurisdiction, you may have the following rights:</p>
          <ul>
            <li>
              <strong>Access:</strong> Request a copy of the personal data we hold about you
            </li>
            <li>
              <strong>Correction:</strong> Request correction of inaccurate personal data
            </li>
            <li>
              <strong>Deletion:</strong> Request deletion of your personal data
            </li>
            <li>
              <strong>Opt-out:</strong> Opt out of personalized advertising and analytics tracking
              using the methods described in Section 4
            </li>
          </ul>
          <p>
            To exercise any of these rights, please contact us at{' '}
            <a href="mailto:taeshinkim11@gmail.com">taeshinkim11@gmail.com</a>.
          </p>

          <h2>8. Children&apos;s Privacy</h2>
          <p>
            BodyAtlas is an educational tool intended for medical students and professionals. We do
            not knowingly collect personal information from children under 13. If you believe we
            have inadvertently collected information from a child under 13, please contact us and we
            will promptly delete it.
          </p>

          <h2>9. International Data Transfers</h2>
          <p>
            BodyAtlas is hosted on Vercel&apos;s global edge network. By using the Service, you
            acknowledge that your information may be transferred to and processed in countries
            other than your own. We ensure that appropriate safeguards are in place to protect
            your data in accordance with this Privacy Policy.
          </p>

          <h2>10. Changes to This Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of any changes
            by posting the new Privacy Policy on this page and updating the &quot;Last updated&quot; date. We
            encourage you to review this Privacy Policy periodically for any changes.
          </p>

          <h2>11. Contact Us</h2>
          <p>
            If you have any questions about this Privacy Policy or our data practices, please
            contact us:
          </p>
          <ul>
            <li>
              <strong>Email:</strong>{' '}
              <a href="mailto:taeshinkim11@gmail.com">taeshinkim11@gmail.com</a>
            </li>
            <li>
              <strong>Website:</strong>{' '}
              <Link href="/">bodyatlas-ten.vercel.app</Link>
            </li>
          </ul>
        </div>
      </main>
      <Footer />
    </div>
  );
}
