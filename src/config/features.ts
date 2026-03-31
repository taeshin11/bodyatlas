export const FEATURES = {
  singleSeriesUpload: true,
  triPlaneViewer: true,
  acpcAlignment: true,
  manualRotation: true,
  exportDicom: true,
  exportPng: true,
  batchProcessing: false,
  cloudSessionHistory: false,
  customPresets: false,
  prioritySupport: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
