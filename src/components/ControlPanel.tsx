'use client';

import { motion } from 'framer-motion';
import * as Slider from '@radix-ui/react-slider';
import { Crosshair, RotateCcw, Compass, Download, ChevronDown } from 'lucide-react';
import { Point3D } from '@/lib/alignment';
import { useState } from 'react';

interface ControlPanelProps {
  acPoint: Point3D | null;
  pcPoint: Point3D | null;
  markingMode: 'none' | 'ac' | 'pc';
  onSetMarkingMode: (mode: 'none' | 'ac' | 'pc') => void;
  onAutoAlign: () => void;
  onReset: () => void;
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
  onPitchChange: (v: number) => void;
  onRollChange: (v: number) => void;
  onYawChange: (v: number) => void;
  onExportDicom: () => void;
  onExportPng: () => void;
  isAligned: boolean;
  isAligning: boolean;
  windowCenter: number;
  windowWidth: number;
  onWindowCenterChange: (v: number) => void;
  onWindowWidthChange: (v: number) => void;
}

function SliderControl({
  label,
  value,
  onChange,
  min,
  max,
  step,
  unit,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  step: number;
  unit?: string;
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-slate-600">{label}</span>
        <input
          type="number"
          value={Math.round(value * 10) / 10}
          onChange={(e) => onChange(Number(e.target.value))}
          className="w-16 text-xs text-right font-mono bg-slate-100 border border-slate-200 rounded px-1.5 py-0.5 text-slate-700 focus:outline-none focus:border-indigo-400"
          step={step}
          min={min}
          max={max}
        />
      </div>
      <Slider.Root
        className="relative flex items-center select-none touch-none w-full h-4"
        value={[value]}
        onValueChange={([v]) => onChange(v)}
        min={min}
        max={max}
        step={step}
      >
        <Slider.Track className="bg-slate-200 relative grow rounded-full h-1.5">
          <Slider.Range className="absolute bg-indigo-500 rounded-full h-full" />
        </Slider.Track>
        <Slider.Thumb className="block w-4 h-4 bg-white border-2 border-indigo-500 rounded-full shadow-md hover:scale-110 transition-transform focus:outline-none focus:ring-2 focus:ring-indigo-400/50" />
      </Slider.Root>
      {unit && <div className="text-[10px] text-slate-400 text-right">{unit}</div>}
    </div>
  );
}

export default function ControlPanel({
  acPoint,
  pcPoint,
  markingMode,
  onSetMarkingMode,
  onAutoAlign,
  onReset,
  pitchDeg,
  rollDeg,
  yawDeg,
  onPitchChange,
  onRollChange,
  onYawChange,
  onExportDicom,
  onExportPng,
  isAligned,
  isAligning,
  windowCenter,
  windowWidth,
  onWindowCenterChange,
  onWindowWidthChange,
}: ControlPanelProps) {
  const [showExport, setShowExport] = useState(false);
  const [showWL, setShowWL] = useState(false);

  const canAlign = acPoint !== null && pcPoint !== null;

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.3, delay: 0.1 }}
      className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 p-5 space-y-5"
    >
      {/* Landmark Marking */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <Crosshair className="w-4 h-4 text-indigo-500" />
          Landmarks
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => onSetMarkingMode(markingMode === 'ac' ? 'none' : 'ac')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              markingMode === 'ac'
                ? 'bg-emerald-500 text-white shadow-md'
                : acPoint
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-2 bg-emerald-500" />
            {acPoint ? `AC: (${acPoint.x}, ${acPoint.y}, ${acPoint.z})` : 'Mark AC Point'}
          </button>
          <button
            onClick={() => onSetMarkingMode(markingMode === 'pc' ? 'none' : 'pc')}
            className={`w-full text-left px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
              markingMode === 'pc'
                ? 'bg-amber-500 text-white shadow-md'
                : pcPoint
                  ? 'bg-amber-50 text-amber-700 border border-amber-200'
                  : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
            }`}
          >
            <span className="inline-block w-2 h-2 rounded-full mr-2 bg-amber-500" />
            {pcPoint ? `PC: (${pcPoint.x}, ${pcPoint.y}, ${pcPoint.z})` : 'Mark PC Point'}
          </button>
        </div>
      </section>

      {/* Auto Align */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <Compass className="w-4 h-4 text-indigo-500" />
          Alignment
        </h3>
        <button
          onClick={onAutoAlign}
          disabled={!canAlign || isAligning}
          className={`w-full px-4 py-2.5 rounded-lg text-sm font-semibold transition-all duration-200 shadow-sm ${
            canAlign && !isAligning
              ? 'bg-indigo-500 hover:bg-indigo-600 text-white hover:shadow-md'
              : 'bg-slate-100 text-slate-400 cursor-not-allowed'
          }`}
        >
          {isAligning ? 'Aligning...' : isAligned ? 'Re-Align to AC-PC' : 'Auto Align to AC-PC'}
        </button>
        {!canAlign && (
          <p className="text-xs text-slate-400">Mark both AC and PC points to enable alignment</p>
        )}
      </section>

      {/* Manual Rotation */}
      <section className="space-y-3">
        <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-1.5">
          <RotateCcw className="w-4 h-4 text-indigo-500" />
          Manual Rotation
        </h3>
        <div className="space-y-3">
          <SliderControl label="X (Pitch)" value={pitchDeg} onChange={onPitchChange} min={-45} max={45} step={0.1} unit="°" />
          <SliderControl label="Y (Roll)" value={rollDeg} onChange={onRollChange} min={-45} max={45} step={0.1} unit="°" />
          <SliderControl label="Z (Yaw)" value={yawDeg} onChange={onYawChange} min={-45} max={45} step={0.1} unit="°" />
        </div>
        {isAligned && (
          <button
            onClick={onReset}
            className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all duration-200"
          >
            Reset Alignment
          </button>
        )}
      </section>

      {/* Window/Level */}
      <section className="space-y-2">
        <button
          onClick={() => setShowWL(!showWL)}
          className="flex items-center justify-between w-full text-sm font-semibold text-slate-800"
        >
          <span>Window / Level</span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showWL ? 'rotate-180' : ''}`} />
        </button>
        {showWL && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-3 overflow-hidden">
            <SliderControl label="Center" value={windowCenter} onChange={onWindowCenterChange} min={-1000} max={3000} step={1} />
            <SliderControl label="Width" value={windowWidth} onChange={onWindowWidthChange} min={1} max={4000} step={1} />
          </motion.div>
        )}
      </section>

      {/* Export */}
      <section className="space-y-2">
        <button
          onClick={() => setShowExport(!showExport)}
          className="w-full flex items-center justify-between px-4 py-2.5 rounded-lg text-sm font-semibold bg-indigo-500 hover:bg-indigo-600 text-white transition-all duration-200 shadow-sm hover:shadow-md"
        >
          <span className="flex items-center gap-1.5">
            <Download className="w-4 h-4" />
            Export
          </span>
          <ChevronDown className={`w-4 h-4 transition-transform ${showExport ? 'rotate-180' : ''}`} />
        </button>
        {showExport && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="space-y-2 overflow-hidden">
            <button
              onClick={onExportDicom}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
            >
              Download DICOM (ZIP)
            </button>
            <button
              onClick={onExportPng}
              className="w-full px-3 py-2 rounded-lg text-sm font-medium bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-all"
            >
              Download PNG Snapshots
            </button>
          </motion.div>
        )}
      </section>
    </motion.div>
  );
}
