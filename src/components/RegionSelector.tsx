'use client';

import { Lock } from 'lucide-react';

export type BodyRegion =
  | 'head_neck' | 'chest' | 'abdomen' | 'pelvis'
  | 'our_head' | 'our_chest' | 'our_abdomen' | 'our_pelvis' | 'our_brain_mri' | 'lumbar_mri' | 'our_xray'
  | 'our_hand_xray' | 'our_foot_xray';

interface RegionConfig {
  id: BodyRegion;
  label: string;
  labelKo: string;
  icon: string;
  dataPath: string;
  axialRange?: [number, number];
  defaultSlice: number;
  free: boolean;
  group: 'original' | 'spinai';
}

export const BODY_REGIONS: RegionConfig[] = [
  // ── Original atlas ──
  {
    id: 'head_neck', label: 'Head & Neck', labelKo: '머리/목', icon: '🧠',
    dataPath: '/data/head-ct', defaultSlice: 100, free: true, group: 'original',
  },
  {
    id: 'chest', label: 'Chest', labelKo: '흉부', icon: '🫁',
    dataPath: '/data/chest-ct', axialRange: [200, 405], defaultSlice: 320, free: true, group: 'original',
  },
  {
    id: 'abdomen', label: 'Abdomen', labelKo: '복부', icon: '🫀',
    dataPath: '/data/chest-ct', axialRange: [80, 200], defaultSlice: 160, free: true, group: 'original',
  },
  {
    id: 'pelvis', label: 'Pelvis', labelKo: '골반', icon: '🦴',
    dataPath: '/data/chest-ct', axialRange: [0, 80], defaultSlice: 40, free: true, group: 'original',
  },
  // ── SPINAI atlas ──
  {
    id: 'our_head', label: 'Head CT', labelKo: '두부 CT', icon: '🧠',
    dataPath: '/data/our-head-ct', defaultSlice: 116, free: true, group: 'spinai',
  },
  {
    id: 'our_chest', label: 'Chest CT', labelKo: '흉부 CT', icon: '🫁',
    dataPath: '/data/our-ct', axialRange: [260, 428], defaultSlice: 350, free: true, group: 'spinai',
  },
  {
    id: 'our_abdomen', label: 'Abdomen CT', labelKo: '복부 CT', icon: '🫀',
    dataPath: '/data/our-ct', axialRange: [120, 260], defaultSlice: 200, free: true, group: 'spinai',
  },
  {
    id: 'our_pelvis', label: 'Pelvis CT', labelKo: '골반 CT', icon: '🦴',
    dataPath: '/data/our-ct', axialRange: [0, 120], defaultSlice: 60, free: true, group: 'spinai',
  },
  {
    id: 'our_brain_mri', label: 'Brain MRI', labelKo: '뇌 MRI', icon: '🧲',
    dataPath: '/data/brain-mri-commercial', defaultSlice: 128, free: true, group: 'spinai',
  },
  {
    id: 'lumbar_mri', label: 'Lumbar MRI', labelKo: '요추 MRI', icon: '💿',
    dataPath: '/data/our-lumbar-mri', defaultSlice: 25, free: true, group: 'spinai',
  },
  {
    id: 'our_xray', label: 'Spine X-ray', labelKo: '척추 X-ray', icon: '📷',
    dataPath: '/data/our-xray', defaultSlice: 0, free: true, group: 'spinai',
  },
  {
    id: 'our_hand_xray', label: 'Hand X-ray', labelKo: '손 X-ray', icon: '✋',
    dataPath: '/data/our-hand-xray', defaultSlice: 0, free: true, group: 'spinai',
  },
  {
    id: 'our_foot_xray', label: 'Foot X-ray', labelKo: '발 X-ray', icon: '🦶',
    dataPath: '/data/our-foot-xray', defaultSlice: 0, free: true, group: 'spinai',
  },
];

interface RegionSelectorProps {
  activeRegion: BodyRegion;
  onRegionSelect: (region: BodyRegion) => void;
  locale: string;
  isAuthenticated: boolean;
}

// Split once at module load — BODY_REGIONS is immutable.
const ORIGINAL_REGIONS = BODY_REGIONS.filter(r => r.group === 'original');
const SPINAI_REGIONS = BODY_REGIONS.filter(r => r.group === 'spinai');

export default function RegionSelector({ activeRegion, onRegionSelect, locale, isAuthenticated }: RegionSelectorProps) {
  const getLabel = (r: RegionConfig) => locale === 'ko' ? r.labelKo : r.label;

  const renderRow = (regions: RegionConfig[]) => (
    <div className="flex rounded-xl bg-white/70 backdrop-blur-xl border border-slate-200/60 p-1 gap-1">
      {regions.map((region) => {
        const locked = !region.free && !isAuthenticated;
        return (
          <button
            key={region.id}
            onClick={() => onRegionSelect(region.id)}
            aria-label={region.label}
            aria-pressed={activeRegion === region.id}
            className={`flex-1 py-2 text-xs sm:text-sm font-medium rounded-lg transition-all flex items-center justify-center gap-1 ${
              activeRegion === region.id
                ? 'bg-indigo-500 text-white shadow-sm'
                : locked
                  ? 'text-slate-400 hover:bg-slate-50'
                  : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            <span className="hidden sm:inline">{region.icon}</span>
            <span>{getLabel(region)}</span>
            {locked && <Lock className="w-3 h-3 ml-0.5 opacity-60" />}
          </button>
        );
      })}
    </div>
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider whitespace-nowrap">Original</span>
        {renderRow(ORIGINAL_REGIONS)}
      </div>
      <div className="flex items-center gap-2">
        <span className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider whitespace-nowrap">SPINAI</span>
        {renderRow(SPINAI_REGIONS)}
      </div>
    </div>
  );
}
