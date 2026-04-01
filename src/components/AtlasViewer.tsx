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
}

export default function AtlasViewer({ onStructureSelect, selectedStructure, locale }: AtlasViewerProps) {
  const [info, setInfo] = useState<AtlasInfo | null>(null);
  const [structures, setStructures] = useState<Structure[]>([]);
  const [activeTab, setActiveTab] = useState<Plane>('axial');
  const [sliceIndices, setSliceIndices] = useState<Record<Plane, number>>({ axial: 0, sagittal: 0, coronal: 0 });
  const [labels, setLabels] = useState<SliceLabel[]>([]);
  const [hoveredStructure, setHoveredStructure] = useState<string | null>(null);
  const [showOverlay, setShowOverlay] = useState(true);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const overlayCanvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  // Load atlas info and structures
  useEffect(() => {
    fetch('/data/chest-ct/info.json').then(r => r.json()).then(setInfo);
    fetch('/data/chest-ct/structures.json').then(r => r.json()).then((d: StructuresData) => {
      setStructures(d.structures);
    });
  }, []);

  // Set initial slice indices to middle
  useEffect(() => {
    if (!info) return;
    setSliceIndices({
      axial: Math.floor(info.planes.axial.slices / 2),
      sagittal: Math.floor(info.planes.sagittal.slices / 2),
      coronal: Math.floor(info.planes.coronal.slices / 2),
    });
  }, [info]);

  const currentSlice = sliceIndices[activeTab];
  const maxSlice = info ? info.planes[activeTab].slices - 1 : 0;

  // Load slice image
  useEffect(() => {
    if (!info) return;
    const img = new Image();
    img.src = `/data/chest-ct/${activeTab}/${String(currentSlice).padStart(4, '0')}.png`;
    img.onload = () => {
      imgRef.current = img;
      renderSlice();
    };
  }, [activeTab, currentSlice, info]);

  // Load labels for current slice
  useEffect(() => {
    if (!info) return;
    const padded = String(currentSlice).padStart(4, '0');
    fetch(`/data/chest-ct/labels/${activeTab}/${padded}.json`)
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

  const renderSlice = useCallback(() => {
    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.drawImage(img, 0, 0);
  }, []);

  // Render overlay
  useEffect(() => {
    const canvas = overlayCanvasRef.current;
    const mainCanvas = canvasRef.current;
    if (!canvas || !mainCanvas) return;

    canvas.width = mainCanvas.width;
    canvas.height = mainCanvas.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (!showOverlay || labels.length === 0) return;

    for (const label of labels) {
      const struct = structures.find(s => s.id === label.id);
      if (!struct) continue;

      const isHovered = hoveredStructure === label.name;
      const isSelected = selectedStructure?.name === label.name;
      const alpha = isHovered || isSelected ? 0.5 : 0.2;

      ctx.fillStyle = struct.color;
      ctx.globalAlpha = alpha;

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

      // Draw border for hovered/selected
      if (isHovered || isSelected) {
        ctx.strokeStyle = struct.color;
        ctx.globalAlpha = 0.9;
        ctx.lineWidth = 2;
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
    }
    ctx.globalAlpha = 1;
  }, [labels, showOverlay, hoveredStructure, selectedStructure, structures]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent) => {
    const canvas = overlayCanvasRef.current;
    if (!canvas || labels.length === 0) {
      setHoveredStructure(null);
      setTooltipPos(null);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
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
      setTooltipPos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
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

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    setSliceIndices(prev => ({
      ...prev,
      [activeTab]: Math.max(0, Math.min(maxSlice, prev[activeTab] + delta)),
    }));
  }, [activeTab, maxSlice]);

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
        className="relative bg-slate-900 border border-slate-800 rounded-xl overflow-hidden cursor-crosshair"
        onWheel={handleWheel}
      >
        {/* Slice info */}
        <div className="absolute top-2 left-2 z-10 text-xs font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
          {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
        </div>
        <div className="absolute top-2 right-2 z-10 text-xs font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
          {currentSlice + 1}/{maxSlice + 1}
        </div>

        <canvas
          ref={canvasRef}
          className="w-full"
          style={{ imageRendering: 'pixelated' }}
        />
        <canvas
          ref={overlayCanvasRef}
          className="absolute inset-0 w-full h-full"
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
            style={{ left: tooltipPos.x + 12, top: tooltipPos.y - 8 }}
          >
            <div className="bg-black/80 backdrop-blur-sm text-white text-xs font-medium px-2.5 py-1.5 rounded-lg shadow-lg">
              <span style={{ color: hoveredStruct.color }}>●</span>{' '}
              {hoveredStruct.displayName[locale] || hoveredStruct.displayName.en || hoveredStruct.name.replace(/_/g, ' ')}
              <span className="text-white/50 ml-1.5">{hoveredStruct.category}</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Slice slider */}
      <div className="flex items-center gap-3 px-1">
        <input
          type="range"
          min={0}
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
