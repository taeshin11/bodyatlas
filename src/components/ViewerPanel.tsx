'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { DicomVolume, getAxialSlice, getSagittalSlice, getCoronalSlice, applyWindowing } from '@/lib/dicom';
import { Point3D } from '@/lib/alignment';
import { useI18n } from '@/lib/i18n-context';

export type ViewType = 'axial' | 'sagittal' | 'coronal';

interface ViewerPanelProps {
  volume: DicomVolume;
  viewType: ViewType;
  sliceIndex: number;
  onSliceChange: (index: number) => void;
  windowCenter: number;
  windowWidth: number;
  acPoint: Point3D | null;
  pcPoint: Point3D | null;
  markingMode: 'none' | 'ac' | 'pc';
  onMarkPoint: (point: Point3D) => void;
  crosshairPosition: { x: number; y: number; z: number };
  onCrosshairChange: (pos: { x: number; y: number; z: number }) => void;
  voxelSpacing: [number, number, number];
}

export default function ViewerPanel({
  volume,
  viewType,
  sliceIndex,
  onSliceChange,
  windowCenter,
  windowWidth,
  acPoint,
  pcPoint,
  markingMode,
  onMarkPoint,
  crosshairPosition,
  onCrosshairChange,
  voxelSpacing,
}: ViewerPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ w: 0, h: 0 });

  const getSliceData = useCallback(() => {
    switch (viewType) {
      case 'axial':
        return {
          data: getAxialSlice(volume, sliceIndex),
          sliceW: volume.width,
          sliceH: volume.height,
        };
      case 'sagittal':
        return {
          data: getSagittalSlice(volume, sliceIndex),
          sliceW: volume.height,
          sliceH: volume.depth,
        };
      case 'coronal':
        return {
          data: getCoronalSlice(volume, sliceIndex),
          sliceW: volume.width,
          sliceH: volume.depth,
        };
    }
  }, [volume, viewType, sliceIndex]);

  const getMaxSlice = useCallback(() => {
    switch (viewType) {
      case 'axial': return volume.depth - 1;
      case 'sagittal': return volume.width - 1;
      case 'coronal': return volume.height - 1;
    }
  }, [volume, viewType]);

  // Render slice to canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const { data, sliceW, sliceH } = getSliceData();
    const windowed = applyWindowing(data, windowCenter, windowWidth);

    canvas.width = sliceW;
    canvas.height = sliceH;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const imageData = ctx.createImageData(sliceW, sliceH);
    for (let i = 0; i < windowed.length; i++) {
      const v = windowed[i];
      imageData.data[i * 4] = v;
      imageData.data[i * 4 + 1] = v;
      imageData.data[i * 4 + 2] = v;
      imageData.data[i * 4 + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    // Draw crosshairs
    ctx.strokeStyle = 'rgba(99, 102, 241, 0.5)';
    ctx.lineWidth = 1;
    ctx.setLineDash([4, 4]);

    let chX: number, chY: number;
    switch (viewType) {
      case 'axial':
        chX = crosshairPosition.x;
        chY = crosshairPosition.y;
        break;
      case 'sagittal':
        chX = crosshairPosition.y;
        chY = crosshairPosition.z;
        break;
      case 'coronal':
        chX = crosshairPosition.x;
        chY = crosshairPosition.z;
        break;
    }

    ctx.beginPath();
    ctx.moveTo(chX, 0);
    ctx.lineTo(chX, sliceH);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(0, chY);
    ctx.lineTo(sliceW, chY);
    ctx.stroke();

    ctx.setLineDash([]);

    // Draw AC/PC markers
    const drawMarker = (point: Point3D, color: string, label: string) => {
      let mx: number, my: number;
      let visible = false;

      switch (viewType) {
        case 'axial':
          mx = point.x;
          my = point.y;
          visible = Math.abs(point.z - sliceIndex) < 2;
          break;
        case 'sagittal':
          mx = point.y;
          my = point.z;
          visible = Math.abs(point.x - sliceIndex) < 2;
          break;
        case 'coronal':
          mx = point.x;
          my = point.z;
          visible = Math.abs(point.y - sliceIndex) < 2;
          break;
      }

      if (!visible) return;

      ctx.beginPath();
      ctx.arc(mx, my, 4, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.fillStyle = color;
      ctx.fillText(label, mx + 7, my + 4);
    };

    if (acPoint) drawMarker(acPoint, '#10B981', 'AC');
    if (pcPoint) drawMarker(pcPoint, '#F59E0B', 'PC');

    // Compute physical aspect ratio accounting for anisotropic voxel spacing
    let physW: number, physH: number;
    switch (viewType) {
      case 'axial':
        physW = sliceW * voxelSpacing[0];
        physH = sliceH * voxelSpacing[1];
        break;
      case 'sagittal':
        physW = sliceW * voxelSpacing[1];
        physH = sliceH * voxelSpacing[2];
        break;
      case 'coronal':
        physW = sliceW * voxelSpacing[0];
        physH = sliceH * voxelSpacing[2];
        break;
    }
    setCanvasSize({ w: physW, h: physH });
  }, [volume, viewType, sliceIndex, windowCenter, windowWidth, acPoint, pcPoint, crosshairPosition, getSliceData, voxelSpacing]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const px = (e.clientX - rect.left) * scaleX;
    const py = (e.clientY - rect.top) * scaleY;

    // Update crosshairs
    const newCrosshair = { ...crosshairPosition };
    switch (viewType) {
      case 'axial':
        newCrosshair.x = Math.round(px);
        newCrosshair.y = Math.round(py);
        break;
      case 'sagittal':
        newCrosshair.y = Math.round(px);
        newCrosshair.z = Math.round(py);
        break;
      case 'coronal':
        newCrosshair.x = Math.round(px);
        newCrosshair.z = Math.round(py);
        break;
    }
    onCrosshairChange(newCrosshair);

    // Mark AC/PC points
    if (markingMode !== 'none') {
      let point: Point3D;
      switch (viewType) {
        case 'axial':
          point = { x: Math.round(px), y: Math.round(py), z: sliceIndex };
          break;
        case 'sagittal':
          point = { x: sliceIndex, y: Math.round(px), z: Math.round(py) };
          break;
        case 'coronal':
          point = { x: Math.round(px), y: sliceIndex, z: Math.round(py) };
          break;
      }
      onMarkPoint(point);
    }
  }, [viewType, sliceIndex, markingMode, onMarkPoint, crosshairPosition, onCrosshairChange]);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 1 : -1;
    const newSlice = Math.max(0, Math.min(getMaxSlice(), sliceIndex + delta));
    onSliceChange(newSlice);
  }, [sliceIndex, getMaxSlice, onSliceChange]);

  const { t } = useI18n();
  const label = t(`viewer.${viewType}`);

  return (
    <div ref={containerRef} className="relative flex flex-col bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
      <div className="absolute top-2 left-2 z-10 text-xs font-medium text-white/70 bg-black/40 px-2 py-0.5 rounded">
        {label}
      </div>
      <div className="absolute top-2 right-2 z-10 text-xs font-mono text-white/50 bg-black/40 px-2 py-0.5 rounded">
        {sliceIndex + 1}/{getMaxSlice() + 1}
      </div>
      {markingMode !== 'none' && (
        <div className={`absolute top-2 left-1/2 -translate-x-1/2 z-10 text-xs font-medium px-2 py-0.5 rounded ${
          markingMode === 'ac' ? 'bg-emerald-500/80 text-white' : 'bg-amber-500/80 text-white'
        }`}>
          {t('viewer.clickMark', { point: markingMode.toUpperCase() })}
        </div>
      )}
      <canvas
        ref={canvasRef}
        onClick={handleClick}
        onWheel={handleWheel}
        className={`w-full h-full object-contain ${markingMode !== 'none' ? 'cursor-crosshair' : 'cursor-default'}`}
        style={{
          imageRendering: 'pixelated',
          aspectRatio: canvasSize.w && canvasSize.h ? `${canvasSize.w}/${canvasSize.h}` : undefined,
        }}
      />
    </div>
  );
}
