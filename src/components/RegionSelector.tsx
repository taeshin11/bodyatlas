'use client';

import { Lock } from 'lucide-react';

export type BodyRegion = 'chest' | 'head_neck' | 'abdomen' | 'pelvis' | 'brain_mri' | 'brain_pet' | 'spine_xray';

interface RegionConfig {
  id: BodyRegion;
  label: string;
  labelKo: string;
  icon: string;
  dataPath: string;
  axialRange?: [number, number];
  defaultSlice: number;
  free: boolean;
}

export const BODY_REGIONS: RegionConfig[] = [
  {
    id: 'head_neck',
    label: 'Head & Neck',
    labelKo: '머리/목',
    icon: '🧠',
    dataPath: '/data/head-ct',
    defaultSlice: 100,
    free: true,
  },
  {
    id: 'chest',
    label: 'Chest',
    labelKo: '흉부',
    icon: '🫁',
    dataPath: '/data/chest-ct',
    axialRange: [200, 405],
    defaultSlice: 320,
    free: true,
  },
  {
    id: 'abdomen',
    label: 'Abdomen',
    labelKo: '복부',
    icon: '🫀',
    dataPath: '/data/chest-ct',
    axialRange: [80, 200],
    defaultSlice: 160,
    free: true,
  },
  {
    id: 'pelvis',
    label: 'Pelvis',
    labelKo: '골반',
    icon: '🦴',
    dataPath: '/data/chest-ct',
    axialRange: [0, 80],
    defaultSlice: 40,
    free: true,
  },
  {
    id: 'brain_mri',
    label: 'Brain MRI',
    labelKo: '뇌 MRI',
    icon: '🧲',
    dataPath: '/data/brain-mri',
    defaultSlice: 91,
    free: true,
  },
  {
    id: 'brain_pet',
    label: 'Brain PET',
    labelKo: '뇌 PET',
    icon: '☢️',
    dataPath: '/data/brain-pet',
    defaultSlice: 23,
    free: true,
  },
  {
    id: 'spine_xray',
    label: 'Spine X-ray',
    labelKo: '척추 X선',
    icon: '🦴',
    dataPath: '/data/spine-xray',
    defaultSlice: 0,
    free: true,
  },
];

interface RegionSelectorProps {
  activeRegion: BodyRegion;
  onRegionSelect: (region: BodyRegion) => void;
  locale: string;
  isAuthenticated: boolean;
}

export default function RegionSelector({ activeRegion, onRegionSelect, locale, isAuthenticated }: RegionSelectorProps) {
  const getLabel = (r: RegionConfig) => {
    if (locale === 'ko') return r.labelKo;
    return r.label;
  };

  return (
    <div className="flex rounded-xl bg-white/70 backdrop-blur-xl border border-slate-200/60 p-1 gap-1">
      {BODY_REGIONS.map((region) => {
        const locked = !region.free && !isAuthenticated;
        return (
          <button
            key={region.id}
            onClick={() => onRegionSelect(region.id)}
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
}
