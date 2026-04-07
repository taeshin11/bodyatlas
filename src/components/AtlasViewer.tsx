'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { motion } from 'framer-motion';

type Plane = 'axial' | 'sagittal' | 'coronal';

interface AtlasInfo {
  planes: Record<Plane, { slices: number }>;
  voxelSpacing: number[];
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

interface StructuresData {
  totalStructures: number;
  structures: Structure[];
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

export default function AtlasViewer({ onStructureSelect, selectedStructure, locale, dataPath = '/data/chest-ct', regionAxialRange, regionDefaultSlice, forceAxial }: AtlasViewerProps) {
  const [info, setInfo] = useState<AtlasInfo | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [activeTab, setActiveTab] = useState<Plane>('axial');
  const [sliceIndices, setSliceIndices] = useState<Record<Plane, number>>({ axial: 0, sagittal: 0, coronal: 0 });
  const [labels, setLabels] = useState<SliceLabel[]>([]);
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const imageCache = useRef<Map<string, HTMLImageElement>>(new Map());

  // Load atlas info and structures
  useEffect(() => {
    fetch(`${dataPath}/info.json`).then(r => r.json()).then(setInfo);
    fetch(`${dataPath}/structures.json`).then(r => r.json()).then((d: StructuresData) => {
      setStructures(d.structures);
    });
  }, [dataPath]);

  // Set initial slice indices based on region
  useEffect(() => {
    if (!info) return;
    const axialDefault = regionDefaultSlice ?? Math.floor(info.planes.axial.slices / 2);
    setSliceIndices({
      axial: axialDefault,
      sagittal: Math.floor(info.planes.sagittal.slices / 2),
      coronal: Math.floor(info.planes.coronal.slices / 2),
    });
  }, [info, regionDefaultSlice]);

  // Reset to axial view and default slice when region changes
  useEffect(() => {
    if (regionDefaultSlice != null) {
      setActiveTab('axial');
      setSliceIndices(prev => ({ ...prev, axial: regionDefaultSlice }));
    }
  }, [forceAxial]);

  const currentSlice = sliceIndices[activeTab];
  // For axial, constrain to region range; for other planes, use full range
  const minSlice = activeTab === 'axial' && regionAxialRange ? regionAxialRange[0] : 0;
  const maxSlice = activeTab === 'axial' && regionAxialRange
    ? regionAxialRange[1]
    : info ? info.planes[activeTab].slices - 1 : 0;

  // Build image path helper
  const getImagePath = useCallback((plane: Plane, slice: number) =>
    `${dataPath}/${plane}/${String(slice).padStart(4, '0')}.png`, [dataPath]);

  // Preload neighboring slices
  useEffect(() => {
    if (!info) return;
    const max = info.planes[activeTab].slices - 1;
    for (let offset = -3; offset <= 3; offset++) {
      if (offset === 0) continue;
      const idx = currentSlice + offset;
      if (idx < 0 || idx > max) continue;
      const path = getImagePath(activeTab, idx);
      if (!imageCache.current.has(path)) {
        const img = new Image();
        img.src = path;
        img.onload = () => imageCache.current.set(path, img);
      }
    }
  }, [activeTab, currentSlice, info, getImagePath]);

  // Clear image when slice changes to prevent stale overlay
  useEffect(() => {
    imgRef.current = null;
  }, [activeTab, currentSlice]);

  // Load slice image
  useEffect(() => {
    if (!info) return;
    const path = getImagePath(activeTab, currentSlice);

    const cached = imageCache.current.get(path);
    if (cached && cached.complete) {
      imgRef.current = cached;
      renderAll();
      return;
    }

    const img = new Image();
    img.src = path;
    img.onload = () => {
      imageCache.current.set(path, img);
      // Only set if this is still the current slice
      imgRef.current = img;
      renderAll();
    };
  }, [activeTab, currentSlice, info, getImagePath]);

  // Load labels for current slice
  useEffect(() => {
    if (!info) return;
    const padded = String(currentSlice).padStart(4, '0');
    fetch(`${dataPath}/labels/${activeTab}/${padded}.json`)
      .then(r => r.ok ? r.json() : [])
      .then(setLabels)
      .catch(() => setLabels([]));
  }, [activeTab, currentSlice, info]);

  // Jump to structure's best slice when selected
  useEffect(() => {
    if (!selectedStructure) return;
    const best = selectedStructure.bestSlice;
    setSliceIndices({
      axial: best.axial,
      sagittal: best.sagittal,
      coronal: best.coronal,
    });
  }, [selectedStructure]);

  // Render image + overlay on single canvas
  const renderAll = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Draw CT image
    ctx.drawImage(img, 0, 0);

    // Draw overlay
    if (!showOverlay || labels.length === 0) return;

    const hasSelection = !!selectedStructure || !!hoveredStructure;

    for (const label of labels) {
      const struct = structures.find(s => s.id === label.id);
      if (!struct) continue;

      const isHovered = hoveredStructure === label.name;
      const isSelected = selectedStructure?.name === label.name;

      // When something is selected/hovered: highlight it, dim others
      // When nothing selected: show all at low opacity
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

      // Fill
      ctx.fillStyle   = struct.color;
      ctx.globalAlpha = fillAlpha;
      for (const contour of label.contours) {
        if (contour.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(contour[0][0], contour[0][1]);
        for (let i = 1; i < contour.length; i++) {
          ctx.lineTo(contour[i][0], contour[i][1]);
        }
        ctx.closePath();
        ctx.fill();
      }

      // Stroke — always visible so structures are easy to find
      ctx.strokeStyle = struct.color;
      ctx.globalAlpha = strokeAlpha;
      ctx.lineWidth   = lineWidth;
      for (const contour of label.contours) {
        if (contour.length < 3) continue;
        ctx.beginPath();
        ctx.moveTo(contour[0][0], contour[0][1]);
        for (let i = 1; i < contour.length; i++) {
          ctx.lineTo(contour[i][0], contour[i][1]);
        }
        ctx.closePath();
        ctx.stroke();
      }
    }
    ctx.globalAlpha = 1;
  }, [showOverlay, labels, hoveredStructure, selectedStructure, structures]);

  // Re-render when overlay state changes
  useEffect(() => {
    renderAll();
  }, [renderAll]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas || labels.length === 0) {
      setHoveredStructure(null);
      setTooltipPos(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const img = imgRef.current;
    if (!img) return;
    const scaleX = img.width / rect.width;
    const scaleY = img.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    // Check which structure the cursor is over
    let found: string | null = null;
    for (const label of labels) {
      for (const contour of label.contours) {
        if (isPointInPolygon(x, y, contour)) {
          found = label.name;
          break;
        }
      }
      if (found) break;
    }

    setHoveredStructure(found);
    if (found) {
      // Clamp tooltip within container bounds
      const rawX = e.clientX - rect.left + 12;
      const rawY = e.clientY - rect.top - 8;
      const tooltipW = 240;
      const tooltipH = 32;
      const clampedX = Math.min(rawX, rect.width - tooltipW);
      const clampedY = rawY < tooltipH ? rawY + 32 : rawY;
      setTooltipPos({ x: Math.max(0, clampedX), y: Math.max(0, clampedY) });
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

  // Native wheel handler (passive: false) to prevent page scroll while navigating slices
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const handler = (e: WheelEvent) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? 1 : -1;
      setSliceIndices(prev => ({
        ...prev,
        [activeTab]: Math.max(minSlice, Math.min(maxSlice, prev[activeTab] + delta)),
      }));
    };
    el.addEventListener('wheel', handler, { passive: false });
    return () => el.removeEventListener('wheel', handler);
  }, [activeTab, minSlice, maxSlice]);

  // Keyboard navigation
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't capture when typing in an input
      if (e.target instanceof HTMLInputElement || e.target instanceof HTMLTextAreaElement) return;

      switch (e.key) {
        case 'ArrowUp':
        case 'ArrowLeft':
          e.preventDefault();
          setSliceIndices(prev => ({
            ...prev,
            [activeTab]: Math.max(minSlice, prev[activeTab] - 1),
          }));
          break;
        case 'ArrowDown':
        case 'ArrowRight':
          e.preventDefault();
          setSliceIndices(prev => ({
            ...prev,
            [activeTab]: Math.min(maxSlice, prev[activeTab] + 1),
          }));
          break;
        case 'Escape':
          onStructureSelect?.(null);
          break;
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [activeTab, minSlice, maxSlice, onStructureSelect]);

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
              activeTab === tab
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-slate-600 hover:bg-slate-100'
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

        {/* Keyboard hint */}
        <div className="absolute bottom-2 left-2 z-10 text-[10px] font-mono text-white/30 bg-black/30 px-2 py-0.5 rounded hidden sm:block">
          Arrow keys / scroll to navigate
        </div>

        {/* Single canvas — image + overlay, fills container height */}
        <canvas
          ref={canvasRef}
          style={{ width: 'auto', height: 'calc(100vh - 280px)', maxWidth: '100%', display: 'block', margin: '0 auto' }}
          onMouseMove={handleCanvasMouseMove}
          onMouseLeave={() => { setHoveredStructure(null); setTooltipPos(null); }}
          onClick={handleCanvasClick}
        />

        {/* Tooltip */}
        {hoveredStruct && tooltipPos && (
          <motion.div
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            className="absolute z-20 pointer-events-none"
            style={{ left: tooltipPos.x, top: tooltipPos.y }}
          >
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg whitespace-nowrap">
              <span style={{ color: hoveredStruct.color }}>●</span>{' '}
              {hoveredStruct.displayName.en || hoveredStruct.name.replace(/_/g, ' ')}
              {locale !== 'en' && hoveredStruct.displayName[locale] && (
                <span className="text-white/60 ml-1">({hoveredStruct.displayName[locale]})</span>
              )}
              <span className="text-white/50 ml-1.5">{hoveredStruct.category}</span>
            </div>
          </motion.div>
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
            showOverlay
              ? 'bg-indigo-500 text-white'
              : 'bg-slate-200 text-slate-600'
          }`}
        >
          Labels
        </button>
      </div>
    </div>
  );
}

// Point-in-polygon test (ray casting)
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
