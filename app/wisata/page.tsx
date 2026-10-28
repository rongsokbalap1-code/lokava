import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';

export async function generateMetadata():Promise<Metadata>{let records=await getPublishedRecords('destinations',100);const indexable=records.filter(r=>isIndexableRecord(r,'destination')).length>=3;return listingMetadata('Tempat Wisata Indonesia dan Destinasi Lokal','Temukan destinasi wisata yang telah disetujui di LOKAVA. Mulai dari Sukabumi Selatan, dengan informasi lokasi dan panduan yang terus dikembangkan.','/wisata',indexable)}
export default function DestinationsPage(){return <DirectoryPage title={<>Temukan tempat <em>untuk dijelajahi.</em></>} eyebrow="DESTINASI SUKABUMI SELATAN" description="Informasi destinasi ditampilkan sesuai data yang disediakan dan disetujui. Detail fasilitas, jam, dan biaya hanya tersedia bila memang tercatat." collectionName="destinations" kind="destination"/>}
