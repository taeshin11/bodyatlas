'use client';

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion } from 'framer-motion';
import { createLogger, loggedFetch } from '@/lib/logger';

const log = createLogger('SpineXrayViewer');

// Parity with AtlasViewer — /data/:path* is served `max-age=31536000 immutable`,
// so we bust the browser cache with a version query string on every asset URL.
// Bump when the X-ray atlas content changes shape.
const CACHE_V = 'v1';

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

interface SpineXrayViewerProps {
  onStructureSelect?: (structure: Structure | null) => void;
  selectedStructure?: Structure | null;
  locale: string;
  dataPath?: string;
  // Quiz Hard mode parity with AtlasViewer (R28). When true, suppress all
  // canvas overlay rendering, hover tooltip, and the Labels toggle button.
  forceHideOverlay?: boolean;
}

type XrayView = 'lateral' | 'ap';

const VIEW_LABELS: Record<XrayView, { en: string; ko: string }> = {
  lateral: { en: 'Lateral', ko: '측면' },
  ap:      { en: 'AP',      ko: '전후면' },
};

export default function SpineXrayViewer({ onStructureSelect, selectedStructure, locale, dataPath = '/data/our-xray', forceHideOverlay }: SpineXrayViewerProps) {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [labels, setLabels] = useState<Record<XrayView, SliceLabel[]>>({ lateral: [], ap: [] });
  const [availableViews, setAvailableViews] = useState<XrayView[]>(['lateral', 'ap']);
  const [caseCount, setCaseCount] = useState(1);
  const [caseIndex, setCaseIndex] = useState(0);
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number; view: XrayView } | null>(null);

  const canvasRefs = useRef<Record<XrayView, HTMLCanvasElement | null>>({ lateral: null, ap: null });
  const imgRefs   = useRef<Record<XrayView, HTMLImageElement | null>>({ lateral: null, ap: null });

  // Load structures
  useEffect(() => {
    log.info('loading X-ray atlas', { dataPath });
    let cancelled = false;
    (async () => {
      try {
        const res = await loggedFetch(log, `${dataPath}/structures.json?${CACHE_V}`);
        if (!res.ok) return;
        const d = await res.json() as { structures: Structure[] };
        if (cancelled) return;
        log.debug('structures loaded', { count: d.structures?.length });
        setStructures(d.structures);
      } catch (e) {
        log.error('failed to load X-ray structures.json', e, { dataPath });
      }
    })();
    (async () => {
      try {
        const res = await loggedFetch(log, `${dataPath}/info.json?${CACHE_V}`);
        if (!res.ok) return;
        const info = await res.json() as { planes?: Record<string, { slices?: number }> };
        if (cancelled) return;
        const planes = info.planes || {};
        const views = Object.keys(planes).filter(
          (k): k is XrayView => k === 'ap' || k === 'lateral',
        );
        if (views.length) {
          log.debug('views detected', { views });
          setAvailableViews(views);
        }
        const counts = views.map(v => planes[v]?.slices ?? 1);
        const minCount = counts.length ? Math.min(...counts) : 1;
        setCaseCount(Math.max(1, minCount));
        setCaseIndex(0);
      } catch (e) {
        log.error('failed to load X-ray info.json', e, { dataPath });
      }
    })();
    return () => { cancelled = true; };
  }, [dataPath]);

  // Load images and labels for available views only
  useEffect(() => {
    const caseId = String(caseIndex).padStart(4, '0');
    availableViews.forEach(view => {
      const img = new Image();
      const url = `${dataPath}/${view}/${caseId}.png?${CACHE_V}`;
      img.onload = () => {
        log.debug(`image loaded: ${view}`, { url, caseIndex, width: img.naturalWidth, height: img.naturalHeight });
        imgRefs.current[view] = img;
        renderView(view);
      };
      img.onerror = () => {
        log.error(`image failed to load: ${view}`, undefined, { url, caseIndex });
      };
      img.src = url;
    });

    const ctrls: AbortController[] = [];
    availableViews.forEach(view => {
      const url = `${dataPath}/labels/${view}/${caseId}.json?${CACHE_V}`;
      const ctrl = new AbortController();
      ctrls.push(ctrl);
      fetch(url, { signal: ctrl.signal })
        .then(r => {
          if (!r.ok) {
            log.warn(`label fetch non-OK: ${view}`, { url, status: r.status, caseIndex });
            return [];
          }
          return r.json();
        })
        .then(d => setLabels(prev => ({ ...prev, [view]: d })))
        .catch(e => {
          if (e?.name === 'AbortError') return;
          log.fetchError(url, e, { view, caseIndex });
        });
    });
    return () => { for (const c of ctrls) c.abort(); };
  }, [dataPath, availableViews, caseIndex]);

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

  // Precompute bboxes per contour per view — hover path skips isPointInPolygon
  // for any contour whose bbox does not contain the cursor.
  const labelIndex = useMemo(() => {
    const out: Record<XrayView, Array<{ label: SliceLabel; bboxes: [number, number, number, number][] }>> = {
      lateral: [],
      ap: [],
    };
    for (const view of availableViews) {
      out[view] = labels[view].map(l => ({
        label: l,
        bboxes: l.contours.map(contourBBox),
      }));
    }
    return out;
  }, [labels, availableViews]);

  const renderView = useCallback((view: XrayView) => {
    const canvas = canvasRefs.current[view];
    const img = imgRefs.current[view];
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);

    if (forceHideOverlay || !showOverlay) return;

    const viewLabels = labels[view];
    if (!viewLabels?.length) return;

    const hasSelection = !!selectedStructure || !!hoveredStructure;

    for (const label of viewLabels) {
      const struct = structuresById.get(label.id);
      if (!struct) continue;

      const isHovered   = hoveredStructure === label.name;
      const isSelected  = selectedStructure?.name === label.name;

      let fillAlpha: number;
      let strokeAlpha: number;
      let lineWidth: number;

      if (isHovered || isSelected) {
        fillAlpha   = 0.40;
        strokeAlpha = 1.0;
        lineWidth   = 2.5;
      } else if (hasSelection) {
        fillAlpha   = 0.05;
        strokeAlpha = 0.20;
        lineWidth   = 1;
      } else {
        fillAlpha   = 0.22;
        strokeAlpha = 0.55;
        lineWidth   = 1;
      }

      ctx.fillStyle   = struct.color;
      ctx.globalAlpha = fillAlpha;
      for (const contour of label.contours) {
        if (contour.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(contour[0][0], contour[0][1]);
        for (let i = 1; i < contour.length; i++) ctx.lineTo(contour[i][0], contour[i][1]);
        ctx.closePath();
        ctx.fill();
      }

      ctx.strokeStyle = struct.color;
      ctx.globalAlpha = strokeAlpha;
      ctx.lineWidth   = lineWidth;
      for (const contour of label.contours) {
        if (contour.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(contour[0][0], contour[0][1]);
        for (let i = 1; i < contour.length; i++) ctx.lineTo(contour[i][0], contour[i][1]);
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [showOverlay, forceHideOverlay, labels, hoveredStructure, selectedStructure, structuresById]);

  // Re-render both views whenever state changes
  useEffect(() => {
    renderView('lateral');
    renderView('ap');
  }, [renderView]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent, view: XrayView) => {
    const canvas = canvasRefs.current[view];
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const img = imgRefs.current[view];
    if (!img) return;

    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    let found: string | null = null;
    const entries = labelIndex[view];
    for (const { label, bboxes } of entries) {
      const contours = label.contours;
      for (let ci = 0; ci < contours.length; ci++) {
        const b = bboxes[ci];
        if (x < b[0] || x > b[2] || y < b[1] || y > b[3]) continue;
        if (isPointInPolygon(x, y, contours[ci])) { found = label.name; break; }
      }
      if (found) break;
    }

    setHoveredStructure(found);

    // Hard mode: keep hoveredStructure updated (click target identification)
    // but suppress tooltip — tooltip would reveal the answer on hover.
    if (found && !forceHideOverlay) {
      const rawX = e.clientX - rect.left + 12;
      const rawY = e.clientY - rect.top - 8;
      const clampedX = Math.min(rawX, rect.width - 240);
      const clampedY = rawY < 32 ? rawY + 32 : rawY;
      setTooltipPos({ x: Math.max(0, clampedX), y: Math.max(0, clampedY), view });
    } else {
      setTooltipPos(null);
    }
  }, [labelIndex, forceHideOverlay]);

  const handleCanvasClick = useCallback(() => {
    if (hoveredStructure) {
      onStructureSelect?.(structuresByName.get(hoveredStructure) || null);
    }
  }, [hoveredStructure, structuresByName, onStructureSelect]);

  const goPrev = useCallback(() => setCaseIndex(i => (i - 1 + caseCount) % caseCount), [caseCount]);
  const goNext = useCallback(() => setCaseIndex(i => (i + 1) % caseCount), [caseCount]);

  useEffect(() => {
    if (caseCount <= 1) return;
    const onKey = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement | null;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable)) return;
      if (e.key === 'ArrowLeft')  { e.preventDefault(); goPrev(); }
      if (e.key === 'ArrowRight') { e.preventDefault(); goNext(); }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [caseCount, goPrev, goNext]);

  const hoveredStruct = hoveredStructure ? structuresByName.get(hoveredStructure) : undefined;

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex gap-2">
          {availableViews.map(v => (
            <span
              key={v}
              className="px-3 py-1 rounded-lg bg-white/70 backdrop-blur-xl border border-slate-200/60 text-sm font-medium text-slate-700"
            >
              {VIEW_LABELS[v][locale === 'ko' ? 'ko' : 'en']}
            </span>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {caseCount > 1 && (
            <div className="flex items-center gap-1 rounded-lg bg-white/70 backdrop-blur-xl border border-slate-200/60 px-1 py-0.5">
              <button
                onClick={goPrev}
                aria-label="Previous case"
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                ←
              </button>
              <span className="px-1 text-xs font-mono tabular-nums text-slate-700 min-w-[3.5rem] text-center">
                {locale === 'ko' ? '케이스' : 'Case'} {caseIndex + 1} / {caseCount}
              </span>
              <button
                onClick={goNext}
                aria-label="Next case"
                className="px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded transition-colors"
              >
                →
              </button>
            </div>
          )}
          {!forceHideOverlay && (
            <button
              onClick={() => setShowOverlay(!showOverlay)}
              className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
                showOverlay ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
              }`}
            >
              Labels
            </button>
          )}
        </div>
      </div>

      {/* Two-panel viewer (1-col if single view) */}
      <div className={`grid gap-2 ${availableViews.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
        {availableViews.map(view => (
          <div
            key={view}
            className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-crosshair"
          >
            {/* View label badge */}
            <div className="absolute top-2 left-2 z-10 text-xs font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
              {VIEW_LABELS[view][locale === 'ko' ? 'ko' : 'en']}
            </div>

            <canvas
              ref={el => { canvasRefs.current[view] = el; }}
              style={{ width: '100%', height: 'auto', display: 'block' }}
              onMouseMove={e => handleCanvasMouseMove(e, view)}
              onMouseLeave={() => { setHoveredStructure(null); setTooltipPos(null); }}
              onClick={handleCanvasClick}
            />

            {/* Tooltip */}
            {hoveredStruct && tooltipPos?.view === view && (
              <motion.div
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute z-20 pointer-events-none"
                style={{ left: tooltipPos.x, top: tooltipPos.y }}
              >
                <div className="bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
                  <span style={{ color: hoveredStruct.color }}>●</span>{' '}
                  {hoveredStruct.displayName.en || hoveredStruct.name}
                  {locale !== 'en' && hoveredStruct.displayName[locale] && (
                    <span className="text-white/60 ml-1">({hoveredStruct.displayName[locale]})</span>
                  )}
                  <span className="text-white/50 ml-1.5">{hoveredStruct.category}</span>
                </div>
              </motion.div>
            )}
          </div>
        ))}
      </div>

      {/* Info strip */}
      <p className="text-center text-[11px] text-slate-400">
        X-ray · Hover to identify structures{caseCount > 1 && ' · ← / → to switch cases'}
      </p>
    </div>
  );
}

function isPointInPolygon(x: number, y: number, polygon: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
    const xi = polygon[i][0], yi = polygon[i][1];
    const xj = polygon[j][0], yj = polygon[j][1];
    if ((yi > y) !== (yj > y) && x < (xj - xi) * (y - yi) / (yj - yi) + xi) inside = !inside;
  }
  return inside;
}

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
