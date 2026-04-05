'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, Lock, Mail } from 'lucide-react';
import { useAuth } from '@/lib/auth-context';

interface AuthGateProps {
  onDismiss?: () => void;
}

export default function AuthGate({ onDismiss }: AuthGateProps) {
  const { signInWithEmail } = useAuth();
  const [email, setEmail] = useState('');
  const [emailSent, setEmailSent] = useState(false);
  const [error, setError] = useState('');
  const [sending, setSending] = useState(false);

  const handleEmailSubmit = async () => {
    if (!email.trim() || !email.includes('@')) {
      setError('Enter a valid email');
      return;
    }
    setSending(true);
    setError('');
    const result = await signInWithEmail(email);
    setSending(false);
    if (result.error) {
      setError(result.error);
    } else {
      setEmailSent(true);
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      >
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.2 }}
          className="bg-white rounded-2xl shadow-2xl border border-slate-200/60 w-full max-w-sm p-6 text-center"
        >
          {emailSent ? (
            <>
              <div className="w-12 h-12 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                <Check className="w-6 h-6 text-emerald-600" />
              </div>
              <h2 className="text-lg font-semibold text-slate-900">Check your email</h2>
              <p className="text-sm text-slate-500 mt-2">
                We sent a magic link to <strong>{email}</strong>. Click it to sign in.
              </p>
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="mt-4 text-xs text-slate-400 hover:text-slate-500 transition-colors"
                >
                  Close
                </button>
              )}
            </>
          ) : (
            <>
              <div className="w-12 h-12 rounded-full bg-indigo-100 flex items-center justify-center mx-auto mb-4">
                <Lock className="w-6 h-6 text-indigo-600" />
              </div>
              <h2 className="text-xl font-bold text-slate-900">Unlock all body regions</h2>
              <p className="text-sm text-slate-500 mt-1">
                Sign up free to access Head/Neck, Abdomen, and Pelvis anatomy
              </p>

              {/* Email login */}
              <div className="mt-5 space-y-2">
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleEmailSubmit()}
                    placeholder="your@email.com"
                    className="w-full pl-10 pr-3 py-3 text-sm border border-slate-200 rounded-xl focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
                    autoFocus
                  />
                </div>
                <button
                  onClick={handleEmailSubmit}
                  disabled={sending}
                  className="w-full px-4 py-3 rounded-xl text-sm font-semibold bg-indigo-500 text-white hover:bg-indigo-600 transition-all shadow-sm hover:shadow-md disabled:opacity-50"
                >
                  {sending ? 'Sending...' : 'Send Magic Link'}
                </button>
                {error && <p className="text-xs text-red-500">{error}</p>}
              </div>

              <p className="mt-4 text-[11px] text-slate-400">
                Free forever — no credit card, no spam. Just enter your email.
              </p>

              {/* Skip option */}
              {onDismiss && (
                <button
                  onClick={onDismiss}
                  className="mt-3 text-xs text-slate-400 hover:text-slate-500 transition-colors"
                >
                  Maybe later
                </button>
              )}
            </>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
