import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://brainaxis.vercel.app';
  const lastMod = '2026-03-31';
  return [
    { url: baseUrl, lastModified: lastMod, changeFrequency: 'weekly', priority: 1 },
    { url: `${baseUrl}/about`, lastModified: lastMod, changeFrequency: 'monthly', priority: 0.8 },
    { url: `${baseUrl}/how-to-use`, lastModified: lastMod, changeFrequency: 'monthly', priority: 0.8 },
  ];
}
