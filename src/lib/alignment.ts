import { mat4, vec3 } from 'gl-matrix';
import { DicomVolume } from './dicom';

export interface Point3D {
  x: number;
  y: number;
  z: number;
}

export interface AlignmentResult {
  rotationMatrix: mat4;
  pitchDeg: number;
  rollDeg: number;
  yawDeg: number;
}

export function computeACPCAlignment(ac: Point3D, pc: Point3D): AlignmentResult {
  // AC-PC vector (from PC to AC)
  const acpcVec = vec3.fromValues(ac.x - pc.x, ac.y - pc.y, ac.z - pc.z);
  vec3.normalize(acpcVec, acpcVec);

  // Target: AC-PC should be along the Y axis (anterior-posterior) in standard orientation
  // We want AC-PC line to be horizontal in axial plane
  const targetVec = vec3.fromValues(0, 1, 0);

  // Compute rotation axis and angle
  const rotAxis = vec3.create();
  vec3.cross(rotAxis, acpcVec, targetVec);
  const axisLength = vec3.length(rotAxis);

  const rotMatrix = mat4.create();

  if (axisLength > 0.0001) {
    vec3.normalize(rotAxis, rotAxis);
    const angle = Math.acos(Math.max(-1, Math.min(1, vec3.dot(acpcVec, targetVec))));
    mat4.fromRotation(rotMatrix, angle, rotAxis);
  }

  // Extract Euler angles (pitch, roll, yaw)
  const pitchDeg = Math.atan2(rotMatrix[6], rotMatrix[10]) * (180 / Math.PI);
  const rollDeg = Math.atan2(-rotMatrix[2], Math.sqrt(rotMatrix[6] ** 2 + rotMatrix[10] ** 2)) * (180 / Math.PI);
  const yawDeg = Math.atan2(rotMatrix[1], rotMatrix[0]) * (180 / Math.PI);

  return { rotationMatrix: rotMatrix, pitchDeg, rollDeg, yawDeg };
}

export function buildRotationMatrix(pitchDeg: number, rollDeg: number, yawDeg: number): mat4 {
  const pitch = pitchDeg * (Math.PI / 180);
  const roll = rollDeg * (Math.PI / 180);
  const yaw = yawDeg * (Math.PI / 180);

  const rx = mat4.create();
  mat4.fromXRotation(rx, pitch);

  const ry = mat4.create();
  mat4.fromYRotation(ry, roll);

  const rz = mat4.create();
  mat4.fromZRotation(rz, yaw);

  const result = mat4.create();
  mat4.multiply(result, ry, rx);
  mat4.multiply(result, rz, result);
  return result;
}

export function resliceVolume(
  volume: DicomVolume,
  rotMatrix: mat4,
  center: Point3D
): DicomVolume {
  const { width, height, depth, voxelSpacing, data } = volume;
  const newData = new Float32Array(width * height * depth);

  const invMatrix = mat4.create();
  mat4.invert(invMatrix, rotMatrix);

  const cx = center.x;
  const cy = center.y;
  const cz = center.z;

  for (let z = 0; z < depth; z++) {
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        // Transform from output space back to input space
        const dx = (x - cx) * voxelSpacing[0];
        const dy = (y - cy) * voxelSpacing[1];
        const dz = (z - cz) * voxelSpacing[2];

        const srcVec = vec3.fromValues(dx, dy, dz);
        const outVec = vec3.create();
        vec3.transformMat4(outVec, srcVec, invMatrix);

        const sx = outVec[0] / voxelSpacing[0] + cx;
        const sy = outVec[1] / voxelSpacing[1] + cy;
        const sz = outVec[2] / voxelSpacing[2] + cz;

        // Trilinear interpolation
        newData[z * width * height + y * width + x] = trilinearInterpolate(
          data, width, height, depth, sx, sy, sz
        );
      }
    }
  }

  return {
    ...volume,
    data: newData,
  };
}

function trilinearInterpolate(
  data: Float32Array,
  width: number,
  height: number,
  depth: number,
  x: number,
  y: number,
  z: number
): number {
  const x0 = Math.floor(x);
  const y0 = Math.floor(y);
  const z0 = Math.floor(z);
  const x1 = x0 + 1;
  const y1 = y0 + 1;
  const z1 = z0 + 1;

  if (x0 < 0 || x1 >= width || y0 < 0 || y1 >= height || z0 < 0 || z1 >= depth) {
    return 0;
  }

  const xd = x - x0;
  const yd = y - y0;
  const zd = z - z0;

  const idx = (iz: number, iy: number, ix: number) => iz * width * height + iy * width + ix;

  const c000 = data[idx(z0, y0, x0)];
  const c001 = data[idx(z0, y0, x1)];
  const c010 = data[idx(z0, y1, x0)];
  const c011 = data[idx(z0, y1, x1)];
  const c100 = data[idx(z1, y0, x0)];
  const c101 = data[idx(z1, y0, x1)];
  const c110 = data[idx(z1, y1, x0)];
  const c111 = data[idx(z1, y1, x1)];

  const c00 = c000 * (1 - xd) + c001 * xd;
  const c01 = c010 * (1 - xd) + c011 * xd;
  const c10 = c100 * (1 - xd) + c101 * xd;
  const c11 = c110 * (1 - xd) + c111 * xd;

  const c0 = c00 * (1 - yd) + c01 * yd;
  const c1 = c10 * (1 - yd) + c11 * yd;

  return c0 * (1 - zd) + c1 * zd;
}
