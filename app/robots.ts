import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/seo';
import { readPublicSiteSettings } from '@/lib/server/site-settings';
export default async function robots(): Promise<MetadataRoute.Robots> {
  const [site, settings] = await Promise.all([siteOrigin(), readPublicSiteSettings()]);
  const rules: MetadataRoute.Robots['rules'] = [{ userAgent: '*', allow: '/', disallow: ['/admin', '/penjual', '/api', '/favorit'] }];
  // Keep public pages crawlable when indexing is disabled so crawlers can see noindex metadata.
  return { rules, ...(site && settings.searchIndexingEnabled ? { sitemap: `${site}/sitemap.xml`, host: site } : {}) };
}
