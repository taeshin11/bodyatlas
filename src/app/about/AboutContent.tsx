'use client';

import Link from 'next/link';
import { BookOpen, Check, ArrowRight } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

export default function AboutContent() {
  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-indigo-50/80 to-transparent border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <div className="flex items-center gap-3 mb-4">
              <BookOpen className="w-8 h-8 text-indigo-500" />
              <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
                About BodyAtlas
              </h1>
            </div>
            <p className="text-lg text-slate-600 leading-relaxed">
              <strong>BodyAtlas</strong> is a{' '}
              <strong>free interactive cross-sectional anatomy atlas</strong> built as the best{' '}
              <strong>free alternative to IMAIOS e-Anatomy</strong>. Browse labeled CT and MRI
              scans, search anatomical structures, and study cross-sectional anatomy &mdash; all
              for <strong>$0, forever</strong>.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-12">
          {/* Why BodyAtlas */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Why BodyAtlas? A Free Alternative to IMAIOS e-Anatomy
            </h2>
            <p className="text-slate-600 leading-relaxed mb-4">
              IMAIOS e-Anatomy is a widely used cross-sectional anatomy atlas, but it costs{' '}
              <strong>$22/month</strong> ($264/year). For medical students already burdened with
              tuition and textbook costs, that adds up fast. BodyAtlas was created to solve this
              problem: a <strong>completely free, no-account-needed</strong> anatomy atlas that
              runs in any web browser.
            </p>
            <p className="text-slate-600 leading-relaxed">
              Whether you are a first-year medical student learning neuroanatomy, a radiology
              resident studying cross-sectional imaging, or a healthcare professional brushing up
              on anatomy, BodyAtlas gives you the tools you need at zero cost.
            </p>
          </section>

          {/* Comparison Table */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              BodyAtlas vs IMAIOS e-Anatomy: Feature Comparison
            </h2>
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-50">
                    <th className="text-left px-4 py-3 font-semibold text-slate-700">Feature</th>
                    <th className="text-center px-4 py-3 font-semibold text-indigo-600">
                      BodyAtlas
                    </th>
                    <th className="text-center px-4 py-3 font-semibold text-slate-500">
                      IMAIOS e-Anatomy
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {[
                    ['Price', 'Free forever ($0)', '$22/month ($264/yr)'],
                    ['Account required', 'No', 'Yes'],
                    ['Cross-sectional CT/MRI', 'Yes', 'Yes'],
                    ['Labeled structures', 'Yes', 'Yes'],
                    ['Structure search', 'Yes', 'Yes'],
                    ['Offline support (PWA)', 'Yes', 'No'],
                    ['Multi-language (7 languages)', 'Yes', 'Limited'],
                    ['Works in browser', 'Yes', 'Yes'],
                    ['Mobile friendly', 'Yes', 'Yes'],
                    ['Open access', 'Yes', 'No (paywall)'],
                  ].map(([feature, body, imaios], i) => (
                    <tr key={i} className="hover:bg-slate-50/50">
                      <td className="px-4 py-2.5 text-slate-700">{feature}</td>
                      <td className="px-4 py-2.5 text-center text-indigo-600 font-medium">
                        {body}
                      </td>
                      <td className="px-4 py-2.5 text-center text-slate-500">{imaios}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>

          {/* Features */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Key Features of BodyAtlas Free Anatomy Atlas
            </h2>
            <ul className="space-y-3">
              {[
                'Interactive cross-sectional anatomy viewer with labeled CT and MRI scans',
                'Instant structure search — type any anatomical structure name and see it highlighted',
                'Axial, coronal, and sagittal planes for comprehensive anatomy study',
                'Progressive Web App (PWA) — install on any device and use offline',
                'Available in 7 languages: English, Korean, Japanese, Chinese, Spanish, German, French',
                'Zero cost, zero account, zero installation — open and start learning',
                'Mobile-responsive design for studying anatomy anywhere',
                'Built for medical students, radiology residents, and healthcare professionals',
              ].map((feature, i) => (
                <li key={i} className="flex items-start gap-3">
                  <Check className="w-5 h-5 text-green-500 mt-0.5 flex-shrink-0" />
                  <span className="text-slate-600">{feature}</span>
                </li>
              ))}
            </ul>
          </section>

          {/* How to Use */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              How to Use BodyAtlas Free Anatomy Atlas
            </h2>
            <ol className="space-y-4">
              {[
                {
                  title: 'Open BodyAtlas',
                  desc: 'Visit bodyatlas.vercel.app in any web browser. No account or download required.',
                },
                {
                  title: 'Browse Cross-Sections',
                  desc: 'Use the slice slider to scroll through axial, coronal, or sagittal cross-sections of CT and MRI scans.',
                },
                {
                  title: 'Search Anatomical Structures',
                  desc: 'Use the structure search panel to find specific structures. Click any structure name to highlight it on the image.',
                },
                {
                  title: 'Study and Learn',
                  desc: 'Hover over labeled regions to see structure names. Explore categories like brain regions, ventricles, white matter tracts, and more.',
                },
                {
                  title: 'Install for Offline Use',
                  desc: 'Click the install prompt to add BodyAtlas to your home screen. Study anatomy anywhere, even without internet.',
                },
              ].map((step, i) => (
                <li key={i} className="flex gap-4">
                  <span className="flex-shrink-0 w-7 h-7 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-sm font-bold">
                    {i + 1}
                  </span>
                  <div>
                    <h3 className="font-semibold text-slate-800">{step.title}</h3>
                    <p className="text-slate-500 text-sm mt-0.5">{step.desc}</p>
                  </div>
                </li>
              ))}
            </ol>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">
              Frequently Asked Questions
            </h2>
            <div className="space-y-4">
              {[
                {
                  q: 'Is BodyAtlas really free?',
                  a: 'Yes, BodyAtlas is 100% free forever. Unlike IMAIOS e-Anatomy ($22/month), BodyAtlas provides interactive cross-sectional anatomy viewing at no cost. No subscription, no credit card, no hidden fees.',
                },
                {
                  q: 'How is BodyAtlas different from IMAIOS e-Anatomy?',
                  a: 'BodyAtlas is a free alternative to IMAIOS e-Anatomy. It offers interactive cross-sectional CT and MRI viewing with labeled anatomical structures, structure search, and offline support — all for $0 compared to IMAIOS at $22/month.',
                },
                {
                  q: 'Can I use BodyAtlas offline?',
                  a: 'Yes! BodyAtlas is a Progressive Web App (PWA). Install it on your device and use it offline — perfect for studying anatomy without an internet connection.',
                },
                {
                  q: 'Who is BodyAtlas for?',
                  a: 'BodyAtlas is designed for medical students, radiology residents, anatomy learners, and healthcare professionals who need a free, interactive cross-sectional anatomy reference.',
                },
                {
                  q: 'What languages does BodyAtlas support?',
                  a: 'BodyAtlas supports 7 languages: English, Korean, Japanese, Chinese, Spanish, German, and French. Structure labels and the interface are fully translated.',
                },
              ].map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <summary className="px-4 py-3 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 transition-colors">
                    {faq.q}
                  </summary>
                  <p className="px-4 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* Internal Links */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Learn More</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              <Link href="/how-to-use" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
                <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">How to Use BodyAtlas</div>
                  <div className="text-xs text-slate-500">Step-by-step guide & FAQ</div>
                </div>
              </Link>
              <Link href="/privacy" className="flex items-center gap-3 p-4 rounded-xl border border-slate-200 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 transition-all group">
                <ArrowRight className="w-5 h-5 text-indigo-400 group-hover:text-indigo-600" />
                <div>
                  <div className="font-semibold text-slate-800 text-sm">Privacy Policy</div>
                  <div className="text-xs text-slate-500">How we handle your data</div>
                </div>
              </Link>
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-6">
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Start Exploring Free Cross-Sectional Anatomy
            </h2>
            <p className="text-slate-500 mb-5">
              No signup needed. Open BodyAtlas and start learning anatomy now.
            </p>
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-6 py-3 bg-indigo-500 text-white rounded-xl font-medium hover:bg-indigo-600 transition-colors"
            >
              Open BodyAtlas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </section>
        </div>
      </main>

      <Footer />
    </div>
  );
}
