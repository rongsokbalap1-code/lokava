import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowLeft, Sparkles } from 'lucide-react';
import PromotionList from './PromotionList';

export const metadata: Metadata = {
  title: 'Promosi Pilihan',
  description: 'Temukan produk dan layanan lokal yang sedang dipromosikan di LOKAVA.',
  alternates: { canonical: '/promosi' },
};

export default function PromotionsPage() {
  return <main className="directory-page promotions-page">
    <header className="directory-header"><Link href="/"><ArrowLeft size={16}/> Kembali ke beranda</Link><span>LOKAVA · PROMOSI PILIHAN</span></header>
    <section className="directory-intro"><div className="eyebrow"><span/> <Sparkles size={13}/> PILIHAN PENJUAL</div><h1>Temukan penawaran<br/><em>lokal pilihan.</em></h1><p>Produk yang dipromosikan oleh penjual dan telah melewati proses verifikasi LOKAVA.</p></section>
    <PromotionList />
  </main>;
}
