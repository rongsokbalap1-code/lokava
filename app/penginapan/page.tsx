import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';

export async function generateMetadata():Promise<Metadata>{let records=await getPublishedRecords('businesses',100);records=records.filter(r=>String(r.category||'').toLocaleLowerCase('id-ID')==='penginapan');const indexable=records.filter(r=>isIndexableRecord(r,'business')).length>=3;return listingMetadata('Penginapan Lokal untuk Perjalanan Indonesia','Jelajahi penginapan lokal yang telah disetujui. Hubungi pemilik untuk mengecek harga dan ketersediaan.','/penginapan',indexable)}
export default function StaysPage(){return <DirectoryPage title={<>Tempat beristirahat <em>di sekitar pesisir.</em></>} eyebrow="PENGINAPAN" description="Informasi penginapan yang ditampilkan telah ditinjau. Hubungi pemilik untuk mengecek harga dan ketersediaan; LOKAVA tidak melakukan pemesanan otomatis." collectionName="businesses" kind="business" filterCategory="Penginapan"/>}
