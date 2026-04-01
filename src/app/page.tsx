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
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <Header />

        <main className="flex-1">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4"
          >
            {/* Desktop Layout */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_280px] gap-4">
              <AtlasViewer
                onStructureSelect={setSelectedStructure}
                selectedStructure={selectedStructure}
                locale={locale}
              />
              <StructurePanel
                selectedStructure={selectedStructure}
                onStructureSelect={setSelectedStructure}
                locale={locale}
              />
            </div>

            {/* Mobile Layout */}
            <div className="lg:hidden space-y-3">
              <AtlasViewer
                onStructureSelect={setSelectedStructure}
                selectedStructure={selectedStructure}
                locale={locale}
              />
              <StructurePanel
                selectedStructure={selectedStructure}
                onStructureSelect={setSelectedStructure}
                locale={locale}
              />
            </div>
          </motion.div>
        </main>

        <Footer />
        <FeedbackButton />
        <InstallPrompt />
      </div>
    </ErrorBoundary>
  );
}
