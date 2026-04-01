import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://bodyatlas.vercel.app';
  const lastMod = '2026-04-01';
  return [
    { url: baseUrl, lastModified: lastMod, changeFrequency: 'weekly', priority: 1 },
  ];
}
