'use client';

import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import Link from 'next/link';
import {
  Download,
  Monitor,
  Smartphone,
  Tablet,
  Globe,
  CheckCircle2,
  ArrowLeft,
  Wifi,
  WifiOff,
  Zap,
  BookOpen,
} from 'lucide-react';
import Header from '@/components/Header';
import Footer from '@/components/Footer';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

type Platform = 'windows' | 'mac' | 'android' | 'ios' | 'chromeos' | 'linux' | 'unknown';

function detectPlatform(): Platform {
  if (typeof window === 'undefined') return 'unknown';
  const ua = navigator.userAgent.toLowerCase();
  if (/android/.test(ua)) return 'android';
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/cros/.test(ua)) return 'chromeos';
  if (/mac/.test(ua)) return 'mac';
  if (/win/.test(ua)) return 'windows';
  if (/linux/.test(ua)) return 'linux';
  return 'unknown';
}

const PLATFORM_NAMES: Record<Platform, string> = {
  windows: 'Windows',
  mac: 'macOS',
  android: 'Android',
  ios: 'iOS',
  chromeos: 'Chrome OS',
  linux: 'Linux',
  unknown: 'Your Device',
};

export default function DownloadContent() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [isInstalled, setIsInstalled] = useState(false);
  const [installing, setInstalling] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setIsInstalled(window.matchMedia('(display-mode: standalone)').matches);

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    setInstalling(true);
    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setIsInstalled(true);
    }
    setInstalling(false);
    setDeferredPrompt(null);
  };

  const canAutoInstall = !!deferredPrompt;

  return (
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header />

      <main className="flex-1">
        {/* Hero */}
        <section className="bg-gradient-to-b from-indigo-50/80 to-transparent border-b border-slate-100">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 sm:py-12 text-center">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
            >
              <div className="w-16 h-16 bg-indigo-500 rounded-2xl mx-auto flex items-center justify-center mb-5 shadow-lg shadow-indigo-500/25">
                <Download className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight">
                Download BodyAtlas
              </h1>
              <p className="mt-2 text-sm sm:text-base text-slate-500 max-w-lg mx-auto">
                Install as a desktop or mobile app for instant access. Works offline, launches fast, always free.
              </p>
            </motion.div>
          </div>
        </section>

        <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8">
          {/* Quick Install (if PWA prompt is available) */}
          {isInstalled ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 text-center"
            >
              <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-3" />
              <h2 className="text-lg font-semibold text-emerald-800">Already Installed</h2>
              <p className="text-sm text-emerald-600 mt-1">
                BodyAtlas is installed on your device. You can launch it from your app drawer or desktop.
              </p>
              <Link
                href="/"
                className="inline-flex items-center gap-2 mt-4 px-5 py-2 bg-emerald-500 text-white text-sm font-semibold rounded-xl hover:bg-emerald-600 transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                Open Atlas
              </Link>
            </motion.div>
          ) : canAutoInstall ? (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white border border-slate-200 rounded-2xl p-6 shadow-lg shadow-slate-200/50"
            >
              <div className="text-center">
                <h2 className="text-lg font-semibold text-slate-900">
                  Install for {PLATFORM_NAMES[platform]}
                </h2>
                <p className="text-sm text-slate-500 mt-1">
                  One click to install — no app store needed
                </p>
                <button
                  onClick={handleInstall}
                  disabled={installing}
                  className="mt-4 px-8 py-3 bg-indigo-500 text-white text-sm font-semibold rounded-xl hover:bg-indigo-600 transition-all shadow-md hover:shadow-lg disabled:opacity-50 inline-flex items-center gap-2"
                >
                  <Download className="w-4 h-4" />
                  {installing ? 'Installing...' : 'Install BodyAtlas'}
                </button>
              </div>
            </motion.div>
          ) : null}

          {/* Platform Instructions */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Installation Guide</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {/* Desktop — Chrome/Edge */}
              <div className={`bg-white border rounded-2xl p-5 ${
                (platform === 'windows' || platform === 'mac' || platform === 'linux' || platform === 'chromeos')
                  ? 'border-indigo-200 ring-2 ring-indigo-100'
                  : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Monitor className="w-5 h-5 text-indigo-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Desktop (Windows / Mac / Linux)</h3>
                </div>
                <ol className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                    <span>Open <strong>bodyatlas-ten.vercel.app</strong> in Chrome or Edge</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                    <span>Click the <strong>install icon</strong> (⊕) in the address bar</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-indigo-100 text-indigo-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                    <span>Click &quot;Install&quot; in the popup dialog</span>
                  </li>
                </ol>
                <div className="mt-3 flex gap-1.5">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">Chrome</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">Edge</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">Brave</span>
                </div>
              </div>

              {/* Android */}
              <div className={`bg-white border rounded-2xl p-5 ${
                platform === 'android'
                  ? 'border-indigo-200 ring-2 ring-indigo-100'
                  : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Smartphone className="w-5 h-5 text-emerald-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Android</h3>
                </div>
                <ol className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                    <span>Open the site in <strong>Chrome</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                    <span>Tap the <strong>⋮ menu</strong> (top right)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                    <span>Select <strong>&quot;Add to Home screen&quot;</strong> or &quot;Install app&quot;</span>
                  </li>
                </ol>
                <div className="mt-3 flex gap-1.5">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">Chrome</span>
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">Samsung Internet</span>
                </div>
              </div>

              {/* iOS */}
              <div className={`bg-white border rounded-2xl p-5 ${
                platform === 'ios'
                  ? 'border-indigo-200 ring-2 ring-indigo-100'
                  : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Tablet className="w-5 h-5 text-blue-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">iPhone / iPad</h3>
                </div>
                <ol className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                    <span>Open the site in <strong>Safari</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                    <span>Tap the <strong>Share button</strong> (↑ square icon)</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-blue-100 text-blue-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                    <span>Scroll down and tap <strong>&quot;Add to Home Screen&quot;</strong></span>
                  </li>
                </ol>
                <div className="mt-3 flex gap-1.5">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">Safari only</span>
                </div>
              </div>

              {/* Chrome OS */}
              <div className={`bg-white border rounded-2xl p-5 ${
                platform === 'chromeos'
                  ? 'border-indigo-200 ring-2 ring-indigo-100'
                  : 'border-slate-200'
              }`}>
                <div className="flex items-center gap-2 mb-3">
                  <Globe className="w-5 h-5 text-amber-500" />
                  <h3 className="font-semibold text-slate-800 text-sm">Chromebook</h3>
                </div>
                <ol className="space-y-2 text-xs text-slate-600">
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">1</span>
                    <span>Open the site in <strong>Chrome</strong></span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">2</span>
                    <span>Click the <strong>install icon</strong> (⊕) in the address bar</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="w-5 h-5 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center flex-shrink-0 text-[10px] font-bold">3</span>
                    <span>Click &quot;Install&quot; — app appears in your launcher</span>
                  </li>
                </ol>
                <div className="mt-3 flex gap-1.5">
                  <span className="px-2 py-0.5 bg-slate-100 text-slate-500 text-[10px] rounded-full">Chrome</span>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Features */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Why Install?</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <WifiOff className="w-6 h-6 text-indigo-500 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">Works Offline</h3>
                <p className="text-xs text-slate-500 mt-1">Browse anatomy without internet — perfect for studying in libraries or hospitals</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <Zap className="w-6 h-6 text-amber-500 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">Instant Launch</h3>
                <p className="text-xs text-slate-500 mt-1">Opens like a native app — no browser tabs, no URL typing</p>
              </div>
              <div className="bg-white border border-slate-200 rounded-xl p-4 text-center">
                <Globe className="w-6 h-6 text-emerald-500 mx-auto mb-2" />
                <h3 className="text-sm font-semibold text-slate-800">Always Up-to-Date</h3>
                <p className="text-xs text-slate-500 mt-1">Auto-updates when connected — always get the latest anatomy data</p>
              </div>
            </div>
          </motion.div>

          {/* FAQ */}
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="space-y-3"
          >
            <h2 className="text-lg font-semibold text-slate-900">FAQ</h2>
            <details className="bg-white border border-slate-200 rounded-xl group">
              <summary className="px-4 py-3 text-sm font-medium text-slate-800 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors">
                Is this a real app or just a shortcut?
              </summary>
              <p className="px-4 pb-3 text-xs text-slate-500">
                It&apos;s a Progressive Web App (PWA) — a real app that runs in its own window, has its own icon, and works offline. It&apos;s the same technology used by Twitter, Spotify, and Starbucks for their web apps.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl group">
              <summary className="px-4 py-3 text-sm font-medium text-slate-800 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors">
                How much storage does it use?
              </summary>
              <p className="px-4 pb-3 text-xs text-slate-500">
                The app itself is under 1MB. CT slice images are cached as you browse — a full chest CT atlas is about 75MB. You can clear the cache anytime from your browser settings.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl group">
              <summary className="px-4 py-3 text-sm font-medium text-slate-800 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors">
                Is it really free?
              </summary>
              <p className="px-4 pb-3 text-xs text-slate-500">
                Yes, 100% free. No subscription, no trial, no hidden costs. BodyAtlas is built on open-source anatomy data and free hosting.
              </p>
            </details>
            <details className="bg-white border border-slate-200 rounded-xl group">
              <summary className="px-4 py-3 text-sm font-medium text-slate-800 cursor-pointer hover:bg-slate-50 rounded-xl transition-colors">
                I don&apos;t see the install button in my browser
              </summary>
              <p className="px-4 pb-3 text-xs text-slate-500">
                Make sure you&apos;re using Chrome, Edge, or Brave on desktop, Chrome on Android, or Safari on iOS. Firefox does not support PWA installation on desktop. On iOS, you must use Safari — Chrome/Firefox on iOS can&apos;t install PWAs.
              </p>
            </details>
          </motion.div>

          {/* Back to Atlas */}
          <div className="text-center pb-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-sm text-indigo-500 hover:text-indigo-600 font-medium transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Atlas
            </Link>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
}
