'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { createLogger, loggedFetch } from '@/lib/logger';

const log = createLogger('AtlasViewer');

// Increment to force CDN cache refresh
const CACHE_V = 'v3';

type Plane = string;

interface AtlasInfo {
  planes: Record<string, { slices: number }>;
}

interface Structure {
  id: number;
  name: string;
  displayName: Record<string, string>;
  category: string;
  color: string;
  bestSlice: Record<string, number>;
  sliceRange: Record<string, number[]>;
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
  planes?: string[];
  defaultPlane?: string;
}

export default function AtlasViewer({
  onStructureSelect, selectedStructure, locale,
  dataPath = '/data/chest-ct', regionAxialRange, regionDefaultSlice, forceAxial,
  planes: planesProp, defaultPlane,
}: AtlasViewerProps) {
  const [info, setInfo] = useState<AtlasInfo | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [activeTab, setActiveTab] = useState<Plane>(defaultPlane || 'axial');
  const [sliceIndices, setSliceIndices] = useState<Record<string, number>>({});
  const [labels, setLabels] = useState<SliceLabel[]>([]);
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);
  const [imgNatural, setImgNatural] = useState<{ w: number; h: number } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);

  // Derive available planes from info or prop
  const availablePlanes = planesProp || (info ? Object.keys(info.planes) : ['axial', 'sagittal', 'coronal']);
  const firstPlane = defaultPlane || availablePlanes[0] || 'axial';

  // ── Data loading ──────────────────────────────────────────────────────────
  useEffect(() => {
    log.info('loading atlas data', { dataPath });
    let cancelled = false;

    (async () => {
      try {
        const res = await loggedFetch(log, `${dataPath}/info.json?${CACHE_V}`);
        if (!res.ok) return;
        const data = await res.json() as AtlasInfo;
        if (cancelled) return;
        log.debug('info.json loaded', { planes: Object.keys(data.planes) });
        setInfo(data);
      } catch (e) {
        log.error('failed to load info.json', e, { dataPath });
      }
    })();

    (async () => {
      try {
        const res = await loggedFetch(log, `${dataPath}/structures.json?${CACHE_V}`);
        if (!res.ok) return;
        const data = await res.json() as { structures: Structure[] };
        if (cancelled) return;
        log.debug('structures.json loaded', { count: data.structures?.length });
        setStructures(data.structures);
      } catch (e) {
        log.error('failed to load structures.json', e, { dataPath });
      }
    })();

    return () => { cancelled = true; };
  }, [dataPath]);

  useEffect(() => {
    if (!info) return;
    const indices: Record<string, number> = {};
    for (const [plane, cfg] of Object.entries(info.planes)) {
      indices[plane] = plane === firstPlane && regionDefaultSlice != null
        ? regionDefaultSlice
        : Math.floor(cfg.slices / 2);
    }
    setSliceIndices(indices);
    if (!availablePlanes.includes(activeTab)) {
      setActiveTab(firstPlane);
    }
  }, [info, regionDefaultSlice]);

  useEffect(() => {
    if (regionDefaultSlice != null) {
      setActiveTab(firstPlane);
      setSliceIndices(prev => ({ ...prev, [firstPlane]: regionDefaultSlice }));
    }
  }, [forceAxial]);

  const currentSlice = sliceIndices[activeTab] ?? 0;
  const minSlice = (activeTab === 'axial' || activeTab === firstPlane) && regionAxialRange ? regionAxialRange[0] : 0;
  const maxSlice = (activeTab === 'axial' || activeTab === firstPlane) && regionAxialRange
    ? regionAxialRange[1]
    : info?.planes[activeTab] ? info.planes[activeTab].slices - 1 : 0;

  const imagePath = info
    ? `${dataPath}/${activeTab}/${String(currentSlice).padStart(4, '0')}.png?${CACHE_V}`
    : '';

  // Load labels for current slice — aborts stale fetches so fast scrubs
  // don't let an older response clobber the current slice's labels.
  useEffect(() => {
    if (!info) return;
    const padded = String(currentSlice).padStart(4, '0');
    const url = `${dataPath}/labels/${activeTab}/${padded}.json?${CACHE_V}`;
    const ctrl = new AbortController();
    fetch(url, { signal: ctrl.signal })
      .then(r => {
        if (!r.ok) {
          log.warn('label fetch returned non-OK', { url, status: r.status });
          return [];
        }
        return r.json();
      })
      .then(setLabels)
      .catch((e) => {
        if (e?.name === 'AbortError') return;
        log.fetchError(url, e, { plane: activeTab, slice: currentSlice });
        setLabels([]);
      });
    return () => ctrl.abort();
  }, [activeTab, currentSlice, info, dataPath]);

  // Prefetch adjacent slices (±1) — warms HTTP cache so scrubbing is smooth.
  // Both image + labels since labels block overlay render.
  useEffect(() => {
    if (!info || typeof window === 'undefined') return;
    const handle = window.requestIdleCallback
      ? window.requestIdleCallback(() => prefetch(), { timeout: 500 })
      : window.setTimeout(prefetch, 0);

    function prefetch() {
      for (const delta of [-1, 1]) {
        const target = currentSlice + delta;
        if (target < minSlice || target > maxSlice) continue;
        const padded = String(target).padStart(4, '0');
        const imgUrl = `${dataPath}/${activeTab}/${padded}.png?${CACHE_V}`;
        const labelUrl = `${dataPath}/labels/${activeTab}/${padded}.json?${CACHE_V}`;
        // Image: new Image().src hits the browser cache
        const img = new Image();
        img.src = imgUrl;
        // Label: fetch with default cache — drop the body, HTTP cache is enough
        fetch(labelUrl).then(r => { if (r.ok) return r.text(); }).catch(() => {});
      }
    }

    return () => {
      if (window.cancelIdleCallback && typeof handle === 'number') {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, [activeTab, currentSlice, info, dataPath, minSlice, maxSlice]);

  // Jump to structure's best slice
  useEffect(() => {
    if (!selectedStructure) return;
    setSliceIndices(prev => {
      const next = { ...prev };
      for (const plane of availablePlanes) {
        if (selectedStructure.bestSlice[plane] != null) {
          next[plane] = selectedStructure.bestSlice[plane];
        }
      }
      return next;
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

  // ── Structure lookup maps (O(1) hot-path access) ──────────────────────────
  const structuresById = useMemo(() => {
    const m = new Map<number, Structure>();
    for (const s of structures) m.set(s.id, s);
    return m;
  }, [structures]);

  const structuresByName = useMemo(() => {
    const m = new Map<string, Structure>();
    for (const s of structures) m.set(s.name, s);
    return m;
  }, [structures]);

  // Precompute bboxes + SVG path strings once per label-set. Both are pure
  // functions of contour points that don't change unless labels change,
  // so re-hovering shouldn't pay to rebuild them on every React render.
  const labelIndex = useMemo(() => labels.map(l => ({
    label: l,
    bboxes: l.contours.map(contourBBox),
    paths: l.contours.map(c => c.length < 3 ? null : contourPath(c)),
  })), [labels]);

  // ── SVG hover/click ───────────────────────────────────────────────────────
  const handleSvgMove = useCallback((e: React.MouseEvent<SVGSVGElement>) => {
    if (!imgNatural || labelIndex.length === 0) { setHoveredStructure(null); setTooltipPos(null); return; }
    const svg = e.currentTarget;
    const rect = svg.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width * imgNatural.w;
    const y = (e.clientY - rect.top) / rect.height * imgNatural.h;

    let found: string | null = null;
    for (const { label, bboxes } of labelIndex) {
      const contours = label.contours;
      for (let ci = 0; ci < contours.length; ci++) {
        const b = bboxes[ci];
        if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
        if (isPointInPolygon(x, y, contours[ci])) { found = label.name; break; }
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
  }, [imgNatural, labelIndex]);

  const handleSvgClick = useCallback(() => {
    if (hoveredStructure) {
      onStructureSelect?.(structuresByName.get(hoveredStructure) || null);
    }
  }, [hoveredStructure, structuresByName, onStructureSelect]);

  // ── Render helpers ────────────────────────────────────────────────────────
  const hasSelection = !!selectedStructure || !!hoveredStructure;

  const contourPath = (contour: number[][]) =>
    contour.map((p, i) => `${i === 0 ? 'M' : 'L'}${p[0]},${p[1]}`).join('') + 'Z';

  const hoveredStruct = hoveredStructure ? structuresByName.get(hoveredStructure) : undefined;

  return (
    <div className="space-y-3">
      {/* Plane tabs */}
      <div className="flex rounded-xl bg-white/70 backdrop-blur-xl border border-slate-200/60 p-1 gap-1">
        {availablePlanes.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`flex-1 py-2 text-sm font-medium rounded-lg transition-all ${
              activeTab === tab ? 'bg-indigo-500 text-white shadow-sm' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {tab === 'ap' ? 'AP' : tab.charAt(0).toUpperCase() + tab.slice(1)}
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
          {activeTab === 'ap' ? 'AP' : activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </div>
        <div className="absolute top-2 right-2 z-10 text-xs font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
          {currentSlice - minSlice + 1}/{maxSlice - minSlice + 1}
        </div>
        <div className="absolute bottom-2 left-2 z-10 text-[10px] font-mono text-white/30 bg-black/30 px-2 py-0.5 rounded hidden sm:block">
          Arrow keys / scroll to navigate
        </div>

        {/* Image + SVG overlay */}
        <div style={{ textAlign: 'center' }}>
        <div style={{ display: 'inline-block', position: 'relative', lineHeight: 0, fontSize: 0, verticalAlign: 'top' }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imagePath}
              alt={`Cross-sectional anatomy ${activeTab} view, slice ${currentSlice - minSlice + 1} of ${maxSlice - minSlice + 1}`}
              style={{ display: 'block', maxHeight: 'calc(100vh - 280px)', maxWidth: '100%', width: 'auto', height: 'calc(100vh - 280px)' }}
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
              {labelIndex.map(({ label, paths }) => {
                const struct = structuresById.get(label.id);
                if (!struct) return null;
                const isActive = hoveredStructure === label.name || selectedStructure?.name === label.name;
                const fillOpacity = isActive ? 0.40 : hasSelection ? 0.05 : 0.22;
                const strokeOpacity = isActive ? 1.0 : hasSelection ? 0.20 : 0.55;
                const strokeW = isActive ? 2.5 : 1;

                return paths.map((d, ci) => {
                  if (d === null) return null;
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

// [minX, minY, maxX, maxY]
function contourBBox(polygon: number[][]): [number, number, number, number] {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  for (let i = 0; i < polygon.length; i++) {
    const p = polygon[i];
    if (p[0] < minX) minX = p[0];
    if (p[0] > maxX) maxX = p[0];
    if (p[1] < minY) minY = p[1];
    if (p[1] > maxY) maxY = p[1];
  }
  return [minX, minY, maxX, maxY];
}
