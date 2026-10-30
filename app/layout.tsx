import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';
import 'leaflet/dist/leaflet.css';
import { readPublicSiteSettings } from '@/lib/server/site-settings';
import { jsonLdScript, siteOrigin } from '@/lib/seo';
export const revalidate = 300;
export async function generateMetadata(): Promise<Metadata> {
  const settings = await readPublicSiteSettings();
  const origin = await siteOrigin();
  const title = settings.seoTitle || settings.siteTitle;
  const description = settings.seoDescription;
  return {
    metadataBase: origin ? new URL(origin) : undefined,
    title: { default: title, template: `%s | ${settings.siteTitle}` },
    description,
    applicationName: settings.siteTitle,
    manifest: '/manifest.webmanifest',
    icons: { icon: [{ url: '/icons/lokava-192.png', sizes: '192x192', type: 'image/png' }, { url: '/icons/lokava-512.png', sizes: '512x512', type: 'image/png' }], apple: [{ url: '/icons/lokava-192.png', sizes: '192x192', type: 'image/png' }] },
    keywords: ['wisata Indonesia', 'tempat wisata', 'wisata Sukabumi', 'wisata Jawa Barat', 'destinasi wisata', 'kuliner lokal', 'penginapan lokal', 'UMKM Indonesia', 'LOKAVA'],
    robots: { index: settings.searchIndexingEnabled, follow: true, googleBot: { index: settings.searchIndexingEnabled, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    verification: settings.googleSiteVerification ? { google: settings.googleSiteVerification } : undefined,
    openGraph: { title, description, type: 'website', locale: 'id_ID', siteName: settings.siteTitle },
    twitter: { card: 'summary_large_image', title, description },
  };
}
export const viewport: Viewport = { themeColor: '#123d42', width: 'device-width', initialScale: 1 };
export default async function RootLayout({ children }: { children: ReactNode }) { const settings = await readPublicSiteSettings(); const origin = await siteOrigin(); const schema = [{ '@context': 'https://schema.org', '@type': 'Organization', name: settings.siteTitle, description: settings.seoDescription, url: origin || undefined, email: settings.supportEmail || undefined, telephone: settings.supportWhatsApp ? `+${settings.supportWhatsApp}` : undefined, address: settings.supportAddress ? { '@type': 'PostalAddress', streetAddress: settings.supportAddress, addressCountry: 'ID' } : undefined, sameAs: Object.values(settings.socialLinks).filter(Boolean) }, { '@context': 'https://schema.org', '@type': 'WebSite', name: settings.siteTitle, description: settings.seoDescription, url: origin || undefined, inLanguage: 'id-ID', potentialAction: origin ? { '@type': 'SearchAction', target: `${origin}/cari?q={search_term_string}`, 'query-input': 'required name=search_term_string' } : undefined }]; return <html lang="id"><body><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdScript({ '@graph': schema }) }}/>{children}</body></html>; }
