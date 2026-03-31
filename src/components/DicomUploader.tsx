'use client';

import { useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, FileImage, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useI18n } from '@/lib/i18n-context';

interface DicomUploaderProps {
  onFilesLoaded: (files: ArrayBuffer[]) => void;
  isLoading: boolean;
  progress: { current: number; total: number } | null;
}

export default function DicomUploader({ onFilesLoaded, isLoading, progress }: DicomUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const { t } = useI18n();

  const handleFiles = useCallback(async (fileList: FileList) => {
    const buffers: ArrayBuffer[] = [];
    const files = Array.from(fileList).filter(
      f => f.name.endsWith('.dcm') || f.name.endsWith('.DCM') || !f.name.includes('.')
    );
    if (files.length === 0) return;

    for (const file of files) {
      buffers.push(await file.arrayBuffer());
    }
    onFilesLoaded(buffers);
  }, [onFilesLoaded]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  }, [handleFiles]);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  const handleClick = useCallback(() => {
    const input = document.createElement('input');
    input.type = 'file';
    input.multiple = true;
    input.accept = '.dcm,.DCM';
    (input as HTMLInputElement & { webkitdirectory: boolean }).webkitdirectory = true;
    input.onchange = () => {
      if (input.files) handleFiles(input.files);
    };
    input.click();
  }, [handleFiles]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="flex flex-col items-center justify-center min-h-[60vh] px-4"
    >
      {/* SEO-visible h1 */}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 mb-2 text-center">
        BrainAxis
      </h1>
      <p className="text-sm text-slate-500 mb-8 text-center max-w-md">
        {t('app.tagline')}
      </p>

      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={handleClick}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') handleClick(); }}
        className={`
          relative w-full max-w-xl cursor-pointer rounded-2xl border-2 border-dashed p-12
          transition-all duration-300 ease-out
          ${isDragging
            ? 'border-indigo-500 bg-indigo-50/50 scale-[1.02]'
            : 'border-slate-300 bg-white/70 backdrop-blur-xl hover:border-indigo-400 hover:bg-white/90'
          }
          shadow-lg shadow-slate-200/50
        `}
      >
        <AnimatePresence mode="wait">
          {isLoading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4"
            >
              <Loader2 className="w-12 h-12 text-indigo-500 animate-spin" />
              <p className="text-slate-700 font-medium">
                {progress
                  ? t('upload.parsing', { current: progress.current, total: progress.total })
                  : t('upload.processing')
                }
              </p>
              {progress && (
                <div className="w-full max-w-xs h-2 bg-slate-200 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full bg-indigo-500 rounded-full"
                    initial={{ width: 0 }}
                    animate={{ width: `${(progress.current / progress.total) * 100}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              )}
            </motion.div>
          ) : (
            <motion.div
              key="upload"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="flex flex-col items-center gap-4 text-center"
            >
              <motion.div
                animate={{ y: [0, -4, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
              >
                {isDragging ? (
                  <FileImage className="w-14 h-14 text-indigo-500" />
                ) : (
                  <Upload className="w-14 h-14 text-slate-400" />
                )}
              </motion.div>
              <div>
                <p className="text-lg font-semibold text-slate-700">
                  {isDragging ? t('upload.titleDragging') : t('upload.title')}
                </p>
                <p className="text-sm text-slate-500 mt-1">
                  {t('upload.subtitle')}
                </p>
              </div>
              <div className="flex items-center gap-2 mt-2 text-xs text-slate-400">
                <div className="w-8 h-px bg-slate-300" />
                <span>{t('upload.privacy')}</span>
                <div className="w-8 h-px bg-slate-300" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <p className="mt-4 text-sm text-slate-400">
        {t('upload.guide')}{' '}
        <Link href="/how-to-use" className="text-indigo-500 hover:text-indigo-600 underline underline-offset-2">
          {t('upload.guideLink')}
        </Link>
      </p>
    </motion.div>
  );
}
