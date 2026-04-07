'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

type Plane = 'axial' | 'sagittal' | 'coronal';

interface AtlasInfo {
  planes: Record<Plane, { slices: number }>;
}

interface Structure {
  id: number;
  name: string;
  displayName: Record<string, string>;
  category: string;
  color: string;
  bestSlice: Record<Plane, number>;
  sliceRange: Record<Plane, number[]>;
}

interface SliceLabel {
  id: number;
  name: string;
  contours: number[][][];
}

interface AtlasViewerProps {
  onStructureSelect?: (structure: Structure | null) => void;
  selectedStructure?: Structure | null;
  locale: string;
  dataPath?: string;
  regionAxialRange?: [number, number];
  regionDefaultSlice?: number;
  forceAxial?: number;
}

export default function AtlasViewer({
  onStructureSelect, selectedStructure, locale,
  dataPath = '/data/chest-ct', regionAxialRange, regionDefaultSlice, forceAxial,
}: AtlasViewerProps) {
  const [info, setInfo] = useState<AtlasInfo | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [activeTab, setActiveTab] = useState<Plane>('axial');
  const [sliceIndices, setSliceIndices] = useState<Record<Plane, number>>({ axial: 0, sagittal: 0, coronal: 0 });
  const [labels, setLabels] = useState<SliceLabel[]>([]);
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement>(null);

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    fetch(`${dataPath}/info.json`).then(r => r.json()).then(setInfo);
    fetch(`${dataPath}/structures.json`).then(r => r.json())
      .then((d: { structures: Structure[] }) => setStructures(d.structures));
  }, [dataPath]);

  useEffect(() => {
    if (!info) return;
    setSliceIndices({
      axial: regionDefaultSlice ?? Math.floor(info.planes.axial.slices / 2),
      sagittal: Math.floor(info.planes.sagittal.slices / 2),
      coronal: Math.floor(info.planes.coronal.slices / 2),
    });
  }, [info, regionDefaultSlice]);

  useEffect(() => {
    if (regionDefaultSlice != null) {
      setActiveTab('axial');
      setSliceIndices(prev => ({ ...prev, axial: regionDefaultSlice }));
    }
  }, [forceAxial]);

  const currentSlice = sliceIndices[activeTab];
  const minSlice = activeTab === 'axial' && regionAxialRange ? regionAxialRange[0] : 0;
  const maxSlice = activeTab === 'axial' && regionAxialRange
    ? regionAxialRange[1]
    : info ? info.planes[activeTab].slices - 1 : 0;

  const imagePath = info
    ? `${dataPath}/${activeTab}/${String(currentSlice).padStart(4, '0')}.png`
    : '';

  // Load labels
  useEffect(() => {
    if (!info) return;
    const padded = String(currentSlice).padStart(4, '0');
    fetch(`${dataPath}/labels/${activeTab}/${padded}.json`)
      .then(r => r.ok ? r.json() : [])
      .then(setLabels)
      .catch(() => setLabels([]));
  }, [activeTab, currentSlice, info, dataPath]);

  // Jump to structure's best slice
  useEffect(() => {
    if (!selectedStructure) return;
    setSliceIndices({
      axial: selectedStructure.bestSlice.axial,
      sagittal: selectedStructure.bestSlice.sagittal,
      coronal: selectedStructure.bestSlice.coronal,
    });
  }, [selectedStructure]);

  // ── Navigation ────────────────────────────────────────────────────────────
  const navigate = useCallback((delta: number) => {
    setSliceIndices(prev => ({
      ...prev,
      [activeTab]: Math.max(minSlice, Math.min(maxSlice, prev[activeTab] + delta)),
    }));
  }, [activeTab, minSlice, maxSlice]);

  // Wheel (passive: false to prevent page scroll)
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      navigate(e.deltaY > 0 ? 1 : -1);
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [navigate]);

  // Keyboard
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;
      if (e.key === 'ArrowUp' || e.key === 'ArrowLeft') { e.preventDefault(); navigate(-1); }
      else if (e.key === 'ArrowDown' || e.key === 'ArrowRight') { e.preventDefault(); navigate(1); }
      else if (e.key === 'Escape') onStructureSelect?.(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [navigate, onStructureSelect]);

  // ── SVG hover/click ───────────────────────────────────────────────────────
  const handleSvgMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!imgNatural || labels.length === 0) { setHoveredStructure(null); setTooltipPos(null); return; }
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * imgNatural.w;
    const y = (e.clientY - rect.top) / rect.height * imgNatural.h;

    let found: string | null = null;
    for (const label of labels) {
      for (const contour of label.contours) {
        if (isPointInPolygon(x, y, contour)) { found = label.name; break; }
      }
      if (found) break;
    }
    setHoveredStructure(found);
    if (found) {
      const rawX = e.clientX - rect.left + 12;
      const rawY = e.clientY - rect.top - 8;
      setTooltipPos({ x: Math.max(0, Math.min(rawX, rect.width - 240)), y: Math.max(0, rawY < 32 ? rawY + 32 : rawY) });
    } else {
      setTooltipPos(null);
    }
  }, [imgNatural, labels]);

  const handleSvgClick = useCallback(() => {
    if (hoveredStructure) {
      onStructureSelect?.(structures.find(s => s.name === hoveredStructure) || null);
    }
  }, [hoveredStructure, structures, onStructureSelect]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const hasSelection = !!selectedStructure || !!hoveredStructure;

  const contourPath = (contour: number[][]) =>
    contour.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join('') + 'Z';

  const hoveredStruct = structures.find(s => s.name === hoveredStructure);

  return (
    <div className="space-y-3">
      {/* Plane tabs */}
      <div className="flex rounded-xl bg-white/70 backdrop-blur-xl border border-slate-200/60 p-1 gap-1">
        {(['axial', 'sagittal', 'coronal'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {/* Viewer */}
      <div
        ref={containerRef}
        className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-crosshair focus:outline-none focus:ring-2 focus:ring-indigo-500/50"
        tabIndex={0}
      >
        {/* Slice info */}
        <div className="absolute top-2 left-2 z-10 text-xs font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </div>
        <div className="absolute top-2 right-2 z-10 text-xs font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
          {currentSlice - minSlice + 1}/{maxSlice - minSlice + 1}
        </div>
        <div className="absolute bottom-2 left-2 z-10 text-[10px] font-mono text-white/30 bg-black/30 px-2 py-0.5 rounded hidden sm:block">
          Arrow keys / scroll to navigate
        </div>

        {/* Image + SVG overlay — both inside a shrink-wrapped container */}
        <div className="flex justify-center" style={{ maxHeight: 'calc(100vh - 280px)' }}>
          <div className="relative" style={{ lineHeight: 0, maxHeight: 'calc(100vh - 280px)' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              ref={imgRef}
              src={imagePath}
              alt={`${activeTab} slice ${currentSlice}`}
              style={{ display: 'block', maxHeight: 'calc(100vh - 280px)', maxWidth: '100%', width: 'auto', height: 'auto' }}
              onLoad={(e) => {
                const el = e.currentTarget;
                setImgNatural({ w: el.naturalWidth, h: el.naturalHeight });
              }}
              draggable={false}
            />

            {/* SVG fills the same space as img — lineHeight:0 prevents baseline gap */}
            {showOverlay && imgNatural && labels.length > 0 && (
              <svg
                viewBox={`0 0 ${imgNatural.w} ${imgNatural.h}`}
                preserveAspectRatio="none"
                style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                onMouseMove={handleSvgMove}
                onMouseLeave={() => { setHoveredStructure(null); setTooltipPos(null); }}
                onClick={handleSvgClick}
              >
              {labels.map((label) => {
                const struct = structures.find(s => s.id === label.id);
                if (!struct) return null;
                const isActive = hoveredStructure === label.name || selectedStructure?.name === label.name;
                const fillOpacity = isActive ? 0.40 : hasSelection ? 0.05 : 0.22;
                const strokeOpacity = isActive ? 1.0 : hasSelection ? 0.20 : 0.55;
                const strokeW = isActive ? 2.5 : 1;

                return label.contours.map((contour, ci) => {
                  if (contour.length < 3) return null;
                  const d = contourPath(contour);
                  return (
                    <g key={`${label.id}-${ci}`}>
                      <path d={d} fill={struct.color} fillOpacity={fillOpacity} stroke="none" />
                      <path d={d} fill="none" stroke={struct.color} strokeOpacity={strokeOpacity} strokeWidth={strokeW} />
                    </g>
                  );
                });
              })}
            </svg>
          )}
          </div>
        </div>

        {/* Tooltip */}
        {hoveredStruct && tooltipPos && (
          <div
            className="absolute z-20 pointer-events-none bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <span style={{ color: hoveredStruct.color }}>●</span>{' '}
            {hoveredStruct.displayName.en || hoveredStruct.name.replace(/_/g, ' ')}
            {locale !== 'en' && hoveredStruct.displayName[locale] && (
              <span className="text-white/60 ml-1">({hoveredStruct.displayName[locale]})</span>
            )}
            <span className="text-white/50 ml-1.5">{hoveredStruct.category}</span>
          </div>
        )}
      </div>

      {/* Slice slider */}
      <div className="flex items-center gap-3 px-1">
        <input
          type="range"
          min={minSlice}
          max={maxSlice}
          value={currentSlice}
          onChange={(e) => setSliceIndices(prev => ({ ...prev, [activeTab]: Number(e.target.value) }))}
          className="flex-1 h-1.5 bg-slate-200 rounded-full appearance-none cursor-pointer accent-indigo-500"
        />
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
            showOverlay ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          Labels
        </button>
      </div>
    </div>
  );
}

function isPointInPolygon(x: number, y: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) {
      inside = !inside;
    }
  }
  return inside;
}
