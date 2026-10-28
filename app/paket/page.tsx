import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';

export async function generateMetadata():Promise<Metadata>{let records=await getPublishedRecords('packages',100);const indexable=records.filter(r=>isIndexableRecord(r,'package')).length>=3;return listingMetadata('Paket Wisata dan Perjalanan Lokal','Jelajahi paket wisata lokal yang dipublikasikan di LOKAVA. Hubungi penyedia untuk memastikan jadwal, harga, dan ketersediaan.','/paket',indexable)}
export default function PackagesPage(){return <DirectoryPage title={<>Rencanakan perjalanan <em>lokal.</em></>} eyebrow="PAKET WISATA" description="Paket yang tersedia ditampilkan sesuai informasi dari pengelola. Konfirmasikan detail dan ketersediaan kepada penyedia sebelum melakukan perjalanan." collectionName="packages" kind="package"/>}
