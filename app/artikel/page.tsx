import type { Metadata } from 'next';
import { getPublishedRecords } from '@/lib/server/public-content';
import { isIndexableRecord, listingMetadata } from '@/lib/seo';
import DirectoryPage from '@/app/_components/DirectoryPage';

export async function generateMetadata():Promise<Metadata>{const records=await getPublishedRecords('articles',100);const indexable=records.filter(r=>isIndexableRecord(r,'article')).length>=3;return listingMetadata('Artikel Wisata, Panduan Liburan dan Cerita Lokal','Baca panduan perjalanan, informasi destinasi, dan cerita lokal yang ditinjau sebelum diterbitkan di LOKAVA.','/artikel',indexable)}
export default function ArticlesPage(){return <DirectoryPage title={<>Cerita dan panduan <em>lokal.</em></>} eyebrow="JURNAL LOKAVA" description="Panduan dan cerita akan diterbitkan setelah ditinjau. Periksa tanggal dan sumber informasi pada masing-masing artikel." collectionName="articles" kind="article"/>}
