'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { Brain, Check, X, RotateCcw, ArrowRight } from 'lucide-react';
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

interface QuizPanelProps {
  selectedStructure: Structure | null;
  onStructureSelect: (s: Structure | null) => void;
  locale: string;
  dataPath: string;
}

function pickRandom<T>(arr: T[], exclude?: T): T | null {
  if (arr.length === 0) return null;
  if (arr.length === 1 || !exclude) return arr[Math.floor(Math.random() * arr.length)];
  let candidate: T;
  do {
    candidate = arr[Math.floor(Math.random() * arr.length)];
  } while (candidate === exclude);
  return candidate;
}

function getDisplayName(s: Structure, locale: string): string {
  return s.displayName[locale] || s.displayName.en || s.name.replace(/_/g, ' ');
}

export default function QuizPanel({ selectedStructure, onStructureSelect, locale, dataPath }: QuizPanelProps) {
  const { t } = useI18n();
  const [structures, setStructures] = useState<Structure[]>([]);
  const [target, setTarget] = useState<Structure | null>(null);
  const [score, setScore] = useState({ correct: 0, total: 0 });
  const [feedback, setFeedback] = useState<'correct' | 'wrong' | null>(null);
  const lastJudgedIdRef = useRef<number | null>(null);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch(`${dataPath}/structures.json`, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject())
      .then((d: { structures: Structure[] }) => setStructures(d.structures || []))
      .catch((err: unknown) => {
        if (err instanceof Error && err.name === 'AbortError') return;
        setStructures([]);
      });
    return () => ctrl.abort();
  }, [dataPath]);

  const pickNext = useCallback(() => {
    setTarget(prev => pickRandom(structures, prev || undefined));
    setFeedback(null);
    lastJudgedIdRef.current = null;
    onStructureSelect(null);
  }, [structures, onStructureSelect]);

  // Auto-pick first when structures loaded or atlas changes
  useEffect(() => {
    if (structures.length > 0 && !target) {
      setTarget(pickRandom(structures));
    }
  }, [structures, target]);

  // Reset score on atlas change
  useEffect(() => {
    setTarget(null);
    setScore({ correct: 0, total: 0 });
    setFeedback(null);
    lastJudgedIdRef.current = null;
  }, [dataPath]);

  // Detect answer — only judge once per (target, click) pair
  useEffect(() => {
    if (!target || !selectedStructure || feedback) return;
    if (lastJudgedIdRef.current === selectedStructure.id) return;
    lastJudgedIdRef.current = selectedStructure.id;
    const isCorrect = selectedStructure.id === target.id;
    setFeedback(isCorrect ? 'correct' : 'wrong');
    setScore(s => ({
      correct: s.correct + (isCorrect ? 1 : 0),
      total: s.total + 1,
    }));
  }, [selectedStructure, target, feedback]);

  const reset = useCallback(() => {
    setScore({ correct: 0, total: 0 });
    setFeedback(null);
    lastJudgedIdRef.current = null;
    setTarget(pickRandom(structures));
    onStructureSelect(null);
  }, [structures, onStructureSelect]);

  const targetName = target ? getDisplayName(target, locale) : '';
  const accuracy = score.total > 0 ? Math.round((score.correct / score.total) * 100) : 0;

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-indigo-500" />
          <h3 className="text-sm font-semibold text-slate-900">{t('quiz.title')}</h3>
        </div>
        <button
          onClick={reset}
          className="text-[10px] text-slate-500 hover:text-slate-700 flex items-center gap-1"
          aria-label={t('quiz.reset')}
        >
          <RotateCcw className="w-3 h-3" />
          {t('quiz.reset')}
        </button>
      </div>

      {/* Score */}
      <div className="flex items-center justify-between text-xs text-slate-600">
        <span>{t('quiz.score')}: <strong className="text-slate-900">{score.correct}/{score.total}</strong></span>
        {score.total > 0 && (
          <span className="text-slate-500">{accuracy}%</span>
        )}
      </div>

      {/* Question */}
      {structures.length === 0 ? (
        <div className="text-xs text-slate-500 py-4 text-center">{t('quiz.loading')}</div>
      ) : !target ? (
        <div className="text-xs text-slate-500 py-4 text-center">{t('quiz.noStructures')}</div>
      ) : (
        <>
          <div className="rounded-lg bg-indigo-50 border border-indigo-100 px-3 py-3">
            <div className="text-[10px] uppercase tracking-wider text-indigo-500 font-bold mb-1">
              {t('quiz.findThis')}
            </div>
            <div className="text-sm font-semibold text-slate-900 break-words">
              {targetName}
            </div>
          </div>

          {/* Feedback */}
          {feedback === 'correct' && (
            <div className="flex items-center gap-2 text-xs text-emerald-700 bg-emerald-50 border border-emerald-100 rounded-lg px-3 py-2">
              <Check className="w-4 h-4 shrink-0" />
              <span className="font-medium">{t('quiz.correct')}</span>
            </div>
          )}
          {feedback === 'wrong' && (
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs text-rose-700 bg-rose-50 border border-rose-100 rounded-lg px-3 py-2">
                <X className="w-4 h-4 shrink-0" />
                <span className="font-medium">{t('quiz.wrong')}</span>
              </div>
              {selectedStructure && (
                <div className="text-[10px] text-slate-500 px-3">
                  {t('quiz.youClicked')}: <strong className="text-slate-700">{getDisplayName(selectedStructure, locale)}</strong>
                </div>
              )}
            </div>
          )}

          {/* Next button */}
          {feedback && (
            <button
              onClick={pickNext}
              className="w-full flex items-center justify-center gap-2 bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium py-2 rounded-lg transition-colors"
            >
              {t('quiz.next')}
              <ArrowRight className="w-4 h-4" />
            </button>
          )}

          {!feedback && (
            <div className="text-[11px] text-slate-500 text-center py-1">
              {t('quiz.hint')}
            </div>
          )}
        </>
      )}
    </div>
  );
}
