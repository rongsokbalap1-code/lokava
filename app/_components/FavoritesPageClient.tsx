'use client';

/* eslint-disable react-hooks/set-state-in-effect -- Favorites synchronize from localStorage and the public API after hydration. */
import { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Bookmark, Trash2 } from 'lucide-react';

type FavoriteRecord = { id: string; type: string; addedAt: string };
type StoredFavorite = FavoriteRecord | string;
type FavoriteItem = {
  id: string;
  entityType: string;
  name: string;
  type: string;
  area: string;
  description: string;
  image: string;
  tag: string;
  href: string;
};

function readStoredFavorites(): StoredFavorite[] {
  try {
    const raw = localStorage.getItem('lokava-favorites');
    const parsed: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return [];

    return parsed.filter((item): item is StoredFavorite =>
      typeof item === 'string' || (
        !!item &&
        typeof item === 'object' &&
        typeof (item as FavoriteRecord).id === 'string' &&
        typeof (item as FavoriteRecord).type === 'string' &&
        typeof (item as FavoriteRecord).addedAt === 'string'
      ),
    );
  } catch {
    return [];
  }
}

function matchFavorites(items: FavoriteItem[], favorites: StoredFavorite[]) {
  return items.filter((item) => favorites.some((favorite) =>
    typeof favorite === 'string'
      ? favorite === item.id
      : favorite.id === item.id && favorite.type === item.entityType,
  ));
}

export default function FavoritesPage() {
  const [favorites, setFavorites] = useState<StoredFavorite[]>([]);
  const [allItems, setAllItems] = useState<FavoriteItem[]>([]);
  const [ready, setReady] = useState(false);

  const syncFavorites = useCallback(() => {
    const next = readStoredFavorites();
    setFavorites(next);
  }, []);

  useEffect(() => {
    let active = true;
    syncFavorites();

    fetch('/api/public/explore', { cache: 'no-store' })
      .then((response) => response.ok ? response.json() : null)
      .then((data) => {
        if (active && Array.isArray(data?.items)) {
          setAllItems(data.items as FavoriteItem[]);
        }
      })
      .catch(() => {
        if (active) setAllItems([]);
      })
      .finally(() => {
        if (active) setReady(true);
      });

    window.addEventListener('lokava:favorites-changed', syncFavorites);
    window.addEventListener('storage', syncFavorites);
    return () => {
      active = false;
      window.removeEventListener('lokava:favorites-changed', syncFavorites);
      window.removeEventListener('storage', syncFavorites);
    };
  }, [syncFavorites]);

  const visibleItems = matchFavorites(allItems, favorites);

  function remove(item: FavoriteItem) {
    const next = readStoredFavorites().filter((favorite) =>
      typeof favorite === 'string'
        ? favorite !== item.id
        : !(favorite.id === item.id && favorite.type === item.entityType),
    );

    try {
      localStorage.setItem('lokava-favorites', JSON.stringify(next));
      setFavorites(next);
      window.dispatchEvent(new CustomEvent('lokava:favorites-changed', {
        detail: { id: item.id, type: item.entityType, saved: false },
      }));
    } catch {
      // Do not pretend the item was removed if storage is unavailable.
    }
  }

  return (
    <main className="favorites-page">
      <header className="detail-header">
        <Link className="detail-back" href="/"><ArrowLeft size={17} /> Kembali ke beranda</Link>
        <Link className="detail-brand" href="/">LOKAVA <span>JELAJAHI SUKABUMI SELATAN</span></Link>
      </header>

      <section className="favorites-content">
        <div className="eyebrow"><span /> KOLEKSI PRIBADI</div>
        <h1>Tempat yang<br /><em>kamu simpan.</em></h1>
        <p className="favorites-intro">
          Favorit tersimpan hanya di browser dan perangkat ini. Data tidak disinkronkan ke akun atau perangkat lain.
          Konten yang tidak lagi dipublikasikan tidak akan muncul di daftar.
        </p>

        {!ready ? (
          <p className="favorites-state">Memuat favorit…</p>
        ) : visibleItems.length > 0 ? (
          <div className="favorites-grid">
            {visibleItems.map((item) => (
              <article className="favorite-card" key={`${item.entityType}:${item.id}`}>
                <Link href={item.href} className="favorite-image">
                  {item.image ? <img src={item.image} alt={item.name} /> : <div className="favorite-no-image"><Bookmark size={24} /></div>}
                </Link>
                <div className="favorite-card-copy">
                  <span>{item.type} · {item.area}</span>
                  <h2><Link href={item.href}>{item.name}</Link></h2>
                  <p>{item.description}</p>
                  <button className="favorite-remove" type="button" onClick={() => remove(item)}>
                    <Trash2 size={15} /> Hapus dari favorit
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="favorites-empty">
            <Bookmark size={26} />
            <h2>Belum ada favorit yang tersedia</h2>
            <p>Simpan usaha, produk, atau destinasi yang sudah dipublikasikan untuk melihatnya di sini.</p>
            <Link className="button button-dark" href="/">Mulai menjelajah</Link>
          </div>
        )}
      </section>
    </main>
  );
}
