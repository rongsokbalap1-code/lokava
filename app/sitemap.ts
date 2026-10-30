import type { MetadataRoute } from 'next';
import { getAllPublishedRecords, safeMapsUrl } from '@/lib/server/public-content';
import { readPublicSiteSettings } from '@/lib/server/site-settings';
import { isIndexableRecord, slugifyRegion, siteOrigin, type SeoRecord } from '@/lib/seo';
export const dynamic = 'force-dynamic';
function lastModified(record: SeoRecord): Date {
  const raw = record.updatedAt || record.publishedAt || record.createdAt;
  if (raw && typeof raw === 'object' && 'toDate' in raw && typeof (raw as { toDate?: unknown }).toDate === 'function') return (raw as { toDate: () => Date }).toDate();
  if (typeof raw === 'string' || typeof raw === 'number') { const date = new Date(raw); if (!Number.isNaN(date.getTime())) return date; }
  return new Date();
}
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [site, settings] = await Promise.all([siteOrigin(), readPublicSiteSettings()]);
  if (!site || !settings.searchIndexingEnabled) return [];
  const [businesses, products, destinations, articles, packages] = await Promise.all([
    getAllPublishedRecords('businesses'), getAllPublishedRecords('products'), getAllPublishedRecords('destinations'), getAllPublishedRecords('articles'), getAllPublishedRecords('packages'),
  ]);
  const countIndexable = (records: SeoRecord[], kind: 'destination' | 'business' | 'product' | 'article' | 'package') => records.filter((record) => isIndexableRecord(record, kind)).length;
  const staticPaths = ['', '/tentang', '/kontak'];
  if (countIndexable(destinations, 'destination') >= 3) staticPaths.push('/wisata');
  if (countIndexable(businesses, 'business') >= 3) staticPaths.push('/usaha');
  if (countIndexable(products, 'product') >= 3) staticPaths.push('/produk');
  if (countIndexable(articles, 'article') >= 3) staticPaths.push('/artikel');
  if (countIndexable(packages, 'package') >= 3) staticPaths.push('/paket');
  if (businesses.filter((r) => String(r.category || '').toLocaleLowerCase('id-ID') === 'kuliner' && isIndexableRecord(r, 'business')).length >= 3) staticPaths.push('/kuliner');
  if (businesses.filter((r) => String(r.category || '').toLocaleLowerCase('id-ID') === 'penginapan' && isIndexableRecord(r, 'business')).length >= 3) staticPaths.push('/penginapan');
  if ([...businesses, ...destinations].filter((r) => !!safeMapsUrl(r)).length >= 3) staticPaths.push('/peta');
  const base: MetadataRoute.Sitemap = staticPaths.map((path) => ({ url: `${site}${path || '/'}`, changeFrequency: 'weekly', priority: path === '' ? 1 : 0.55 }));
  const businessPages = businesses.filter((r) => isIndexableRecord(r, 'business')).map((r) => ({ url: `${site}/usaha/${r.id}`, lastModified: lastModified(r), changeFrequency: 'weekly' as const, priority: 0.7 }));
  const productPages = products.filter((r) => isIndexableRecord(r, 'product')).map((r) => ({ url: `${site}/produk/${r.id}`, lastModified: lastModified(r), changeFrequency: 'weekly' as const, priority: 0.65 }));
  const destinationPages = destinations.filter((r) => isIndexableRecord(r, 'destination')).map((r) => ({ url: `${site}/wisata/${r.id}`, lastModified: lastModified(r), changeFrequency: 'monthly' as const, priority: 0.75 }));
  const articlePages = articles.filter((r) => isIndexableRecord(r, 'article')).map((r) => ({ url: `${site}/artikel/${String(r.slug || r.id)}`, lastModified: lastModified(r), changeFrequency: 'monthly' as const, priority: 0.65 }));
  const packagePages = packages.filter((r) => isIndexableRecord(r, 'package')).map((r) => ({ url: `${site}/paket/${String(r.slug || r.id)}`, lastModified: lastModified(r), changeFrequency: 'monthly' as const, priority: 0.6 }));
  const regions = new Map<string, { area: string; count: number; lastModified: Date }>();
  const regionSources: Array<{ records: SeoRecord[]; kind: 'destination' | 'business' | 'product' | 'package' }> = [
    { records: destinations, kind: 'destination' }, { records: businesses, kind: 'business' }, { records: products, kind: 'product' }, { records: packages, kind: 'package' },
  ];
  for (const source of regionSources) for (const record of source.records) {
    const area = typeof record.area === 'string' ? record.area.trim() : '';
    const slug = slugifyRegion(area);
    if (!area || !slug || !isIndexableRecord(record, source.kind)) continue;
    const previous = regions.get(slug);
    const modified = lastModified(record);
    regions.set(slug, { area, count: (previous?.count || 0) + 1, lastModified: modified > (previous?.lastModified || new Date(0)) ? modified : previous!.lastModified });
  }
  const regionPages = [...regions.entries()].filter(([, region]) => region.count >= 3).map(([slug, region]) => ({ url: `${site}/wilayah/${slug}`, lastModified: region.lastModified, changeFrequency: 'weekly' as const, priority: 0.65 }));
  const unique = new Map<string, MetadataRoute.Sitemap[number]>();
  for (const item of [...base, ...businessPages, ...productPages, ...destinationPages, ...articlePages, ...packagePages, ...regionPages]) unique.set(item.url, item);
  return [...unique.values()];
}
