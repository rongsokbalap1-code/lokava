'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowUpRight, MapPin, Sparkles } from 'lucide-react';

type Promotion = { id: string; title: string; description: string; category: string; price: number | null; photos: Array<{ url: string }>; href: string };

export default function PromotionList() {
  const [items, setItems] = useState<Promotion[]>([]);
  const [loading, setLoading] = useState(true);
  useEffect(() => {
    let active = true;
    fetch('/api/public/promotions', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => { if (active) setItems(Array.isArray(data?.promotions) ? data.promotions as Promotion[] : []); })
      .catch(() => { if (active) setItems([]); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);
  if (loading) return <section className="promotions-list-state" aria-live="polite">Memuat promosi pilihan…</section>;
  if (!items.length) return <section className="promotions-list-state"><Sparkles size={24}/><strong>Belum ada promosi aktif.</strong><span>Promosi yang sudah disetujui dan dibayar akan muncul di sini.</span></section>;
  return <section className="promotions-list-wrap" aria-label="Daftar promosi aktif">
    <div className="promotions-list-heading"><span>{items.length} promosi aktif</span><small>Ditampilkan setelah pembayaran dan persetujuan admin.</small></div>
    <div className="promotions-list-grid">{items.map((item) => <Link href={item.href} className="ios-promoted-card" key={item.id}>
      <div className="ios-promoted-image">{item.photos?.[0]?.url ? <img src={item.photos[0].url} alt={item.title} loading="lazy"/> : <span><Sparkles size={24}/></span>}<small><Sparkles size={12}/> PROMOSI</small></div>
      <div className="ios-promoted-copy"><span>{item.category || 'Pilihan lokal'}</span><strong>{item.title}</strong><p>{item.description}</p>{typeof item.price === 'number' && <b>Rp {item.price.toLocaleString('id-ID')}</b>}<em><MapPin size={12}/> Lihat detail <ArrowUpRight size={13}/></em></div>
    </Link>)}</div>
  </section>;
}
