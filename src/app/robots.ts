import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;
  return {
    rules: [
      // Default rule - allow all well-behaved crawlers
      { userAgent: '*', allow: '/', disallow: ['/api/', '/data/'] },
      // Explicitly allow major search engine crawlers
      { userAgent: 'Googlebot', allow: '/' },
      { userAgent: 'Bingbot', allow: '/' },
      { userAgent: 'Slurp', allow: '/' }, // Yahoo
      { userAgent: 'DuckDuckBot', allow: '/' },
      { userAgent: 'YandexBot', allow: '/' },
      { userAgent: 'Baiduspider', allow: '/' },
      { userAgent: 'Yeti', allow: '/' }, // Naver
      { userAgent: 'NaverBot', allow: '/' },
      { userAgent: 'Daumoa', allow: '/' }, // Daum (Korea)
      { userAgent: 'Applebot', allow: '/' },
      { userAgent: 'SeznamBot', allow: '/' }, // Czech
      { userAgent: 'facebookexternalhit', allow: '/' },
      { userAgent: 'Twitterbot', allow: '/' },
      { userAgent: 'LinkedInBot', allow: '/' },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
