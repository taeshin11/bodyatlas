'use client';

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import FeedbackButton from '@/components/FeedbackButton';
import InstallPrompt from '@/components/InstallPrompt';
import ErrorBoundary from '@/components/ErrorBoundary';
import AtlasViewer from '@/components/AtlasViewer';
import StructurePanel from '@/components/StructurePanel';
import RegionSelector, { BODY_REGIONS, type BodyRegion } from '@/components/RegionSelector';
import AuthGate from '@/components/AuthGate';
import { useI18n } from '@/lib/i18n-context';
import { useAuth } from '@/lib/auth-context';

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
  const { user } = useAuth();
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [activeRegion, setActiveRegion] = useState<BodyRegion>('chest');
  const [showAuth, setShowAuth] = useState(false);
  const [forceAxial, setForceAxial] = useState(0);

  const isAuthenticated = !!user;

  const handleStructureSelect = useCallback((s: Structure | null) => {
    setSelectedStructure(s);
  }, []);

  const handleRegionSelect = useCallback((region: BodyRegion) => {
    const regionConfig = BODY_REGIONS.find(r => r.id === region);
    if (regionConfig && !regionConfig.free && !isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setActiveRegion(region);
    setSelectedStructure(null);
    setForceAxial(prev => prev + 1);
  }, [isAuthenticated]);

  const handleAuthDismiss = useCallback(() => {
    setShowAuth(false);
  }, []);

  const currentRegion = BODY_REGIONS.find(r => r.id === activeRegion)!;
  const dataPath = currentRegion.dataPath;

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
        <Header />

        <main className="flex-1">
          {/* SEO Hero */}
          <section className="bg-gradient-to-b from-indigo-50/80 to-transparent border-b border-slate-100">
            <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-3 sm:py-4">
              <h1 className="text-lg sm:text-2xl font-bold text-slate-900 tracking-tight">
                Free Interactive Cross-Sectional Anatomy Atlas
              </h1>
              <p className="mt-1 text-xs sm:text-sm text-slate-500 max-w-3xl">
                Browse labeled CT cross-sections with instant structure search.
                Built for medical students, radiology residents, and anatomy learners. 100% free, works offline.
              </p>
            </div>
          </section>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4 space-y-3"
          >
            {/* Body Region Selector */}
            <RegionSelector
              activeRegion={activeRegion}
              onRegionSelect={handleRegionSelect}
              locale={locale}
              isAuthenticated={isAuthenticated}
            />

            {/* Desktop Layout */}
            <div className="hidden lg:grid lg:grid-cols-[1fr_280px] gap-4">
              <AtlasViewer
                onStructureSelect={handleStructureSelect}
                selectedStructure={selectedStructure}
                locale={locale}
                dataPath={dataPath}
                regionAxialRange={currentRegion.axialRange}
                regionDefaultSlice={currentRegion.defaultSlice}
                forceAxial={forceAxial}
              />
              <StructurePanel
                selectedStructure={selectedStructure}
                onStructureSelect={handleStructureSelect}
                locale={locale}
                dataPath={dataPath}
                regionAxialRange={currentRegion.axialRange}
              />
            </div>

            {/* Mobile Layout — viewer on top, search below */}
            <div className="lg:hidden space-y-3">
              <AtlasViewer
                onStructureSelect={handleStructureSelect}
                selectedStructure={selectedStructure}
                locale={locale}
                dataPath={dataPath}
                regionAxialRange={currentRegion.axialRange}
                regionDefaultSlice={currentRegion.defaultSlice}
                forceAxial={forceAxial}
              />
              <StructurePanel
                selectedStructure={selectedStructure}
                onStructureSelect={handleStructureSelect}
                locale={locale}
                dataPath={dataPath}
                regionAxialRange={currentRegion.axialRange}
              />
            </div>
          </motion.div>
        </main>

        <Footer />
        <FeedbackButton />
        <InstallPrompt />
        {showAuth && <AuthGate onDismiss={handleAuthDismiss} />}
      </div>
    </ErrorBoundary>
  );
}
