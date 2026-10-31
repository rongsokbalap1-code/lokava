import type { Metadata } from 'next';
import FavoritesPageClient from '@/app/_components/FavoritesPageClient';
export const metadata: Metadata = { title: 'Favorit tersimpan', robots: { index: false, follow: false } };
export default function FavoritesPage() { return <FavoritesPageClient />; }
