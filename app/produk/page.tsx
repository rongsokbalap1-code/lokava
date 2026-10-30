import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';

export async function generateMetadata():Promise<Metadata>{const records=await getPublishedRecords('products',100);const indexable=records.filter(r=>isIndexableRecord(r,'product')).length>=3;return listingMetadata('Produk UMKM dan Produk Lokal Indonesia','Jelajahi produk dari pelaku usaha lokal yang telah disetujui. Hubungi penjual untuk memastikan harga dan ketersediaan.','/produk',indexable)}
export default function ProductsPage(){return <DirectoryPage title={<>Karya lokal, <em>cerita nyata.</em></>} eyebrow="KATALOG PRODUK" description="Lihat produk dari penjual terdaftar. Transaksi dan ketersediaan dikonfirmasi langsung kepada pemilik melalui WhatsApp." collectionName="products" kind="product"/>}
