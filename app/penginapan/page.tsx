import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';
export async function generateMetadata(): Promise<Metadata> { const records = (await getPublishedRecords('products', 100)).filter((r) => String(r.category || '').toLocaleLowerCase('id-ID') === 'penginapan'); const indexable = records.filter((r) => isIndexableRecord(r, 'product')).length >= 3; return listingMetadata('Penginapan Lokal untuk Perjalanan Indonesia', 'Temukan layanan dan penawaran penginapan dari penyedia lokal yang telah disetujui.', '/penginapan', indexable); }
export default function StaysPage() { return <DirectoryPage title={<>Tempat beristirahat <em>di sekitar pesisir.</em></>} eyebrow="PENGINAPAN" description="Jelajahi layanan penginapan dari penyedia lokal. Hubungi penjual untuk mengecek harga dan ketersediaan; LOKAVA tidak melakukan pemesanan otomatis." collectionName="products" kind="product" filterCategory="Penginapan" />; }
