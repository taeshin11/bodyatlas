export const FEATURES = {
  atlasViewer: true,
  labelOverlay: true,
  structureSearch: true,
  multiLanguage: true,
  pwaOffline: true,
  quizMode: false,
  dicomUpload: false,
  aiAutoLabel: false,
  premiumTier: false,
} as const;

export type FeatureKey = keyof typeof FEATURES;

export function isFeatureEnabled(key: FeatureKey): boolean {
  return FEATURES[key];
}
