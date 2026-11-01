import type { Metadata } from 'next';
import { readPublicSiteSettings } from '@/lib/server/site-settings';

export type SeoRecord = Record<string, unknown> & { id: string };

export async function siteOrigin(): Promise<string | null> {
  const settings = await readPublicSiteSettings();
  const raw = settings.siteUrl || process.env.NEXT_PUBLIC_SITE_URL;
  if (!raw) return null;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' && url.hostname !== 'localhost') return null;
    if (url.username || url.password || url.pathname !== '/' || url.search || url.hash) return null;
    return url.origin.replace(/\/$/, '');
  } catch {
    return null;
  }
}

function absoluteUrlFromOrigin(origin: string | null, path: string): string | undefined {
  if (!origin) return undefined;
  return `${origin}/${path.replace(/^\/+/, '')}`.replace(/\/$/, path === '/' ? '/' : '');
}

export async function absoluteUrl(path: string): Promise<string | undefined> {
  return absoluteUrlFromOrigin(await siteOrigin(), path);
}

export function cleanSeoText(value: unknown, max = 300): string {
  if (typeof value !== 'string') return '';
  return value.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim().slice(0, max);
}

export function recordTitle(record: SeoRecord): string {
  return cleanSeoText(record.seoTitle || record.title || record.name, 100);
}

export function recordDescription(record: SeoRecord): string {
  return cleanSeoText(record.seoDescription || record.excerpt || record.description || record.body || record.content, 300);
}

export function recordImage(record: SeoRecord): string | undefined {
  if (Array.isArray(record.photos)) {
    const first = record.photos.find((photo) => !!photo && typeof photo === 'object' && typeof (photo as { url?: unknown }).url === 'string') as { url: string } | undefined;
    if (first?.url && /^https:\/\//i.test(first.url)) return first.url;
  }
  return typeof record.image === 'string' && /^https:\/\//i.test(record.image) ? record.image : undefined;
}

export function isIndexableRecord(record: SeoRecord, kind: 'destination' | 'business' | 'product' | 'article' | 'package'): boolean {
  const title = recordTitle(record);
  const contentDescription = cleanSeoText(record.excerpt || record.description || record.body || record.content, 300);
  if (title.length < 3 || contentDescription.length < 60) return false;
  if (kind === 'business' && record.verified !== true) return false;
  if (kind === 'product' && record.verified !== true) return false;
  if (kind === 'article' && cleanSeoText(record.body || record.content, 100).length < 80) return false;
  return true;
}

export async function entityMetadata(record: SeoRecord, path: string, kind: 'destination' | 'business' | 'product' | 'article' | 'package'): Promise<Metadata> {
  const title = recordTitle(record) || 'Informasi lokal';
  const description = recordDescription(record) || 'Jelajahi informasi lokal yang telah ditinjau di LOKAVA.';
  const image = recordImage(record);
  const [origin, settings] = await Promise.all([siteOrigin(), readPublicSiteSettings()]);
  const url = absoluteUrlFromOrigin(origin, path);
  const indexable = settings.searchIndexingEnabled && isIndexableRecord(record, kind);
  return {
    title: { absolute: title.includes('| LOKAVA') ? title : `${title} | LOKAVA` },
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: { index: indexable, follow: true, googleBot: { index: indexable, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: { title, description, type: kind === 'article' ? 'article' : 'website', url, siteName: 'LOKAVA', locale: 'id_ID', images: image ? [{ url: image, alt: title }] : undefined },
    twitter: { card: image ? 'summary_large_image' : 'summary', title, description, images: image ? [image] : undefined },
  };
}

export function jsonLdScript(data: Record<string, unknown>): string {
  return JSON.stringify(data).replace(/</g, '\\u003c').replace(/>/g, '\\u003e').replace(/&/g, '\\u0026');
}

export function slugifyRegion(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}

export async function listingMetadata(title: string, description: string, path: string, indexable: boolean): Promise<Metadata> {
  const [origin, settings] = await Promise.all([siteOrigin(), readPublicSiteSettings()]);
  const url = absoluteUrlFromOrigin(origin, path);
  const shouldIndex = indexable && settings.searchIndexingEnabled;
  return {
    title,
    description,
    alternates: url ? { canonical: url } : undefined,
    robots: { index: shouldIndex, follow: true, googleBot: { index: shouldIndex, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: { title, description, type: 'website', url, siteName: settings.siteTitle, locale: 'id_ID' },
    twitter: { card: 'summary', title, description },
  };
}
