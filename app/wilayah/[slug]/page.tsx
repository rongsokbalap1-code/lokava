import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, MapPin } from 'lucide-react';
import { getAllPublishedRecords, type PublicRecord } from '@/lib/server/public-content';
import { absoluteUrl, isIndexableRecord, recordDescription, recordImage, recordTitle, slugifyRegion, siteOrigin } from '@/lib/seo';
export const dynamic = 'force-dynamic';
type Props = { params: Promise<{ slug: string }> };
type RegionItem = PublicRecord & { kind: 'destination' | 'business' | 'product' | 'package'; href: string; displayName: string };
async function regionItems(slug: string): Promise<{ area: string; items: RegionItem[] } | null> {
  const [destinations, businesses, products, packages] = await Promise.all([getAllPublishedRecords('destinations'), getAllPublishedRecords('businesses'), getAllPublishedRecords('products'), getAllPublishedRecords('packages')]);
  const groups: Array<{ records: PublicRecord[]; kind: RegionItem['kind']; path: string }> = [
    { records: destinations.filter((r) => isIndexableRecord(r, 'destination')), kind: 'destination', path: '/wisata' },
    { records: businesses.filter((r) => isIndexableRecord(r, 'business')), kind: 'business', path: '/usaha' },
    { records: products.filter((r) => isIndexableRecord(r, 'product')), kind: 'product', path: '/produk' },
    { records: packages.filter((r) => isIndexableRecord(r, 'package')), kind: 'package', path: '/paket' },
  ];
  const items: RegionItem[] = [];
  let area = '';
  for (const group of groups) for (const record of group.records) {
    const candidate = typeof record.area === 'string' ? record.area.trim() : '';
    if (!candidate || slugifyRegion(candidate) !== slug) continue;
    area = candidate;
    items.push({ ...record, kind: group.kind, href: `${group.path}/${group.kind === 'package' ? String(record.slug || record.id) : record.id}`, displayName: String(record.name || record.title || 'Konten lokal') });
  }
  return items.length >= 3 && area ? { area, items } : null;
}
export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params; const region = await regionItems(slug);
  if (!region) return { title: 'Wilayah tidak tersedia', robots: { index: false, follow: true } };
  const title = `Wisata dan tempat menarik di ${region.area}`;
  const description = `Jelajahi ${region.items.length} destinasi wisata, usaha lokal, produk, dan paket yang telah ditinjau di ${region.area}. Lihat informasi lokasi dan detailnya di LOKAVA.`;
  const url = await absoluteUrl(`/wilayah/${slug}`);
  return { title: { absolute: `${title} | LOKAVA` }, description, alternates: url ? { canonical: url } : undefined, openGraph: { title, description, url, siteName: 'LOKAVA', locale: 'id_ID', type: 'website' }, twitter: { card: 'summary', title, description } };
}
export default async function RegionPage({ params }: Props) {
  const { slug } = await params; const region = await regionItems(slug); if (!region) notFound();
  const origin = await siteOrigin();
  const url = origin ? `${origin}/wilayah/${slug}` : undefined;
  const itemUrls = region.items.map((item) => origin ? `${origin}/${item.href.replace(/^\/+/, '')}` : undefined);
  const jsonLd = { '@context': 'https://schema.org', '@type': 'CollectionPage', name: `Wisata dan tempat menarik di ${region.area}`, description: `Daftar konten lokal yang telah ditinjau di ${region.area}.`, ...(url ? { url } : {}), mainEntity: { '@type': 'ItemList', itemListElement: region.items.map((item, index) => ({ '@type': 'ListItem', position: index + 1, name: item.displayName, ...(itemUrls[index] ? { url: itemUrls[index] } : {}) })) } };
  return <main className="directory-page"><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}/><header className="directory-header"><Link href="/"><ArrowLeft size={16}/> Kembali ke beranda</Link><span>LOKAVA · JELAJAHI WILAYAH</span></header><section className="directory-intro"><div className="eyebrow"><span/> DIREKTORI WILAYAH</div><h1>Jelajahi <em>{region.area}.</em></h1><p>Temukan destinasi, usaha, produk, dan paket yang memiliki informasi cukup dan telah disetujui untuk ditampilkan.</p></section><div className="directory-grid">{region.items.map((item) => { const image = recordImage(item); const desc = recordDescription(item); return <article className="directory-card" key={`${item.kind}:${item.id}`}><Link className="directory-card-image" href={item.href}>{image ? <img src={image} alt={item.displayName} loading="lazy"/> : <span><MapPin size={28}/><small>{item.kind.toUpperCase()}</small></span>}</Link><div className="directory-card-copy"><div className="directory-card-meta">{item.kind === 'destination' ? 'Wisata' : item.kind === 'business' ? 'Usaha lokal' : item.kind === 'product' ? 'Produk' : 'Paket wisata'}</div><h2><Link href={item.href}>{item.displayName}</Link></h2><p>{desc.slice(0,220)}</p><Link className="directory-card-link" href={item.href}>Lihat detail <ArrowUpRight size={15}/></Link></div></article> })}</div><footer className="directory-footer"><Link href="/wisata">Semua wisata <ArrowUpRight size={15}/></Link><Link href="/peta">Buka peta <ArrowUpRight size={15}/></Link></footer></main>;
}
