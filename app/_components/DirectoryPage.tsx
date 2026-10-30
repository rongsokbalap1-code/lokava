
import Link from 'next/link';
import type { ReactNode } from 'react';
import {
  ArrowLeft,
  ArrowUpRight,
  MapPin,
  Store,
  Package,
  BookOpen,
  Compass,
} from 'lucide-react';
import { getPublishedRecords } from '@/lib/server/public-content';
import FavoriteButton from '@/app/_components/FavoriteButton';

const money = (value: unknown): string => {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return '';
  }

  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
};

const textValue = (value: unknown, fallback = ''): string => {
  return typeof value === 'string' ? value : fallback;
};

export default async function DirectoryPage({
  title,
  eyebrow,
  description,
  collectionName,
  kind,
  filterCategory,
}: {
  title: ReactNode;
  eyebrow: string;
  description: string;
  collectionName: string;
  kind: 'business' | 'product' | 'destination' | 'article' | 'package';
  filterCategory?: string;
}) {
  let records = await getPublishedRecords(collectionName, 100);

  if (filterCategory) {
    records = records.filter(
      (record) =>
        textValue(record.category).toLocaleLowerCase('id-ID') ===
        filterCategory.toLocaleLowerCase('id-ID'),
    );
  }

  const Icon =
    kind === 'business'
      ? Store
      : kind === 'product'
        ? Package
        : kind === 'article'
          ? BookOpen
          : Compass;

  return (
    <main className="directory-page">
      <header className="directory-header">
        <Link href="/">
          <ArrowLeft size={16} /> Kembali ke beranda
        </Link>
        <span>LOKAVA · JELAJAHI LOKAL</span>
      </header>

      <section className="directory-intro">
        <div className="eyebrow">
          <span />
          {eyebrow}
        </div>
        <h1>{title}</h1>
        <p>{description}</p>
      </section>

      {records.length > 0 ? (
        <div className="directory-grid">
          {records.map((record) => {
            const name = textValue(
              record.name,
              textValue(record.title, 'Konten lokal'),
            );

            const photos: { url: string }[] = Array.isArray(record.photos)
              ? record.photos.flatMap((photo: unknown) => {
                  if (
                    photo !== null &&
                    typeof photo === 'object' &&
                    'url' in photo &&
                    typeof photo.url === 'string'
                  ) {
                    return [{ url: photo.url }];
                  }

                  return [];
                })
              : [];

            const image =
              photos[0]?.url ?? textValue(record.image);

            const slug = textValue(record.slug);

            const href =
              kind === 'business'
                ? `/usaha/${record.id}`
                : kind === 'product'
                  ? `/produk/${record.id}`
                  : kind === 'destination'
                    ? `/wisata/${record.id}`
                    : kind === 'article'
                      ? `/artikel/${slug || record.id}`
                      : `/paket/${slug || record.id}`;

            const category = textValue(
              record.category,
              textValue(record.area, kind),
            );

            const verified = record.verified === true;

            const descriptionText = textValue(
              record.description,
              textValue(
                record.excerpt,
                'Informasi akan dilengkapi setelah ditinjau.',
              ),
            );

            const address = textValue(
              record.address,
              textValue(record.area),
            );

            const price = money(record.price);

            return (
              <article className="directory-card" key={record.id}>
                <Link className="directory-card-image" href={href}>
                  {image ? (
                    <img src={image} alt={name} loading="lazy" />
                  ) : (
                    <span>
                      <Icon size={34} />
                      <small>LOKAVA LOKAL</small>
                    </span>
                  )}
                </Link>

                <div className="directory-card-copy">
                  <div className="directory-card-meta">
                    {category}
                    {verified && <span> · Terverifikasi</span>}
                  </div>

                  <FavoriteButton
                    id={record.id}
                    label={name}
                    type={kind}
                  />

                  <h2>
                    <Link href={href}>{name}</Link>
                  </h2>

                  <p>{descriptionText.slice(0, 220)}</p>

                  {kind === 'product' && price !== '' && (
                    <strong className="directory-price">{price}</strong>
                  )}

                  {address !== '' && (
                    <span className="directory-address">
                      <MapPin size={14} />
                      {address}
                    </span>
                  )}

                  <Link className="directory-card-link" href={href}>
                    Lihat detail <ArrowUpRight size={15} />
                  </Link>
                </div>
              </article>
            );
          })}
        </div>
      ) : (
        <div className="directory-empty">
          <Icon size={25} />
          <h2>Belum ada konten yang disetujui</h2>
          <p>
            Konten akan tampil setelah pengelola menambahkan data dan admin
            menyetujuinya. Kami tidak menampilkan data demo sebagai informasi
            terverifikasi.
          </p>
        </div>
      )}

      <footer className="directory-footer">
        <Link href="/peta">
          Jelajahi peta lokasi <ArrowUpRight size={15} />
        </Link>
        <Link href="/penjual/masuk">
          Daftarkan usaha <ArrowUpRight size={15} />
        </Link>
      </footer>
    </main>
  );
}
