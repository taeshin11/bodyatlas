import type { MetadataRoute } from 'next';

const BASE = 'https://bodyatlas-ten.vercel.app';
const LOCALES = ['en', 'ko', 'ja', 'zh', 'es', 'de', 'fr'];

function withAlternates(path: string) {
  const url = `${BASE}${path}`;
  // hreflang alternates for international SEO (Naver, Yandex, Baidu, etc.)
  const languages = Object.fromEntries([
    ...LOCALES.map((l) => [l, url]),
    ['x-default', url],
  ]);
  return { url, languages };
}

export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date().toISOString().split('T')[0];
  const pages = [
    { path: '', freq: 'weekly' as const, priority: 1.0 },
    { path: '/about', freq: 'monthly' as const, priority: 0.8 },
    { path: '/how-to-use', freq: 'monthly' as const, priority: 0.8 },
    { path: '/download', freq: 'monthly' as const, priority: 0.7 },
    { path: '/privacy', freq: 'yearly' as const, priority: 0.3 },
    { path: '/terms', freq: 'yearly' as const, priority: 0.3 },
  ];

  return pages.map((p) => {
    const { url, languages } = withAlternates(p.path);
    return {
      url,
      lastModified: now,
      changeFrequency: p.freq,
      priority: p.priority,
      alternates: { languages },
    };
  });
}
