import dicomParser from 'dicom-parser';

export interface DicomSlice {
  pixelData: Int16Array | Uint16Array;
  rows: number;
  columns: number;
  sliceLocation: number;
  instanceNumber: number;
  pixelSpacing: [number, number];
  sliceThickness: number;
  windowCenter: number;
  windowWidth: number;
  rescaleSlope: number;
  rescaleIntercept: number;
  bitsAllocated: number;
  pixelRepresentation: number;
  imagePositionPatient: [number, number, number];
  imageOrientationPatient: number[];
  modality: string;
  patientId: string;
  studyDescription: string;
  seriesDescription: string;
}

export interface DicomVolume {
  data: Float32Array;
  width: number;
  height: number;
  depth: number;
  voxelSpacing: [number, number, number];
  windowCenter: number;
  windowWidth: number;
  modality: string;
  slices: DicomSlice[];
}

function getNumericValue(dataSet: dicomParser.DataSet, tag: string, defaultVal: number): number {
  const elem = dataSet.elements[tag];
  if (!elem) return defaultVal;
  const str = dataSet.string(tag);
  if (!str) return defaultVal;
  const val = parseFloat(str);
  return isNaN(val) ? defaultVal : val;
}

function getStringValue(dataSet: dicomParser.DataSet, tag: string, defaultVal: string): string {
  return dataSet.string(tag) || defaultVal;
}

function getMultiNumeric(dataSet: dicomParser.DataSet, tag: string, count: number, defaultVal: number[]): number[] {
  const str = dataSet.string(tag);
  if (!str) return defaultVal;
  const parts = str.split('\\').map(Number);
  if (parts.length >= count && parts.every(v => !isNaN(v))) return parts;
  return defaultVal;
}

export function parseDicomFile(arrayBuffer: ArrayBuffer): DicomSlice | null {
  try {
    const byteArray = new Uint8Array(arrayBuffer);
    const dataSet = dicomParser.parseDicom(byteArray);

    const rows = dataSet.uint16('x00280010') || 0;
    const columns = dataSet.uint16('x00280011') || 0;
    if (rows === 0 || columns === 0) return null;

    const bitsAllocated = dataSet.uint16('x00280100') || 16;
    const pixelRepresentation = dataSet.uint16('x00280103') || 0;

    const pixelDataElement = dataSet.elements['x7fe00010'];
    if (!pixelDataElement) return null;

    let pixelData: Int16Array | Uint16Array;
    if (bitsAllocated === 16) {
      if (pixelRepresentation === 1) {
        pixelData = new Int16Array(arrayBuffer, pixelDataElement.dataOffset, rows * columns);
      } else {
        pixelData = new Uint16Array(arrayBuffer, pixelDataElement.dataOffset, rows * columns);
      }
    } else {
      // 8-bit data: properly convert each byte to a 16-bit value
      const raw = new Uint8Array(arrayBuffer, pixelDataElement.dataOffset, rows * columns);
      const converted = new Uint16Array(rows * columns);
      for (let i = 0; i < raw.length; i++) {
        converted[i] = raw[i];
      }
      pixelData = converted;
    }

    const ps = getMultiNumeric(dataSet, 'x00280030', 2, [1, 1]);
    const ipp = getMultiNumeric(dataSet, 'x00200032', 3, [0, 0, 0]);
    const iop = getMultiNumeric(dataSet, 'x00200037', 6, [1, 0, 0, 0, 1, 0]);

    return {
      pixelData,
      rows,
      columns,
      sliceLocation: getNumericValue(dataSet, 'x00201041', 0),
      instanceNumber: getNumericValue(dataSet, 'x00200013', 0),
      pixelSpacing: [ps[0], ps[1]],
      sliceThickness: getNumericValue(dataSet, 'x00180050', 1),
      windowCenter: getNumericValue(dataSet, 'x00281050', 400),
      windowWidth: getNumericValue(dataSet, 'x00281051', 800),
      rescaleSlope: getNumericValue(dataSet, 'x00281053', 1),
      rescaleIntercept: getNumericValue(dataSet, 'x00281052', 0),
      bitsAllocated,
      pixelRepresentation,
      imagePositionPatient: [ipp[0], ipp[1], ipp[2]],
      imageOrientationPatient: iop,
      modality: getStringValue(dataSet, 'x00080060', 'unknown'),
      patientId: 'ANON',
      studyDescription: getStringValue(dataSet, 'x00081030', ''),
      seriesDescription: getStringValue(dataSet, 'x0008103e', ''),
    };
  } catch {
    return null;
  }
}

export function buildVolume(slices: DicomSlice[]): DicomVolume | null {
  if (slices.length === 0) return null;

  // Sort by slice location or instance number
  const sorted = [...slices].sort((a, b) => {
    const locDiff = a.imagePositionPatient[2] - b.imagePositionPatient[2];
    if (Math.abs(locDiff) > 0.001) return locDiff;
    return a.instanceNumber - b.instanceNumber;
  });

  const width = sorted[0].columns;
  const height = sorted[0].rows;
  const depth = sorted.length;

  const data = new Float32Array(width * height * depth);

  for (let z = 0; z < depth; z++) {
    const slice = sorted[z];
    const offset = z * width * height;
    for (let i = 0; i < width * height; i++) {
      data[offset + i] = slice.pixelData[i] * slice.rescaleSlope + slice.rescaleIntercept;
    }
  }

  // Compute slice spacing from IPP
  let sliceSpacing = sorted[0].sliceThickness;
  if (sorted.length > 1) {
    const dz = Math.abs(sorted[1].imagePositionPatient[2] - sorted[0].imagePositionPatient[2]);
    if (dz > 0.001) sliceSpacing = dz;
  }

  // Auto-compute window if metadata defaults are used (e.g. PET with no WC/WW)
  let wc = sorted[0].windowCenter;
  let ww = sorted[0].windowWidth;
  const isDefaultWindow = wc === 400 && ww === 800;
  if (isDefaultWindow) {
    // Compute from actual data: use percentile-based windowing
    const sampled: number[] = [];
    const step = Math.max(1, Math.floor(data.length / 50000));
    for (let i = 0; i < data.length; i += step) {
      if (data[i] > 0) sampled.push(data[i]);
    }
    if (sampled.length > 0) {
      sampled.sort((a, b) => a - b);
      const p5 = sampled[Math.floor(sampled.length * 0.05)];
      const p95 = sampled[Math.floor(sampled.length * 0.95)];
      wc = (p5 + p95) / 2;
      ww = p95 - p5;
    }
  }

  return {
    data,
    width,
    height,
    depth,
    voxelSpacing: [sorted[0].pixelSpacing[0], sorted[0].pixelSpacing[1], sliceSpacing],
    windowCenter: wc,
    windowWidth: ww,
    modality: sorted[0].modality,
    slices: sorted,
  };
}

export function getAxialSlice(volume: DicomVolume, z: number): Float32Array {
  const { width, height } = volume;
  const slice = new Float32Array(width * height);
  const zClamped = Math.max(0, Math.min(volume.depth - 1, Math.round(z)));
  const offset = zClamped * width * height;
  slice.set(volume.data.subarray(offset, offset + width * height));
  return slice;
}

export function getSagittalSlice(volume: DicomVolume, x: number): Float32Array {
  const { width, height, depth } = volume;
  const slice = new Float32Array(height * depth);
  const xClamped = Math.max(0, Math.min(width - 1, Math.round(x)));
  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      slice[z * height + y] = volume.data[z * width * height + y * width + xClamped];
    }
  }
  return slice;
}

export function getCoronalSlice(volume: DicomVolume, y: number): Float32Array {
  const { width, height, depth } = volume;
  const slice = new Float32Array(width * depth);
  const yClamped = Math.max(0, Math.min(height - 1, Math.round(y)));
  for (let z = 0; z < depth; z++) {
    for (let x = 0; x < width; x++) {
      slice[z * width + x] = volume.data[z * width * height + yClamped * width + x];
    }
  }
  return slice;
}

export function applyWindowing(
  sliceData: Float32Array,
  windowCenter: number,
  windowWidth: number
): Uint8ClampedArray {
  const output = new Uint8ClampedArray(sliceData.length);
  const lower = windowCenter - windowWidth / 2;
  const upper = windowCenter + windowWidth / 2;
  const range = upper - lower;
  if (range <= 0) {
    output.fill(128);
    return output;
  }

  for (let i = 0; i < sliceData.length; i++) {
    const val = sliceData[i];
    if (val <= lower) {
      output[i] = 0;
    } else if (val >= upper) {
      output[i] = 255;
    } else {
      output[i] = Math.round(((val - lower) / range) * 255);
    }
  }
  return output;
}
