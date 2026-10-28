import type { Metadata } from 'next';
import SearchPageClient from '@/app/_components/SearchPageClient';
export const metadata: Metadata = { title: 'Pencarian', description: 'Cari konten lokal di LOKAVA.', robots: { index: false, follow: true } };
export default function SearchPage() { return <SearchPageClient />; }
