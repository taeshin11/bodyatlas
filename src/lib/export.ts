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

  function canvasToBlob(canvas: HTMLCanvasElement): Promise<Blob> {
    return new Promise((resolve, reject) => {
      canvas.toBlob((b) => {
        if (b) resolve(b);
        else reject(new Error('Canvas toBlob returned null'));
      }, 'image/png');
    });
  }

  // Axial
  const axialData = getAxialSlice(volume, axialIdx);
  const axialCanvas = sliceToCanvas(axialData, volume.width, volume.height, windowCenter, windowWidth);
  const axialBlob = await canvasToBlob(axialCanvas);
  zip.file('axial.png', axialBlob);

  // Sagittal
  const sagData = getSagittalSlice(volume, sagittalIdx);
  const sagCanvas = sliceToCanvas(sagData, volume.height, volume.depth, windowCenter, windowWidth);
  const sagBlob = await canvasToBlob(sagCanvas);
  zip.file('sagittal.png', sagBlob);

  // Coronal
  const corData = getCoronalSlice(volume, coronalIdx);
  const corCanvas = sliceToCanvas(corData, volume.width, volume.depth, windowCenter, windowWidth);
  const corBlob = await canvasToBlob(corCanvas);
  zip.file('coronal.png', corBlob);

  // Combined report — use physical dimensions for correct aspect ratios
  const sp = volume.voxelSpacing;
  const axPhysW = volume.width * sp[0], axPhysH = volume.height * sp[1];
  const sagPhysW = volume.height * sp[1], sagPhysH = volume.depth * sp[2];
  const corPhysW = volume.width * sp[0], corPhysH = volume.depth * sp[2];

  const panelDisplayW = 300;
  const axDispH = Math.round(panelDisplayW * axPhysH / axPhysW);
  const sagDispH = Math.round(panelDisplayW * sagPhysH / sagPhysW);
  const corDispH = Math.round(panelDisplayW * corPhysH / corPhysW);
  const maxDispH = Math.max(axDispH, sagDispH, corDispH);

  const reportCanvas = document.createElement('canvas');
  const maxW = panelDisplayW * 3 + 40;
  const maxH = maxDispH + 60;
  reportCanvas.width = maxW;
  reportCanvas.height = maxH;
  const rctx = reportCanvas.getContext('2d')!;
  rctx.fillStyle = '#0F172A';
  rctx.fillRect(0, 0, maxW, maxH);
  rctx.font = 'bold 14px Inter, sans-serif';
  rctx.fillStyle = '#94A3B8';

  rctx.fillText('Axial', 10, 18);
  rctx.drawImage(axialCanvas, 10, 28, panelDisplayW, axDispH);

  rctx.fillText('Sagittal', panelDisplayW + 20, 18);
  rctx.drawImage(sagCanvas, panelDisplayW + 20, 28, panelDisplayW, sagDispH);

  rctx.fillText('Coronal', panelDisplayW * 2 + 30, 18);
  rctx.drawImage(corCanvas, panelDisplayW * 2 + 30, 28, panelDisplayW, corDispH);

  const reportBlob = await canvasToBlob(reportCanvas);
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
