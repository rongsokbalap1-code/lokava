import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight, MapPin, ShieldCheck } from 'lucide-react';
import { places } from '@/lib/data';

type Props = { params: Promise<{ slug: string }> };

export function generateStaticParams() {
  return places.map((place) => ({ slug: place.id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const place = places.find((item) => item.id === slug);
  if (!place) return { title: 'Informasi tidak ditemukan', robots: { index: false, follow: true } };
  return {
    title: { absolute: `${place.name} | LOKAVA` },
    description: place.description,
    robots: { index: false, follow: true },
    openGraph: { title: `${place.name} | LOKAVA`, description: place.description, images: [place.image] },
  };
}

export default async function DetailPage({ params }: Props) {
  const { slug } = await params;
  const place = places.find((item) => item.id === slug);
  if (!place) notFound();

  return (
    <main className="detail-page">
      <header className="detail-header"><Link className="detail-back" href="/#jelajah"><ArrowLeft size={17} /> Kembali menjelajah</Link><Link className="detail-brand" href="/">LOKAVA <span>JELAJAHI SUKABUMI SELATAN</span></Link></header>
      <article className="detail-content">
        <div className="detail-image-wrap"><img className="detail-image" src={place.image} alt={`Ilustrasi ${place.name}`} /><span className="detail-tag">{place.tag}</span></div>
        <div className="detail-meta"><span>{place.type}</span><span className="meta-dot"/><span><MapPin size={13} /> {place.area}</span></div>
        <h1>{place.name}</h1>
        <p className="detail-description">{place.description}</p>
        <div className="detail-notice"><ShieldCheck size={19}/><div><strong>Informasi belum diverifikasi</strong><p>Halaman ini memakai data ilustrasi untuk pengembangan. Pastikan alamat, fasilitas, biaya, jam operasional, dan ketersediaan langsung kepada pengelola sebelum berkunjung.</p></div></div>
        <div className="detail-actions"><Link className="button button-dark" href="/#jelajah">Lihat tempat lainnya <ArrowUpRight size={16}/></Link><a className="button button-outline" href="https://www.openstreetmap.org/" target="_blank" rel="noreferrer">Buka OpenStreetMap <ArrowUpRight size={16}/></a></div>
        <p className="detail-footnote">LOKAVA tidak menampilkan pin navigasi untuk tempat ini karena koordinat terverifikasi belum tersedia.</p>
      </article>
    </main>
  );
}
