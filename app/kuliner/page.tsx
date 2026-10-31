import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';

export async function generateMetadata():Promise<Metadata>{let records=await getPublishedRecords('businesses',100);records=records.filter(r=>String(r.category||'').toLocaleLowerCase('id-ID')==='kuliner');const indexable=records.filter(r=>isIndexableRecord(r,'business')).length>=3;return listingMetadata('Kuliner Lokal dan Tempat Makan','Jelajahi usaha kuliner lokal yang telah disetujui. Konfirmasikan menu, harga, jam buka, dan ketersediaan langsung kepada pemilik.','/kuliner',indexable)}
export default function CulinaryPage(){return <DirectoryPage title={<>Rasa lokal, <em>lebih dekat.</em></>} eyebrow="KULINER" description="Temukan usaha kuliner yang telah ditinjau. Konfirmasikan menu, harga, jam buka, dan ketersediaan langsung kepada pemilik." collectionName="businesses" kind="business" filterCategory="Kuliner"/>}
