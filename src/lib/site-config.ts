export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.trim() || 'https://bodyatlas-ten.vercel.app';

export const SITE_HOST = new URL(SITE_URL).host;

export const OG_IMAGE = `${SITE_URL}/opengraph-image`;

export function siteUrl(path: string = ''): string {
  if (!path) return SITE_URL;
  return `${SITE_URL}${path.startsWith('/') ? '' : '/'}${path}`;
}
