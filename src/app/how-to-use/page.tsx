import type { Metadata } from 'next';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { siteUrl, OG_IMAGE } from '@/lib/site-config';

export const metadata: Metadata = {
  title: 'How to Use BodyAtlas — Free Anatomy Atlas Guide & FAQ',
  description:
    'Learn how to use BodyAtlas, the free interactive cross-sectional anatomy atlas. Step-by-step guide, tips, and frequently asked questions for medical students and professionals.',
  keywords:
    'how to use BodyAtlas, anatomy atlas tutorial, free anatomy atlas guide, cross-sectional anatomy help, medical student anatomy tool, CT MRI viewer guide, IMAIOS alternative tutorial',
  alternates: { canonical: siteUrl('/how-to-use') },
  openGraph: {
    title: 'How to Use BodyAtlas — Guide & FAQ',
    description:
      'Step-by-step guide to using BodyAtlas free anatomy atlas. Tips, keyboard shortcuts, and answers to common questions.',
    url: siteUrl('/how-to-use'),
    siteName: 'BodyAtlas',
    type: 'website',
    images: [
      {
        url: OG_IMAGE,
        width: 1200,
        height: 630,
        alt: 'BodyAtlas — How to Use Guide',
      },
    ],
  },
};

const steps = [
  {
    num: 1,
    title: 'Choose a Body Region',
    desc: `When you open BodyAtlas, you'll see region tabs at the top: Head/Neck, Chest, Abdomen, Pelvis, and Brain MRI. Click on any region to load its cross-sectional anatomy dataset. Each region contains real CT or MRI imaging data with professionally labeled anatomical structures. No account creation or login is required — just click and start exploring.`,
  },
  {
    num: 2,
    title: 'Navigate Through Slices',
    desc: `Use the slice slider at the bottom of the viewer to scroll through cross-sectional images. You can also use your mouse scroll wheel or keyboard arrow keys (Up/Down or Left/Right) for precise navigation. Switch between three anatomical planes — Axial, Sagittal, and Coronal — using the plane tabs above the viewer. Each plane provides a different perspective of the same anatomy.`,
  },
  {
    num: 3,
    title: 'Search and Identify Structures',
    desc: `Use the search panel to find specific anatomical structures by name. Type any structure (e.g., "aorta," "hippocampus," "liver") and click on it to instantly jump to the best slice showing that structure, with it highlighted on the image. You can also hover directly over the image to see structure names appear as tooltips. Toggle the "Labels" button to show or hide color-coded overlays.`,
  },
];

const tips = [
  {
    title: 'Install for Offline Access',
    desc: 'BodyAtlas is a Progressive Web App (PWA). Click the install prompt or use your browser\'s "Add to Home Screen" option to install it. Once installed, you can study anatomy even without an internet connection — perfect for exam prep on the go.',
  },
  {
    title: 'Use Keyboard Shortcuts',
    desc: 'Navigate slices faster with arrow keys. Press Escape to deselect a highlighted structure. Scroll wheel on the viewer area also moves through slices smoothly.',
  },
  {
    title: 'Multi-Language Support',
    desc: 'BodyAtlas supports 7 languages: English, Korean, Japanese, Chinese, Spanish, German, and French. The interface and structure labels are fully translated to help you study anatomy in your preferred language.',
  },
];

const faqs = [
  {
    q: 'Is BodyAtlas really 100% free?',
    a: 'Yes, BodyAtlas is completely free and always will be. There are no hidden fees, no premium tiers, and no credit card required. Unlike IMAIOS e-Anatomy which costs $22/month ($264/year), BodyAtlas provides interactive cross-sectional anatomy viewing at absolutely zero cost. We believe anatomical education should be accessible to everyone, regardless of their financial situation.',
  },
  {
    q: 'How is BodyAtlas different from IMAIOS e-Anatomy?',
    a: 'BodyAtlas is a free alternative to IMAIOS e-Anatomy that offers many similar core features: interactive cross-sectional CT and MRI viewing, labeled anatomical structures, structure search, and multi-plane navigation. Key advantages of BodyAtlas include: completely free access ($0 vs $22/month), no account required, offline support via PWA, and support for 7 languages. BodyAtlas is ideal for medical students and learners who need a high-quality anatomy reference without the subscription cost.',
  },
  {
    q: 'Can I use BodyAtlas offline?',
    a: 'Yes! BodyAtlas is built as a Progressive Web App (PWA), which means you can install it on your device and use it without an internet connection. On mobile, tap the "Install" or "Add to Home Screen" prompt. On desktop, look for the install icon in your browser\'s address bar. Once installed, previously viewed anatomy data is cached locally for offline access.',
  },
  {
    q: 'What body regions are available?',
    a: 'BodyAtlas currently covers five major regions: Head/Neck CT (512×512 resolution, 312 axial slices), Chest CT (431 slices), Abdomen CT, Pelvis CT, and Brain MRI (T1-weighted, 189 slices). Each region includes professionally labeled anatomical structures organized by categories such as organs, vessels, muscles, bones, and nerves. We are continuously adding new regions and improving existing labels.',
  },
  {
    q: 'Who is BodyAtlas designed for?',
    a: 'BodyAtlas is designed for anyone who needs to study cross-sectional anatomy: medical students learning anatomy and radiology, radiology residents preparing for board exams, anatomy professors creating teaching materials, physical therapists and nurses expanding their anatomical knowledge, and curious learners interested in human anatomy. The interface is intuitive enough for beginners while detailed enough for advanced learners.',
  },
  {
    q: 'Are the anatomical labels accurate?',
    a: 'The anatomical structures in BodyAtlas are segmented using state-of-the-art AI models (TotalSegmentator for CT data, FreeSurfer for brain MRI) and reviewed for educational accuracy. However, BodyAtlas is strictly an educational reference tool and should NOT be used for clinical diagnosis or treatment planning. Some structures may have minor segmentation inaccuracies, and we continuously work to improve label quality.',
  },
  {
    q: 'What languages does BodyAtlas support?',
    a: 'BodyAtlas supports 7 languages: English, Korean (한국어), Japanese (日本語), Chinese (中文), Spanish (Español), German (Deutsch), and French (Français). Both the user interface and anatomical structure names are fully translated. You can switch languages using the language selector in the app.',
  },
  {
    q: 'Can I use BodyAtlas on my phone or tablet?',
    a: 'Absolutely! BodyAtlas is fully responsive and optimized for mobile devices, tablets, and desktops. On mobile, use swipe gestures or the slider to navigate slices. The touch-friendly interface makes it easy to explore anatomy on any screen size. For the best experience on mobile, we recommend installing the PWA for faster loading and offline access.',
  },
  {
    q: 'How do I report a bug or suggest a feature?',
    a: 'We love hearing from our users! Click the chat bubble icon (💬) in the bottom-right corner of any page to open the feedback form. You can describe the bug or feature request and optionally include your email for follow-up. You can also email us directly at taeshinkim11@gmail.com. Every piece of feedback helps us make BodyAtlas better for the community.',
  },
  {
    q: 'Is my data safe on BodyAtlas?',
    a: 'Yes. BodyAtlas does not require you to create an account or provide any personal information. We do not collect, store, or process any medical or health data. The only data we collect is standard web analytics (page views, device type) to improve the service, and optional feedback you voluntarily submit. For full details, please read our Privacy Policy.',
  },
];

export default function HowToUsePage() {
  const faqJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: faqs.map((f) => ({
      '@type': 'Question',
      name: f.q,
      acceptedAnswer: { '@type': 'Answer', text: f.a },
    })),
  };

  const howToJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: 'How to Use BodyAtlas Free Anatomy Atlas',
    description: 'Learn how to use the free interactive cross-sectional anatomy atlas to study CT and MRI anatomy.',
    step: steps.map((s) => ({
      '@type': 'HowToStep',
      name: s.title,
      text: s.desc,
    })),
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }} />
      <Header />
      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-indigo-50/80 to-transparent border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 sm:py-14">
            <h1 className="text-3xl sm:text-4xl font-bold text-slate-900 tracking-tight">
              How to Use BodyAtlas
            </h1>
            <p className="mt-2 text-lg text-slate-600 leading-relaxed">
              A complete guide to using the free interactive cross-sectional anatomy atlas.
              Get started in seconds — no account needed.
            </p>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-10 space-y-14">
          {/* 3-Step Guide */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Get Started in 3 Simple Steps
            </h2>
            <div className="space-y-6">
              {steps.map((step) => (
                <div key={step.num} className="flex gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-500 text-white flex items-center justify-center text-lg font-bold shadow-sm">
                    {step.num}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-slate-800">{step.title}</h3>
                    <p className="mt-1 text-slate-600 leading-relaxed">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Pro Tips */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">Pro Tips</h2>
            <div className="grid gap-4 sm:grid-cols-3">
              {tips.map((tip, i) => (
                <div
                  key={i}
                  className="rounded-xl border border-slate-200 bg-white p-5 space-y-2"
                >
                  <h3 className="font-semibold text-slate-800">{tip.title}</h3>
                  <p className="text-sm text-slate-500 leading-relaxed">{tip.desc}</p>
                </div>
              ))}
            </div>
          </section>

          {/* FAQ */}
          <section>
            <h2 className="text-2xl font-bold text-slate-900 mb-6">
              Frequently Asked Questions
            </h2>
            <div className="space-y-3">
              {faqs.map((faq, i) => (
                <details
                  key={i}
                  className="group rounded-xl border border-slate-200 bg-white overflow-hidden"
                >
                  <summary className="px-5 py-4 cursor-pointer font-medium text-slate-800 hover:bg-slate-50 transition-colors flex items-center justify-between">
                    {faq.q}
                    <span className="ml-2 text-slate-400 group-open:rotate-45 transition-transform text-lg">+</span>
                  </summary>
                  <p className="px-5 pb-4 text-sm text-slate-600 leading-relaxed">{faq.a}</p>
                </details>
              ))}
            </div>
          </section>

          {/* CTA */}
          <section className="text-center py-6">
            <h2 className="text-xl font-bold text-slate-900 mb-3">
              Ready to Explore Anatomy?
            </h2>
            <p className="text-slate-500 mb-5">
              No signup, no payment, no installation. Open BodyAtlas and start learning now.
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
