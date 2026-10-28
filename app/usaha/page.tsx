import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';

export async function generateMetadata():Promise<Metadata>{let records=await getPublishedRecords('businesses',100);const indexable=records.filter(r=>isIndexableRecord(r,'business')).length>=3;return listingMetadata('Direktori Usaha Lokal dan UMKM Indonesia','Temukan usaha dan UMKM yang telah disetujui di LOKAVA. Periksa profil, lokasi, produk, dan kontak pemilik.','/usaha',indexable)}
export default function BusinessesPage(){return <DirectoryPage title={<>Temukan usaha <em>lokal.</em></>} eyebrow="DIREKTORI UMKM" description="Jelajahi profil usaha yang telah ditinjau. Hubungi pemilik langsung untuk memastikan informasi dan ketersediaan." collectionName="businesses" kind="business"/>}
