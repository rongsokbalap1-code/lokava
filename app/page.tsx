import type { Metadata } from 'next';
import HomePageClient from '@/app/_components/HomePageClient';
import { siteOrigin } from '@/lib/seo';
import { readPublicSiteSettings } from '@/lib/server/site-settings';
const fallbackDescription = 'Jelajahi tempat wisata Indonesia, destinasi alam, pantai, kuliner, penginapan, dan UMKM lokal. Mulai dari Sukabumi Selatan dengan informasi yang ditinjau di LOKAVA.';
export async function generateMetadata(): Promise<Metadata> {
  const [settings, origin] = await Promise.all([readPublicSiteSettings(), siteOrigin()]);
  const title = settings.seoTitle || settings.siteTitle;
  const description = settings.seoDescription || fallbackDescription;
  return {
    title,
    description,
    alternates: origin ? { canonical: `${origin}/` } : undefined,
    robots: { index: settings.searchIndexingEnabled, follow: true, googleBot: { index: settings.searchIndexingEnabled, follow: true, 'max-image-preview': 'large', 'max-snippet': -1, 'max-video-preview': -1 } },
    openGraph: { title, description, type: 'website', locale: 'id_ID', siteName: settings.siteTitle, url: origin || undefined },
    twitter: { card: 'summary_large_image', title, description },
  };
}
export default function HomePage() { return <HomePageClient />; }
