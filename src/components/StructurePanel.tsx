'use client';

import { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { Search, Eye, EyeOff } from 'lucide-react';

interface Structure {
  id: number;
  name: string;
  displayName: Record<string, string>;
  category: string;
  color: string;
  bestSlice: Record<string, number>;
  sliceRange: Record<string, number[]>;
}

interface StructurePanelProps {
  selectedStructure: Structure | null;
  onStructureSelect: (s: Structure | null) => void;
  locale: string;
  dataPath?: string;
  regionAxialRange?: [number, number];
}

const CATEGORY_LABELS: Record<string, Record<string, string>> = {
  organ: { en: 'Organs', ko: '장기' },
  bone: { en: 'Bones', ko: '뼈' },
  vessel: { en: 'Vessels', ko: '혈관' },
  muscle: { en: 'Muscles', ko: '근육' },
  cavity: { en: 'Cavities', ko: '공동' },
  gland: { en: 'Glands', ko: '분비선' },
  other: { en: 'Other', ko: '기타' },
};

interface ItemProps {
  s: Structure;
  selected: boolean;
  locale: string;
  onSelect: (s: Structure) => void;
}

// Memoized button row. With a stable onSelect (useCallback) and primitive selected/locale,
// selection change re-renders only the previously-selected + newly-selected items,
// not all 275 entries (brain-mri).
const StructureItem = memo(function StructureItem({ s, selected, locale, onSelect }: ItemProps) {
  const enName = s.displayName.en || s.name.replace(/_/g, ' ');
  const localName = locale !== 'en' && s.displayName[locale] ? s.displayName[locale] : null;
  return (
    <button
      onClick={() => onSelect(s)}
      className={`w-full text-left flex items-center gap-2 px-2 py-1.5 rounded-lg text-xs transition-all ${
        selected ? 'bg-indigo-100 text-indigo-800 font-medium' : 'text-slate-700 hover:bg-slate-100'
      }`}
    >
      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: s.color }} />
      <div className="min-w-0 flex-1">
        <span className="block truncate">{enName}</span>
        {localName && <span className="block truncate text-[10px] text-slate-400">{localName}</span>}
      </div>
    </button>
  );
});

export default function StructurePanel({ selectedStructure, onStructureSelect, locale, dataPath = '/data/chest-ct', regionAxialRange }: StructurePanelProps) {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${dataPath}/structures.json`)
      .then(r => r.json())
      .then(d => setStructures(d.structures));
  }, [dataPath]);

  // Filter structures by region first
  const regionStructures = useMemo(() => {
    if (!regionAxialRange) return structures;
    const [rMin, rMax] = regionAxialRange;
    return structures.filter(s => {
      const range = s.sliceRange?.axial;
      if (!range) return false;
      // Structure overlaps with region if its range intersects
      return range[0] <= rMax && range[1] >= rMin;
    });
  }, [structures, regionAxialRange]);

  // Precompute lowercase haystack per structure once — avoids re-allocating
  // arrays + toLowerCase calls on every keystroke (275 structs × 8 strings).
  const searchIndex = useMemo(() => regionStructures.map(s => ({
    s,
    haystack: (
      s.name.replace(/_/g, ' ') + ' ' +
      Object.values(s.displayName).filter(Boolean).join(' ')
    ).toLowerCase(),
  })), [regionStructures]);

  const filtered = useMemo(() => {
    if (!search.trim()) return regionStructures;
    const tokens = search.toLowerCase().split(/\s+/).filter(Boolean);
    const out: Structure[] = [];
    for (const { s, haystack } of searchIndex) {
      let ok = true;
      for (const t of tokens) { if (!haystack.includes(t)) { ok = false; break; } }
      if (ok) out.push(s);
    }
    return out;
  }, [searchIndex, regionStructures, search]);

  const grouped = useMemo(() => {
    const groups: Record<string, Structure[]> = {};
    for (const s of filtered) {
      const cat = s.category;
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(s);
    }
    return groups;
  }, [filtered]);

  const getEnName = (s: Structure) =>
    s.displayName.en || s.name.replace(/_/g, ' ');

  const getLocalName = (s: Structure) =>
    locale !== 'en' && s.displayName[locale] ? s.displayName[locale] : null;

  // Stable reference so memoized items don't re-render just because parent re-renders.
  const stableSelect = useCallback((s: Structure) => onStructureSelect(s), [onStructureSelect]);

  return (
    <div className="bg-white/70 backdrop-blur-xl border border-slate-200/60 rounded-2xl shadow-lg shadow-slate-200/50 flex flex-col overflow-hidden" style={{ maxHeight: '80vh' }}>
      {/* Search */}
      <div className="p-3 border-b border-slate-200/60">
        <div className="relative">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anatomy..."
            className="w-full pl-8 pr-3 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:border-indigo-400 focus:bg-white transition-colors"
          />
        </div>
      </div>

      {/* Selected structure info */}
      {selectedStructure && (
        <div className="p-3 border-b border-slate-200/60 bg-indigo-50/50">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full flex-shrink-0" style={{ backgroundColor: selectedStructure.color }} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-semibold text-slate-800 block truncate">
                {getEnName(selectedStructure)}
              </span>
              {getLocalName(selectedStructure) && (
                <span className="text-xs text-slate-500 block truncate">
                  {getLocalName(selectedStructure)}
                </span>
              )}
            </div>
            <button
              onClick={() => onStructureSelect(null)}
              className="ml-auto text-xs text-slate-400 hover:text-slate-600 flex-shrink-0"
            >
              ✕
            </button>
          </div>
          <div className="mt-1 text-xs text-slate-400">
            {selectedStructure.category}
          </div>
        </div>
      )}

      {/* Structure list */}
      <div className="flex-1 overflow-y-auto p-2">
        {Object.entries(grouped).map(([cat, items]) => (
          <div key={cat} className="mb-2">
            <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-2 py-1">
              {CATEGORY_LABELS[cat]?.[locale] || CATEGORY_LABELS[cat]?.en || cat} ({items.length})
            </div>
            {items.map(s => (
              <StructureItem
                key={s.id}
                s={s}
                selected={selectedStructure?.id === s.id}
                locale={locale}
                onSelect={stableSelect}
              />
            ))}
          </div>
        ))}
        {filtered.length === 0 && (
          <div className="text-center text-xs text-slate-400 py-4">
            {search.trim()
              ? `No structures matching "${search.trim()}"`
              : 'Type a name to search (e.g. "liver", "femur")'}
          </div>
        )}
      </div>
    </div>
  );
}
