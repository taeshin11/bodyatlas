'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Check } from 'lucide-react';
import { useI18n } from '@/lib/i18n-context';
import { createLogger } from '@/lib/logger';

const log = createLogger('feedback');

export default function FeedbackButton() {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent'>('idle');
  const { t } = useI18n();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!message.trim()) return;

    setStatus('sending');
    const t0 = performance.now();
    const formspreeId = process.env.NEXT_PUBLIC_FORMSPREE_ID || '';
    log.info('feedback submit START', {
      hasEmail: !!email,
      messageLen: message.length,
      transport: formspreeId ? 'formspree' : 'mailto',
    });

    try {
      if (formspreeId) {
        const url = `https://formspree.io/f/${formspreeId}`;
        const res = await fetch(url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            ...(email ? { email, _replyto: email } : { email: 'not provided' }),
            _subject: `BodyAtlas Feedback: ${message.slice(0, 50)}`,
          }),
        });
        const dt = Math.round(performance.now() - t0);
        if (!res.ok) {
          log.error('formspree POST non-OK', new Error(`HTTP ${res.status}`), {
            url, status: res.status, statusText: res.statusText, ms: dt,
          });
          throw new Error('Failed');
        }
        log.info('formspree POST OK', { status: res.status, ms: dt });
      } else {
        const mailto = `mailto:taeshinkim11@gmail.com?subject=${encodeURIComponent('BodyAtlas Feedback')}&body=${encodeURIComponent(`${message}\n\nFrom: ${email || 'Anonymous'}`)}`;
        log.info('falling back to mailto', { mailtoLen: mailto.length });
        window.location.href = mailto;
      }
      setStatus('sent');
      setTimeout(() => {
        setIsOpen(false);
        setMessage('');
        setEmail('');
        setStatus('idle');
      }, 2000);
    } catch (err) {
      const dt = Math.round(performance.now() - t0);
      log.error('feedback submit failed', err, { ms: dt });
      setStatus('idle');
    }
  };

  return (
    <>
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-50 w-12 h-12 rounded-full bg-white/80 backdrop-blur-md border border-slate-200 shadow-lg hover:shadow-xl flex items-center justify-center text-slate-600 hover:text-indigo-500 transition-all duration-200"
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        aria-label="Send feedback"
      >
        <MessageSquare className="w-5 h-5" />
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-20 right-6 z-50 w-80 bg-white/90 backdrop-blur-xl border border-slate-200 rounded-2xl shadow-2xl overflow-hidden"
          >
            <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
              <h3 className="text-sm font-semibold text-slate-800">{t('feedback.title')}</h3>
              <button onClick={() => setIsOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit} className="p-4 space-y-3">
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={t('feedback.placeholder')}
                className="w-full h-24 px-3 py-2 text-sm border border-slate-200 rounded-lg resize-none focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 bg-white text-slate-700 placeholder:text-slate-400"
              />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('feedback.email')}
                className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-400/20 bg-white text-slate-700 placeholder:text-slate-400"
              />
              <button
                type="submit"
                disabled={!message.trim() || status !== 'idle'}
                className={`w-full py-2 rounded-lg text-sm font-semibold transition-all duration-200 flex items-center justify-center gap-1.5 ${
                  status === 'sent'
                    ? 'bg-emerald-500 text-white'
                    : message.trim()
                      ? 'bg-indigo-500 hover:bg-indigo-600 text-white shadow-sm'
                      : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                }`}
              >
                {status === 'sent' ? (
                  <>
                    <Check className="w-4 h-4" />
                    {t('feedback.thanks')}
                  </>
                ) : status === 'sending' ? (
                  t('feedback.sending')
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    {t('feedback.send')}
                  </>
                )}
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
