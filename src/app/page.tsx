'use client';

import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FeedbackButton from '@/components/FeedbackButton';
import InstallPrompt from '@/components/InstallPrompt';
import ErrorBoundary from '@/components/ErrorBoundary';
import { useI18n } from '@/lib/i18n-context';
import { Search, Layers, Globe, Smartphone } from 'lucide-react';

export default function Home() {
  const { t } = useI18n();

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <Header />

        <main className="flex-1">
          {/* Hero Section */}
          <section className="max-w-4xl mx-auto px-4 sm:px-6 py-16 sm:py-24 text-center">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-medium mb-6">
                100% Free — No subscription required
              </div>
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold text-slate-900 tracking-tight leading-tight">
                Interactive Anatomy Atlas
                <br />
                <span className="text-indigo-500">for Medical Professionals</span>
              </h1>
              <p className="mt-6 text-lg sm:text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed">
                Browse cross-sectional CT &amp; MRI anatomy with interactive labels.
                Search any structure, see it highlighted. Free forever.
              </p>
              <div className="mt-8 flex flex-col sm:flex-row gap-3 justify-center">
                <button
                  disabled
                  className="px-8 py-3 rounded-xl text-base font-semibold bg-indigo-500 text-white shadow-lg shadow-indigo-200 opacity-60 cursor-not-allowed"
                >
                  Coming Soon — Atlas Viewer
                </button>
              </div>
            </motion.div>

            {/* Feature cards */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
              className="mt-16 grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
            >
              {[
                { icon: Search, title: 'Search Anatomy', desc: 'Find any structure by name — jump to the exact slice' },
                { icon: Layers, title: '3-Plane View', desc: 'Axial, Sagittal, Coronal with synchronized crosshair' },
                { icon: Globe, title: '7 Languages', desc: 'EN, KO, JA, ZH, ES, DE, FR — anatomy in your language' },
                { icon: Smartphone, title: 'Install as App', desc: 'PWA — add to home screen, works offline' },
              ].map(({ icon: Icon, title, desc }) => (
                <div key={title} className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-5 text-left">
                  <Icon className="w-8 h-8 text-indigo-500 mb-3" />
                  <h3 className="text-sm font-semibold text-slate-800">{title}</h3>
                  <p className="text-xs text-slate-500 mt-1">{desc}</p>
                </div>
              ))}
            </motion.div>

            {/* Comparison */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
              className="mt-16 bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl p-6 sm:p-8"
            >
              <h2 className="text-xl font-bold text-slate-800 mb-4">Why BodyAtlas?</h2>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-200">
                      <th className="text-left py-2 px-3 text-slate-500 font-medium">Feature</th>
                      <th className="text-center py-2 px-3 text-slate-500 font-medium">IMAIOS</th>
                      <th className="text-center py-2 px-3 text-indigo-600 font-semibold">BodyAtlas</th>
                    </tr>
                  </thead>
                  <tbody className="text-slate-700">
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-3">Price</td>
                      <td className="text-center py-2 px-3 text-red-500 font-medium">$22/mo</td>
                      <td className="text-center py-2 px-3 text-emerald-600 font-bold">Free</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-3">Interactive Labels</td>
                      <td className="text-center py-2 px-3">Yes</td>
                      <td className="text-center py-2 px-3 font-medium">Yes</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-3">Structure Search</td>
                      <td className="text-center py-2 px-3">Yes</td>
                      <td className="text-center py-2 px-3 font-medium">Yes</td>
                    </tr>
                    <tr className="border-b border-slate-100">
                      <td className="py-2 px-3">Mobile App</td>
                      <td className="text-center py-2 px-3">$22/mo</td>
                      <td className="text-center py-2 px-3 text-emerald-600 font-bold">Free PWA</td>
                    </tr>
                    <tr>
                      <td className="py-2 px-3">Languages</td>
                      <td className="text-center py-2 px-3">Multi</td>
                      <td className="text-center py-2 px-3 font-medium">7 languages</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </motion.div>
          </section>
        </main>

        <Footer />
        <FeedbackButton />
        <InstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
