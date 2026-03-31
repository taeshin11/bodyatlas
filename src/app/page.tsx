'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import DicomUploader from '@/components/DicomUploader';
import ViewerPanel from '@/components/ViewerPanel';
import ControlPanel from '@/components/ControlPanel';
import FeedbackButton from '@/components/FeedbackButton';
import { parseDicomFile, buildVolume, DicomVolume } from '@/lib/dicom';
import { Point3D, computeACPCAlignment, buildRotationMatrix, resliceVolume } from '@/lib/alignment';
import { exportPngSnapshots, exportDicomZip } from '@/lib/export';
import ErrorBoundary from '@/components/ErrorBoundary';
import { _post } from '@/utils/analytics';
import { useI18n } from '@/lib/i18n-context';

export default function Home() {
  const { t } = useI18n();
  const [volume, setVolume] = useState<DicomVolume | null>(null);
  const [originalVolume, setOriginalVolume] = useState<DicomVolume | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [progress, setProgress] = useState<{ current: number; total: number } | null>(null);

  const [acPoint, setAcPoint] = useState<Point3D | null>(null);
  const [pcPoint, setPcPoint] = useState<Point3D | null>(null);
  const [markingMode, setMarkingMode] = useState<'none' | 'ac' | 'pc'>('none');

  const [axialSlice, setAxialSlice] = useState(0);
  const [sagittalSlice, setSagittalSlice] = useState(0);
  const [coronalSlice, setCoronalSlice] = useState(0);

  const [windowCenter, setWindowCenter] = useState(400);
  const [windowWidth, setWindowWidth] = useState(800);

  const [pitchDeg, setPitchDeg] = useState(0);
  const [rollDeg, setRollDeg] = useState(0);
  const [yawDeg, setYawDeg] = useState(0);

  const [isAligned, setIsAligned] = useState(false);
  const [isAligning, setIsAligning] = useState(false);

  const [crosshairPosition, setCrosshairPosition] = useState({ x: 0, y: 0, z: 0 });
  const [statusMessage, setStatusMessage] = useState('');

  // Mobile tab state
  const [activeTab, setActiveTab] = useState<'axial' | 'sagittal' | 'coronal'>('axial');
  const [showMobileControls, setShowMobileControls] = useState(false);

  const handleFilesLoaded = useCallback(async (buffers: ArrayBuffer[]) => {
    setIsLoading(true);
    setProgress({ current: 0, total: buffers.length });

    try {
      const slices = [];
      for (let i = 0; i < buffers.length; i++) {
        const slice = parseDicomFile(buffers[i]);
        if (slice) slices.push(slice);
        setProgress({ current: i + 1, total: buffers.length });
        // Yield to keep UI responsive
        if (i % 10 === 0) await new Promise((r) => setTimeout(r, 0));
      }

      const vol = buildVolume(slices);
      if (vol) {
        setVolume(vol);
        setOriginalVolume(vol);
        setWindowCenter(vol.windowCenter);
        setWindowWidth(vol.windowWidth);
        setAxialSlice(Math.floor(vol.depth / 2));
        setSagittalSlice(Math.floor(vol.width / 2));
        setCoronalSlice(Math.floor(vol.height / 2));
        setCrosshairPosition({
          x: Math.floor(vol.width / 2),
          y: Math.floor(vol.height / 2),
          z: Math.floor(vol.depth / 2),
        });
        setStatusMessage(t('status.loaded', { count: slices.length, w: vol.width, h: vol.height, d: vol.depth }));
        _post({ action: 'upload', dicom_modality: vol.modality, num_slices: slices.length });
      } else {
        setStatusMessage(t('status.failed'));
      }
    } catch {
      setStatusMessage(t('status.error'));
    }

    setIsLoading(false);
    setProgress(null);
  }, []);

  const handleMarkPoint = useCallback((point: Point3D) => {
    if (markingMode === 'ac') {
      setAcPoint(point);
      setMarkingMode('none');
      setStatusMessage(t('status.acMarked', { x: point.x, y: point.y, z: point.z }));
    } else if (markingMode === 'pc') {
      setPcPoint(point);
      setMarkingMode('none');
      setStatusMessage(t('status.pcMarked', { x: point.x, y: point.y, z: point.z }));
    }
  }, [markingMode]);

  const handleAutoAlign = useCallback(() => {
    if (!acPoint || !pcPoint || !originalVolume) return;
    setIsAligning(true);
    setStatusMessage(t('status.aligning'));

    // Use setTimeout to allow UI to update before heavy computation
    setTimeout(() => {
      try {
        const alignment = computeACPCAlignment(acPoint, pcPoint);
        const center: Point3D = {
          x: originalVolume.width / 2,
          y: originalVolume.height / 2,
          z: originalVolume.depth / 2,
        };
        const rotMatrix = buildRotationMatrix(alignment.pitchDeg, alignment.rollDeg, alignment.yawDeg);
        const aligned = resliceVolume(originalVolume, rotMatrix, center);

        setVolume(aligned);
        setPitchDeg(alignment.pitchDeg);
        setRollDeg(alignment.rollDeg);
        setYawDeg(alignment.yawDeg);
        setIsAligned(true);
        setStatusMessage(t('status.aligned', { pitch: alignment.pitchDeg.toFixed(1), roll: alignment.rollDeg.toFixed(1), yaw: alignment.yawDeg.toFixed(1) }));
        _post({
          action: 'align',
          alignment_angles: { x: alignment.pitchDeg, y: alignment.rollDeg, z: alignment.yawDeg },
        });
      } catch {
        setStatusMessage(t('status.alignFailed'));
      }
      setIsAligning(false);
    }, 50);
  }, [acPoint, pcPoint, originalVolume]);

  const handleManualRotation = useCallback((newPitch: number, newRoll: number, newYaw: number) => {
    if (!originalVolume) return;
    const center: Point3D = {
      x: originalVolume.width / 2,
      y: originalVolume.height / 2,
      z: originalVolume.depth / 2,
    };
    const rotMatrix = buildRotationMatrix(newPitch, newRoll, newYaw);
    const rotated = resliceVolume(originalVolume, rotMatrix, center);
    setVolume(rotated);
    setIsAligned(true);
  }, [originalVolume]);

  const handleReset = useCallback(() => {
    if (originalVolume) {
      setVolume(originalVolume);
      setPitchDeg(0);
      setRollDeg(0);
      setYawDeg(0);
      setIsAligned(false);
      setAcPoint(null);
      setPcPoint(null);
      setStatusMessage(t('status.reset'));
    }
  }, [originalVolume]);

  const handleUploadNew = useCallback(() => {
    setVolume(null);
    setOriginalVolume(null);
    setAcPoint(null);
    setPcPoint(null);
    setPitchDeg(0);
    setRollDeg(0);
    setYawDeg(0);
    setIsAligned(false);
    setStatusMessage('');
  }, []);

  const handleExportPng = useCallback(async () => {
    if (!volume) return;
    setStatusMessage(t('status.exportPng'));
    await exportPngSnapshots(volume, axialSlice, sagittalSlice, coronalSlice, windowCenter, windowWidth);
    setStatusMessage(t('status.exportPngDone'));
    _post({ action: 'export', feature_attempted: 'png' });
  }, [volume, axialSlice, sagittalSlice, coronalSlice, windowCenter, windowWidth]);

  const handleExportDicom = useCallback(async () => {
    if (!volume) return;
    setStatusMessage(t('status.exportDicom'));
    await exportDicomZip(volume);
    setStatusMessage(t('status.exportDicomDone'));
    _post({ action: 'export', feature_attempted: 'dicom' });
  }, [volume]);

  return (
    <ErrorBoundary>
    <div className="min-h-screen flex flex-col bg-[#F8FAFC]">
      <Header hasVolume={!!volume} onUploadNew={handleUploadNew} />

      <main className="flex-1">
        <AnimatePresence mode="wait">
          {!volume ? (
            <DicomUploader
              key="uploader"
              onFilesLoaded={handleFilesLoaded}
              isLoading={isLoading}
              progress={progress}
            />
          ) : (
            <motion.div
              key="viewer"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="max-w-screen-2xl mx-auto px-4 sm:px-6 py-4"
            >
              {/* Desktop Layout */}
              <div className="hidden lg:grid lg:grid-cols-[1fr_280px] gap-4">
                <div className="space-y-4">
                  <div className="grid grid-cols-3 gap-3" style={{ minHeight: '45vh' }}>
                    <ViewerPanel
                      volume={volume}
                      viewType="axial"
                      sliceIndex={axialSlice}
                      onSliceChange={setAxialSlice}
                      windowCenter={windowCenter}
                      windowWidth={windowWidth}
                      acPoint={acPoint}
                      pcPoint={pcPoint}
                      markingMode={markingMode}
                      onMarkPoint={handleMarkPoint}
                      crosshairPosition={crosshairPosition}
                      onCrosshairChange={setCrosshairPosition}
                    />
                    <ViewerPanel
                      volume={volume}
                      viewType="sagittal"
                      sliceIndex={sagittalSlice}
                      onSliceChange={setSagittalSlice}
                      windowCenter={windowCenter}
                      windowWidth={windowWidth}
                      acPoint={acPoint}
                      pcPoint={pcPoint}
                      markingMode={markingMode}
                      onMarkPoint={handleMarkPoint}
                      crosshairPosition={crosshairPosition}
                      onCrosshairChange={setCrosshairPosition}
                    />
                    <ViewerPanel
                      volume={volume}
                      viewType="coronal"
                      sliceIndex={coronalSlice}
                      onSliceChange={setCoronalSlice}
                      windowCenter={windowCenter}
                      windowWidth={windowWidth}
                      acPoint={acPoint}
                      pcPoint={pcPoint}
                      markingMode={markingMode}
                      onMarkPoint={handleMarkPoint}
                      crosshairPosition={crosshairPosition}
                      onCrosshairChange={setCrosshairPosition}
                    />
                  </div>
                  {statusMessage && (
                    <motion.div
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-xl px-4 py-2 text-sm text-slate-600 font-mono"
                    >
                      {statusMessage}
                    </motion.div>
                  )}
                </div>
                <ControlPanel
                  acPoint={acPoint}
                  pcPoint={pcPoint}
                  markingMode={markingMode}
                  onSetMarkingMode={setMarkingMode}
                  onAutoAlign={handleAutoAlign}
                  onReset={handleReset}
                  pitchDeg={pitchDeg}
                  rollDeg={rollDeg}
                  yawDeg={yawDeg}
                  onPitchChange={(v) => { setPitchDeg(v); handleManualRotation(v, rollDeg, yawDeg); }}
                  onRollChange={(v) => { setRollDeg(v); handleManualRotation(pitchDeg, v, yawDeg); }}
                  onYawChange={(v) => { setYawDeg(v); handleManualRotation(pitchDeg, rollDeg, v); }}
                  onExportDicom={handleExportDicom}
                  onExportPng={handleExportPng}
                  isAligned={isAligned}
                  isAligning={isAligning}
                  windowCenter={windowCenter}
                  windowWidth={windowWidth}
                  onWindowCenterChange={setWindowCenter}
                  onWindowWidthChange={setWindowWidth}
                />
              </div>

              {/* Mobile / Tablet Layout */}
              <div className="lg:hidden space-y-3">
                {/* Tab bar */}
                <div className="flex rounded-xl bg-white/70 backdrop-blur-xl border border-slate-200/60 p-1 gap-1">
                  {(['axial', 'sagittal', 'coronal'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveTab(tab)}
                      className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
                        activeTab === tab
                          ? 'bg-indigo-500 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {t(`viewer.${tab}`)}
                    </button>
                  ))}
                </div>

                {/* Active view */}
                <div style={{ minHeight: '300px' }}>
                  <ViewerPanel
                    volume={volume}
                    viewType={activeTab}
                    sliceIndex={activeTab === 'axial' ? axialSlice : activeTab === 'sagittal' ? sagittalSlice : coronalSlice}
                    onSliceChange={activeTab === 'axial' ? setAxialSlice : activeTab === 'sagittal' ? setSagittalSlice : setCoronalSlice}
                    windowCenter={windowCenter}
                    windowWidth={windowWidth}
                    acPoint={acPoint}
                    pcPoint={pcPoint}
                    markingMode={markingMode}
                    onMarkPoint={handleMarkPoint}
                    crosshairPosition={crosshairPosition}
                    onCrosshairChange={setCrosshairPosition}
                  />
                </div>

                {statusMessage && (
                  <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-xl px-3 py-2 text-xs text-slate-600 font-mono">
                    {statusMessage}
                  </div>
                )}

                {/* Expandable controls */}
                <button
                  onClick={() => setShowMobileControls(!showMobileControls)}
                  className="w-full py-2 text-sm font-semibold text-slate-700 bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-xl"
                >
                  {showMobileControls ? t('mobile.hideControls') : t('mobile.showControls')}
                </button>

                <AnimatePresence>
                  {showMobileControls && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <ControlPanel
                        acPoint={acPoint}
                        pcPoint={pcPoint}
                        markingMode={markingMode}
                        onSetMarkingMode={setMarkingMode}
                        onAutoAlign={handleAutoAlign}
                        onReset={handleReset}
                        pitchDeg={pitchDeg}
                        rollDeg={rollDeg}
                        yawDeg={yawDeg}
                        onPitchChange={(v) => { setPitchDeg(v); handleManualRotation(v, rollDeg, yawDeg); }}
                        onRollChange={(v) => { setRollDeg(v); handleManualRotation(pitchDeg, v, yawDeg); }}
                        onYawChange={(v) => { setYawDeg(v); handleManualRotation(pitchDeg, rollDeg, v); }}
                        onExportDicom={handleExportDicom}
                        onExportPng={handleExportPng}
                        isAligned={isAligned}
                        isAligning={isAligning}
                        windowCenter={windowCenter}
                        windowWidth={windowWidth}
                        onWindowCenterChange={setWindowCenter}
                        onWindowWidthChange={setWindowWidth}
                      />
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      <Footer />
      <FeedbackButton />
    </div>
    </ErrorBoundary>
  );
}
