'use client';

import { useEffect, useState, type FormEvent } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowRight, ArrowUpRight, Bookmark, Compass, Hotel,
  Map, MapPin, Search, ShoppingBag, Sparkles, Utensils, Waves, ChevronLeft, ChevronRight,
} from 'lucide-react';

type ExploreItem = {
  id: string;
  entityType: 'business' | 'product' | 'destination' | 'article' | 'package';
  name: string;
  type: string;
  area: string;
  description: string;
  image: string;
  tag: string;
  href: string;
};

type Banner = { id: string; title: string; description: string; href: string; photos: Array<{ url: string }> };
type PromotedProduct = { id: string; title: string; description: string; category: string; price: number | null; photos: Array<{ url: string }>; href: string; endsAt: number };

const categories = [
  { label: 'Wisata', href: '/wisata', icon: Compass, tone: 'mint' },
  { label: 'Kuliner', href: '/kuliner', icon: Utensils, tone: 'peach' },
  { label: 'Penginapan', href: '/penginapan', icon: Hotel, tone: 'blue' },
  { label: 'Produk lokal', href: '/produk', icon: ShoppingBag, tone: 'sand' },
  { label: 'Peta', href: '/peta', icon: Map, tone: 'mint' },
];

export default function HomePage() {
  const router = useRouter();
  const [query, setQuery] = useState('');
  const [items, setItems] = useState<ExploreItem[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const [bannerIndex, setBannerIndex] = useState(0);
  const [promotions, setPromotions] = useState<PromotedProduct[]>([]);
  const [savedCount, setSavedCount] = useState(0);

  useEffect(() => {
    fetch('/api/public/explore', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setItems(Array.isArray(data?.items) ? data.items.slice(0, 4) : []))
      .catch(() => setItems([]));
    fetch('/api/public/banners', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setBanners(Array.isArray(data?.banners) ? data.banners as Banner[] : []))
      .catch(() => setBanners([]));
    fetch('/api/public/promotions', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => setPromotions(Array.isArray(data?.promotions) ? data.promotions as PromotedProduct[] : []))
      .catch(() => setPromotions([]));
    const syncFavorites = () => {
      try {
        const value = JSON.parse(localStorage.getItem('lokava-favorites') || '[]');
        setSavedCount(Array.isArray(value) ? value.length : 0);
      } catch { setSavedCount(0); }
    };
    syncFavorites();
    window.addEventListener('lokava:favorites-changed', syncFavorites);
    window.addEventListener('storage', syncFavorites);
    return () => {
      window.removeEventListener('lokava:favorites-changed', syncFavorites);
      window.removeEventListener('storage', syncFavorites);
    };
  }, []);

  useEffect(() => {
    if (banners.length < 2 || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const timer = window.setInterval(() => setBannerIndex((current) => (current + 1) % banners.length), 6500);
    return () => window.clearInterval(timer);
  }, [banners.length]);

  function search(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const value = query.trim();
    router.push(value ? `/cari?q=${encodeURIComponent(value)}` : '/cari');
  }

  return (
    <main className="ios-home">
      <header className="ios-home-header">
        <Link href="/" className="ios-brand" aria-label="LOKAVA beranda">
          <span className="ios-brand-mark"><Waves size={20} strokeWidth={2.2} /></span>
          <span>LOKAVA<small>JELAJAHI SUKABUMI SELATAN</small></span>
        </Link>
        <div className="ios-header-actions">
          <Link href="/favorit" className="ios-icon-button" aria-label="Favorit"><Bookmark size={19}/><span>{savedCount}</span></Link>
          <Link href="/penjual/masuk" className="ios-account-link">Masuk <ArrowUpRight size={15}/></Link>
        </div>
      </header>

      <section className="ios-hero">
        <div className="ios-hero-photo" role="img" aria-label="Pantai Ujung Genteng, Sukabumi saat senja" />
        <div className="ios-hero-overlay" />
        <div className="ios-hero-content">
          <span className="ios-eyebrow"><span/> SUKABUMI SELATAN · JAWA BARAT</span>
          <h1>Temukan sisi<br/><em>indah Indonesia.</em></h1>
          <p>Destinasi, rasa, dan cerita lokal dalam satu perjalanan.</p>
          <Link href="/wisata" className="ios-primary-button">Mulai menjelajah <ArrowRight size={17}/></Link>
        </div>
        <div className="ios-hero-caption"><MapPin size={14}/> Ujung Genteng, Ciracap <a href="https://commons.wikimedia.org/wiki/File:Pantai_Ujung_Genteng,_Sukabumi,_Jawa_Barat,_25052017.jpg" target="_blank" rel="noreferrer">Foto: Raffiakbar29 · CC BY-SA 4.0</a></div>
      </section>

      <section className="ios-home-body">
        <form className="ios-search" onSubmit={search} role="search">
          <Search size={19}/>
          <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari pantai, kuliner, penginapan…" aria-label="Cari destinasi atau usaha" />
          <button type="submit" aria-label="Cari"><ArrowRight size={18}/></button>
        </form>

        <div className="ios-section-title"><div><span>JELAJAHI</span><h2>Apa yang kamu cari?</h2></div><Link href="/cari">Lihat semua <ArrowUpRight size={15}/></Link></div>
        <div className="ios-category-grid">
          {categories.map(({ label, href, icon: Icon, tone }) => (
            <Link href={href} className="ios-category-card" key={href}>
              <span className={`ios-category-icon ${tone}`}><Icon size={21} strokeWidth={1.9}/></span>
              <strong>{label}</strong><ArrowUpRight className="ios-category-arrow" size={14}/>
            </Link>
          ))}
        </div>

        {banners.length > 0 && (() => {
          const activeBanner = banners[bannerIndex % banners.length];
          return <section className="ios-promo-carousel" aria-label="Promosi pilihan">
            <Link href={activeBanner.href || '/wisata'} className="ios-promo-banner" key={activeBanner.id}>
              {activeBanner.photos?.[0]?.url && <img src={activeBanner.photos[0].url} alt="" loading="lazy"/>}
              <span><Sparkles size={14}/> PILIHAN LOKAL</span>
              <strong>{activeBanner.title}</strong>
              <small>{activeBanner.description}</small>
              <ArrowUpRight size={18}/>
            </Link>
            {banners.length > 1 && <div className="ios-promo-controls">
              <span>{String((bannerIndex % banners.length) + 1).padStart(2, '0')} / {String(banners.length).padStart(2, '0')}</span>
              <div><button type="button" aria-label="Banner sebelumnya" onClick={() => setBannerIndex((current) => (current - 1 + banners.length) % banners.length)}><ChevronLeft size={17}/></button><button type="button" aria-label="Banner berikutnya" onClick={() => setBannerIndex((current) => (current + 1) % banners.length)}><ChevronRight size={17}/></button></div>
            </div>}
          </section>;
        })()}

        {promotions.length > 0 && <section className="ios-promoted-section" id="promosi">
          <div className="ios-section-title"><div><span>DISOROT PENJUAL</span><h2>Promosi pilihan.</h2></div><Link href="/promosi">Lihat semua <ArrowUpRight size={15}/></Link></div>
          <div className="ios-promoted-grid">
            {promotions.slice(0, 4).map((item) => <Link href={item.href} className="ios-promoted-card" key={item.id}>
              <div className="ios-promoted-image">{item.photos?.[0]?.url ? <img src={item.photos[0].url} alt={item.title} loading="lazy"/> : <span><ShoppingBag size={24}/></span>}<small><Sparkles size={12}/> PROMOSI</small></div>
              <div className="ios-promoted-copy"><span>{item.category || 'Pilihan lokal'}</span><strong>{item.title}</strong><p>{item.description}</p>{typeof item.price === 'number' && <b>Rp {item.price.toLocaleString('id-ID')}</b>}</div>
            </Link>)}
          </div>
        </section>}

        <div className="ios-section-title ios-featured-title"><div><span>INSPIRASI PERJALANAN</span><h2>Temukan yang menarik.</h2></div><Link href="/wisata">Jelajahi <ArrowUpRight size={15}/></Link></div>
        {items.length > 0 ? (
          <div className="ios-featured-grid">
            {items.map((item) => (
              <Link href={item.href || '/wisata'} className="ios-featured-card" key={`${item.entityType}:${item.id}`}>
                <div className="ios-featured-image">
                  {item.image ? <img src={item.image} alt={item.name} loading="lazy"/> : <span><Waves size={26}/></span>}
                  <small>{item.tag || item.type || 'Pilihan lokal'}</small>
                </div>
                <div className="ios-featured-copy"><span><MapPin size={12}/>{item.area || 'Sukabumi Selatan'}</span><strong>{item.name}</strong><p>{item.description}</p></div>
              </Link>
            ))}
          </div>
        ) : (
          <div className="ios-featured-empty"><Compass size={22}/><span>Destinasi pilihan akan tampil setelah konten disetujui.</span></div>
        )}

        <Link href="/peta" className="ios-map-card">
          <span className="ios-map-icon"><Map size={23}/></span>
          <span><small>JELAJAHI LOKASI</small><strong>Semua tempat, dalam satu peta.</strong><em>Buka peta interaktif</em></span>
          <ArrowUpRight size={19}/>
        </Link>

        <div className="ios-seller-card">
          <div><span>UNTUK PEMILIK USAHA</span><h2>Usaha lokalmu<br/>layak ditemukan.</h2><p>Kelola profil, produk, dan promosi dari satu ruang.</p><Link href="/penjual/masuk">Gabung sebagai penjual <ArrowRight size={16}/></Link></div>
          <div className="ios-seller-symbol"><StoreIcon/></div>
        </div>
      </section>

      <footer className="ios-home-footer"><Link href="/">LOKAVA</Link><span>Jelajahi keindahan Sukabumi Selatan</span><div><Link href="/tentang">Tentang</Link><Link href="/kontak">Kontak</Link><Link href="/kebijakan-privasi">Privasi</Link></div></footer>

    </main>
  );
}

function StoreIcon() {
  return <ShoppingBag size={36} strokeWidth={1.35}/>;
}
