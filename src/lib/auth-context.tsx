'use client';

import { createContext, useContext, useState, useEffect, useMemo, useCallback, ReactNode } from 'react';
import { supabase, isSupabaseConfigured } from './supabase';
import { createLogger } from './logger';
import type { User } from '@supabase/supabase-js';

const log = createLogger('auth');

interface AuthContextType {
  user: User | null;
  loading: boolean;
  trialUsed: boolean;
  markTrialUsed: () => void;
  needsAuth: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string) => Promise<{ error: string | null }>;
  signInWithPassword: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  trialUsed: false,
  markTrialUsed: () => {},
  needsAuth: false,
  signInWithGoogle: async () => {},
  signInWithEmail: async () => ({ error: null }),
  signInWithPassword: async () => ({ error: null }),
  signOut: async () => {},
});

const TRIAL_KEY = 'bodyatlas_trial_used';

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [trialUsed, setTrialUsed] = useState(false);

  useEffect(() => {
    // Check trial status
    let trialFromStorage = false;
    try {
      trialFromStorage = localStorage.getItem(TRIAL_KEY) === '1';
      log.debug('localStorage read', { key: TRIAL_KEY, value: trialFromStorage ? '1' : null });
    } catch (e) {
      log.error('localStorage read failed', e, { key: TRIAL_KEY });
    }
    setTrialUsed(trialFromStorage);

    if (!isSupabaseConfigured) {
      log.warn('supabase not configured; skipping session restore');
      setLoading(false);
      return;
    }

    log.info('restoring supabase session');
    supabase.auth.getSession().then(({ data: { session } }) => {
      log.info('session restored', { userId: session?.user?.id ?? null });
      setUser(session?.user ?? null);
      setLoading(false);
    }).catch((e) => {
      log.error('getSession failed', e);
      setLoading(false);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      log.info('auth state change', { event, userId: session?.user?.id ?? null });
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const markTrialUsed = useCallback(() => {
    try {
      localStorage.setItem(TRIAL_KEY, '1');
      log.info('localStorage write: trial marked used', { key: TRIAL_KEY });
    } catch (e) {
      log.error('localStorage write failed', e, { key: TRIAL_KEY });
    }
    setTrialUsed(true);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    log.info('signInWithGoogle: redirecting to OAuth');
    try {
      await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
    } catch (e) {
      log.error('signInWithGoogle failed', e);
    }
  }, []);

  const signInWithEmail = useCallback(async (email: string) => {
    log.info('signInWithEmail: sending OTP', { email });
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: window.location.origin },
    });
    if (error) log.error('signInWithOtp returned error', error, { email });
    else log.info('OTP sent', { email });
    return { error: error?.message ?? null };
  }, []);

  const signInWithPassword = useCallback(async (email: string, password: string) => {
    log.info('signInWithPassword: attempting', { email });
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) log.warn('signInWithPassword failed', { email, error: error.message });
    else log.info('signInWithPassword OK', { email });
    return { error: error?.message ?? null };
  }, []);

  const signOut = useCallback(async () => {
    log.info('signOut');
    try {
      await supabase.auth.signOut();
      setUser(null);
    } catch (e) {
      log.error('signOut failed', e);
    }
  }, []);

  const needsAuth = trialUsed && !user;

  // Stable value — consumers re-render only when one of these actually changes.
  const value = useMemo(() => ({
    user, loading, trialUsed, markTrialUsed, needsAuth,
    signInWithGoogle, signInWithEmail, signInWithPassword, signOut,
  }), [user, loading, trialUsed, needsAuth, markTrialUsed, signInWithGoogle, signInWithEmail, signInWithPassword, signOut]);

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
