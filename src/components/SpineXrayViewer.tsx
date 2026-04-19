'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';
import { createLogger, loggedFetch } from '@/lib/logger';

const log = createLogger('SpineXrayViewer');

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
}

type XrayView = 'lateral' | 'ap';

const VIEW_LABELS: Record<XrayView, { en: string; ko: string }> = {
  lateral: { en: 'Lateral', ko: '측면' },
  ap:      { en: 'AP',      ko: '전후면' },
};

export default function SpineXrayViewer({ onStructureSelect, selectedStructure, locale, dataPath = '/data/spine-xray' }: SpineXrayViewerProps) {
  const [structures, setStructures] = useState<Structure[]>([]);
  const [labels, setLabels] = useState<Record<XrayView, SliceLabel[]>>({ lateral: [], ap: [] });
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const [hoveredView, setHoveredView] = useState<XrayView | null>(null);
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
        const res = await loggedFetch(log, `${dataPath}/structures.json`);
        if (!res.ok) return;
        const d = await res.json() as { structures: Structure[] };
        if (cancelled) return;
        log.debug('structures loaded', { count: d.structures?.length });
        setStructures(d.structures);
      } catch (e) {
        log.error('failed to load X-ray structures.json', e, { dataPath });
      }
    })();
    return () => { cancelled = true; };
  }, [dataPath]);

  // Load images and labels for both views
  useEffect(() => {
    (['lateral', 'ap'] as XrayView[]).forEach(view => {
      const img = new Image();
      const url = `${dataPath}/${view}/0000.png`;
      img.onload = () => {
        log.debug(`image loaded: ${view}`, { url, width: img.naturalWidth, height: img.naturalHeight });
        imgRefs.current[view] = img;
        renderView(view);
      };
      img.onerror = () => {
        log.error(`image failed to load: ${view}`, undefined, { url });
      };
      img.src = url;
    });

    (['lateral', 'ap'] as XrayView[]).forEach(view => {
      const url = `${dataPath}/labels/${view}/0000.json`;
      fetch(url)
        .then(r => {
          if (!r.ok) {
            log.warn(`label fetch non-OK: ${view}`, { url, status: r.status });
            return [];
          }
          return r.json();
        })
        .then(d => setLabels(prev => ({ ...prev, [view]: d })))
        .catch(e => log.fetchError(url, e, { view }));
    });
  }, [dataPath]);

  const renderView = useCallback((view: XrayView) => {
    const canvas = canvasRefs.current[view];
    const img = imgRefs.current[view];
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.drawImage(img, 0, 0);

    if (!showOverlay) return;

    const viewLabels = labels[view];
    if (!viewLabels?.length) return;

    const hasSelection = !!selectedStructure || !!hoveredStructure;

    for (const label of viewLabels) {
      const struct = structures.find(s => s.id === label.id);
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
  }, [showOverlay, labels, hoveredStructure, selectedStructure, structures]);

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
    for (const label of labels[view]) {
      for (const contour of label.contours) {
        if (isPointInPolygon(x, y, contour)) { found = label.name; break; }
      }
      if (found) break;
    }

    setHoveredStructure(found);
    setHoveredView(view);

    if (found) {
      const rawX = e.clientX - rect.left + 12;
      const rawY = e.clientY - rect.top - 8;
      const clampedX = Math.min(rawX, rect.width - 240);
      const clampedY = rawY < 32 ? rawY + 32 : rawY;
      setTooltipPos({ x: Math.max(0, clampedX), y: Math.max(0, clampedY), view });
    } else {
      setTooltipPos(null);
    }
  }, [labels]);

  const handleCanvasClick = useCallback(() => {
    if (hoveredStructure) {
      const struct = structures.find(s => s.name === hoveredStructure);
      onStructureSelect?.(struct || null);
    }
  }, [hoveredStructure, structures, onStructureSelect]);

  const hoveredStruct = structures.find(s => s.name === hoveredStructure);

  return (
    <div className="space-y-3">
      {/* Header row */}
      <div className="flex items-center justify-between">
        <div className="flex gap-2">
          {(['lateral', 'ap'] as XrayView[]).map(v => (
            <span
              key={v}
              className="px-3 py-1 rounded-lg bg-white/70 backdrop-blur-xl border border-slate-200/60 text-sm font-medium text-slate-700"
            >
              {VIEW_LABELS[v][locale === 'ko' ? 'ko' : 'en']}
            </span>
          ))}
        </div>
        <button
          onClick={() => setShowOverlay(!showOverlay)}
          className={`px-3 py-1 text-xs font-medium rounded-lg transition-all ${
            showOverlay ? 'bg-indigo-500 text-white' : 'bg-slate-200 text-slate-600'
          }`}
        >
          Labels
        </button>
      </div>

      {/* Two-panel viewer */}
      <div className="grid grid-cols-2 gap-2">
        {(['lateral', 'ap'] as XrayView[]).map(view => (
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
              onMouseLeave={() => { setHoveredStructure(null); setHoveredView(null); setTooltipPos(null); }}
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
        Spine X-ray · T5–S1 · Hover to identify vertebrae
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
