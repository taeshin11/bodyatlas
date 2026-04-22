'use client';

import { useState, useCallback, useMemo } from 'react';
import dynamic from 'next/dynamic';
import { motion } from 'framer-motion';
import { Search, Brain } from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import ErrorBoundary from '@/components/ErrorBoundary';
import AtlasViewer from '@/components/AtlasViewer';
import StructurePanel from '@/components/StructurePanel';
import RegionSelector, { BODY_REGIONS, type BodyRegion } from '@/components/RegionSelector';
import { useI18n } from '@/lib/i18n-context';
import { useAuth } from '@/lib/auth-context';

// Lazy-load components that are either conditional or deferred.
// SpineXrayViewer: only rendered for 3 X-ray regions (not the default).
// AuthGate: only shown after user clicks a locked region.
// FeedbackButton / InstallPrompt: defer until after initial paint.
// QuizPanel: only rendered when user toggles quiz mode (off by default).
const SpineXrayViewer = dynamic(() => import('@/components/SpineXrayViewer'), { ssr: false });
const AuthGate = dynamic(() => import('@/components/AuthGate'), { ssr: false });
const FeedbackButton = dynamic(() => import('@/components/FeedbackButton'), { ssr: false });
const InstallPrompt = dynamic(() => import('@/components/InstallPrompt'), { ssr: false });
const QuizPanel = dynamic(() => import('@/components/QuizPanel'), { ssr: false });

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
  const { locale, t } = useI18n();
  const { user } = useAuth();
  const [selectedStructure, setSelectedStructure] = useState<Structure | null>(null);
  const [activeRegion, setActiveRegion] = useState<BodyRegion>('head_neck');
  const [showAuth, setShowAuth] = useState(false);
  const [forceAxial, setForceAxial] = useState(0);
  const [quizMode, setQuizMode] = useState(false);
  const [quizHardMode, setQuizHardMode] = useState(false);

  const isAuthenticated = !!user;

  const regionsById = useMemo(() => {
    const m = new Map<BodyRegion, typeof BODY_REGIONS[number]>();
    for (const r of BODY_REGIONS) m.set(r.id, r);
    return m;
  }, []);

  const handleStructureSelect = useCallback((s: Structure | null) => {
    setSelectedStructure(s);
  }, []);

  const handleRegionSelect = useCallback((region: BodyRegion) => {
    const regionConfig = regionsById.get(region);
    if (regionConfig && !regionConfig.free && !isAuthenticated) {
      setShowAuth(true);
      return;
    }
    setActiveRegion(region);
    setSelectedStructure(null);
    setForceAxial(prev => prev + 1);
  }, [isAuthenticated, regionsById]);

  const handleAuthDismiss = useCallback(() => {
    setShowAuth(false);
  }, []);

  const currentRegion = regionsById.get(activeRegion)!;
  const dataPath = currentRegion.dataPath;
  const isXray = activeRegion === 'our_xray' || activeRegion === 'our_hand_xray' || activeRegion === 'our_foot_xray';

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

            {/* Mode toggle */}
            <div className="flex rounded-xl bg-white/70 backdrop-blur-xl border border-slate-200/60 p-1 gap-1 max-w-xs">
              <button
                onClick={() => setQuizMode(false)}
                aria-pressed={!quizMode}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  !quizMode ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Search className="w-3 h-3" />
                {t('mode.explore')}
              </button>
              <button
                onClick={() => { setQuizMode(true); setSelectedStructure(null); }}
                aria-pressed={quizMode}
                className={`flex-1 flex items-center justify-center gap-1 py-1.5 text-xs font-medium rounded-lg transition-all ${
                  quizMode ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Brain className="w-3 h-3" />
                {t('mode.quiz')}
              </button>
            </div>

            <>
                {/* Desktop Layout */}
                <div className="hidden lg:grid lg:grid-cols-[1fr_280px] gap-4">
                  {isXray ? (
                    <SpineXrayViewer
                      onStructureSelect={handleStructureSelect}
                      selectedStructure={selectedStructure}
                      locale={locale}
                      dataPath={dataPath}
                    />
                  ) : (
                    <AtlasViewer
                      onStructureSelect={handleStructureSelect}
                      selectedStructure={selectedStructure}
                      locale={locale}
                      dataPath={dataPath}
                      regionAxialRange={currentRegion.axialRange}
                      regionDefaultSlice={currentRegion.defaultSlice}
                      forceAxial={forceAxial}
                      forceHideOverlay={quizMode && quizHardMode}
                    />
                  )}
                  {quizMode ? (
                    <QuizPanel
                      selectedStructure={selectedStructure}
                      onStructureSelect={handleStructureSelect}
                      locale={locale}
                      dataPath={dataPath}
                      onHardModeChange={setQuizHardMode}
                    />
                  ) : (
                    <StructurePanel
                      selectedStructure={selectedStructure}
                      onStructureSelect={handleStructureSelect}
                      locale={locale}
                      dataPath={dataPath}
                      regionAxialRange={currentRegion.axialRange}
                    />
                  )}
                </div>

                {/* Mobile Layout — viewer on top, search below */}
                <div className="lg:hidden space-y-3">
                  {isXray ? (
                    <SpineXrayViewer
                      onStructureSelect={handleStructureSelect}
                      selectedStructure={selectedStructure}
                      locale={locale}
                      dataPath={dataPath}
                    />
                  ) : (
                    <AtlasViewer
                      onStructureSelect={handleStructureSelect}
                      selectedStructure={selectedStructure}
                      locale={locale}
                      dataPath={dataPath}
                      regionAxialRange={currentRegion.axialRange}
                      regionDefaultSlice={currentRegion.defaultSlice}
                      forceAxial={forceAxial}
                      forceHideOverlay={quizMode && quizHardMode}
                    />
                  )}
                  {quizMode ? (
                    <QuizPanel
                      selectedStructure={selectedStructure}
                      onStructureSelect={handleStructureSelect}
                      locale={locale}
                      dataPath={dataPath}
                      onHardModeChange={setQuizHardMode}
                    />
                  ) : (
                    <StructurePanel
                      selectedStructure={selectedStructure}
                      onStructureSelect={handleStructureSelect}
                      locale={locale}
                      dataPath={dataPath}
                      regionAxialRange={currentRegion.axialRange}
                    />
                  )}
                </div>
            </>
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
