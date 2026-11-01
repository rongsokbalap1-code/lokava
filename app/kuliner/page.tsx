import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';
export async function generateMetadata(): Promise<Metadata> { const records = (await getPublishedRecords('products', 100)).filter((r) => String(r.category || '').toLocaleLowerCase('id-ID') === 'kuliner'); const indexable = records.filter((r) => isIndexableRecord(r, 'product')).length >= 3; return listingMetadata('Kuliner Lokal dan Produk Makanan', 'Temukan makanan dan pengalaman kuliner dari penjual lokal yang telah disetujui di LOKAVA.', '/kuliner', indexable); }
export default function CulinaryPage() { return <DirectoryPage title={<>Rasa lokal, <em>lebih dekat.</em></>} eyebrow="KULINER" description="Jelajahi produk makanan dan pengalaman kuliner dari penjual terdaftar. Hubungi penjual untuk memastikan menu, harga, dan ketersediaan." collectionName="products" kind="product" filterCategory="Kuliner" />; }
