import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site-config';

export default function robots(): MetadataRoute.Robots {
  const baseUrl = SITE_URL;
  // Single `*` rule covers every crawler. Previously, named blocks (Googlebot
  // etc.) only carried `allow: '/'` with no disallow — per robots.txt spec,
  // a named User-Agent block OVERRIDES `*`, so Googlebot was effectively
  // allowed to crawl /api/ and /data/. Collapsing to one rule fixes that.
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: ['/api/', '/data/'] },
    ],
    sitemap: `${baseUrl}/sitemap.xml`,
    host: baseUrl,
  };
}
