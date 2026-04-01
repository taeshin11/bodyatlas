'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FeedbackButton from '@/components/FeedbackButton';
import InstallPrompt from '@/components/InstallPrompt';
import ErrorBoundary from '@/components/ErrorBoundary';
import AtlasViewer from '@/components/AtlasViewer';
import StructurePanel from '@/components/StructurePanel';
import { useI18n } from '@/lib/i18n-context';
import { useAuth } from '@/lib/auth-context';
import AuthGate from '@/components/AuthGate';

interface Structure {
  id: number;
  name: string;
  displayName: Record<string, string>;
  category: string;
  color: string;
  bestSlice: Record<string, number>;
  sliceRange: Record<string, number[]>;
}

export default function Home() {
  const { locale } = useI18n();
  const { markTrialUsed } = useAuth();
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [interactionCount, setInteractionCount] = useState(0);

  // Track interactions — after 3 meaningful actions, mark trial as used
  const handleStructureSelect = (s: Structure | null) => {
    setSelectedStructure(s);
    if (s) {
      const newCount = interactionCount + 1;
      setInteractionCount(newCount);
      if (newCount >= 3) {
        markTrialUsed();
      }
    }
  };

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <Header />

        <main className="flex-1">
          {/* SEO Hero Section */}
          <section className="bg-gradient-to-b from-indigo-50/80 to-transparent border-b border-slate-100">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Free Interactive Cross-Sectional Anatomy Atlas
              </h1>
              <h2 className="mt-2 text-base sm:text-lg text-slate-600 font-medium">
                The Best Free Alternative to IMAIOS e-Anatomy &mdash; $0 Forever
              </h2>
              <p className="mt-3 text-sm text-slate-500 max-w-3xl leading-relaxed">
                Browse labeled CT and MRI cross-sections with instant structure search.
                Built for medical students, radiology residents, and anatomy learners.
                No subscription, no account, no install required. Works offline as a PWA.
                Available in 7 languages.
              </p>
            </div>
          </section>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4"
          >
            {/* Desktop Layout */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_280px] gap-4">
              <AtlasViewer
                onStructureSelect={handleStructureSelect}
                selectedStructure={selectedStructure}
                locale={locale}
              />
              <StructurePanel
                selectedStructure={selectedStructure}
                onStructureSelect={handleStructureSelect}
                locale={locale}
              />
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden space-y-3">
              <AtlasViewer
                onStructureSelect={handleStructureSelect}
                selectedStructure={selectedStructure}
                locale={locale}
              />
              <StructurePanel
                selectedStructure={selectedStructure}
                onStructureSelect={handleStructureSelect}
                locale={locale}
              />
            </div>
          </motion.div>
        </main>

        <Footer />
        <FeedbackButton />
        <InstallPrompt />
        <AuthGate />
      </div>
    </ErrorBoundary>
  );
}
