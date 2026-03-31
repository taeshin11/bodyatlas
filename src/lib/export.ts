import JSZip from 'jszip';
import { saveAs } from 'file-saver';
import { DicomVolume, getAxialSlice, getSagittalSlice, getCoronalSlice, applyWindowing } from './dicom';

function sliceToCanvas(
  sliceData: Float32Array,
  width: number,
  height: number,
  windowCenter: number,
  windowWidth: number
): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d')!;
  const windowed = applyWindowing(sliceData, windowCenter, windowWidth);
  const imageData = ctx.createImageData(width, height);
  for (let i = 0; i < windowed.length; i++) {
    const v = windowed[i];
    imageData.data[i * 4] = v;
    imageData.data[i * 4 + 1] = v;
    imageData.data[i * 4 + 2] = v;
    imageData.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
  return canvas;
}

export async function exportPngSnapshots(
  volume: DicomVolume,
  axialIdx: number,
  sagittalIdx: number,
  coronalIdx: number,
  windowCenter: number,
  windowWidth: number
): Promise<void> {
  const zip = new JSZip();

  // Axial
  const axialData = getAxialSlice(volume, axialIdx);
  const axialCanvas = sliceToCanvas(axialData, volume.width, volume.height, windowCenter, windowWidth);
  const axialBlob = await new Promise<Blob>((resolve) => axialCanvas.toBlob((b) => resolve(b!), 'image/png'));
  zip.file('axial.png', axialBlob);

  // Sagittal
  const sagData = getSagittalSlice(volume, sagittalIdx);
  const sagCanvas = sliceToCanvas(sagData, volume.height, volume.depth, windowCenter, windowWidth);
  const sagBlob = await new Promise<Blob>((resolve) => sagCanvas.toBlob((b) => resolve(b!), 'image/png'));
  zip.file('sagittal.png', sagBlob);

  // Coronal
  const corData = getCoronalSlice(volume, coronalIdx);
  const corCanvas = sliceToCanvas(corData, volume.width, volume.depth, windowCenter, windowWidth);
  const corBlob = await new Promise<Blob>((resolve) => corCanvas.toBlob((b) => resolve(b!), 'image/png'));
  zip.file('coronal.png', corBlob);

  // Combined report
  const reportCanvas = document.createElement('canvas');
  const maxW = Math.max(volume.width, volume.height) * 3 + 40;
  const maxH = Math.max(volume.height, volume.depth) + 60;
  reportCanvas.width = maxW;
  reportCanvas.height = maxH;
  const rctx = reportCanvas.getContext('2d')!;
  rctx.fillStyle = '#0F172A';
  rctx.fillRect(0, 0, maxW, maxH);
  rctx.font = 'bold 14px Inter, sans-serif';
  rctx.fillStyle = '#94A3B8';

  const panelW = Math.floor((maxW - 40) / 3);
  rctx.fillText('Axial', 10, 18);
  rctx.drawImage(axialCanvas, 10, 28, panelW, panelW);

  rctx.fillText('Sagittal', panelW + 20, 18);
  rctx.drawImage(sagCanvas, panelW + 20, 28, panelW, panelW);

  rctx.fillText('Coronal', panelW * 2 + 30, 18);
  rctx.drawImage(corCanvas, panelW * 2 + 30, 28, panelW, panelW);

  const reportBlob = await new Promise<Blob>((resolve) => reportCanvas.toBlob((b) => resolve(b!), 'image/png'));
  zip.file('report_combined.png', reportBlob);

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'brainaxis-snapshots.zip');
}

export async function exportDicomZip(volume: DicomVolume): Promise<void> {
  const zip = new JSZip();
  const { width, height, depth, data } = volume;

  for (let z = 0; z < depth; z++) {
    const sliceData = new Float32Array(width * height);
    const offset = z * width * height;
    sliceData.set(data.subarray(offset, offset + width * height));

    // Create minimal DICOM-like raw file (16-bit pixels)
    // For full DICOM compliance, a proper encoder would be needed
    // This exports raw pixel data that can be imported
    const pixelArray = new Int16Array(width * height);
    for (let i = 0; i < width * height; i++) {
      pixelArray[i] = Math.round(sliceData[i]);
    }

    const fileName = `slice_${String(z).padStart(4, '0')}.raw`;
    zip.file(fileName, pixelArray.buffer);
  }

  // Add metadata file
  const meta = {
    width,
    height,
    depth,
    voxelSpacing: volume.voxelSpacing,
    modality: volume.modality,
    format: 'int16_raw',
    note: 'Raw 16-bit signed integer pixel data. Import into 3D Slicer via Add Data > Raw.',
  };
  zip.file('metadata.json', JSON.stringify(meta, null, 2));

  const content = await zip.generateAsync({ type: 'blob' });
  saveAs(content, 'brainaxis-aligned-dicom.zip');
}
