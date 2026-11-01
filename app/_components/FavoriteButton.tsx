'use client';

import { useEffect, useState } from 'react';
import { Bookmark } from 'lucide-react';

type Favorite = { id: string; type: string; addedAt: string };
type StoredFavorite = Favorite | string;

function readFavorites(): StoredFavorite[] {
  try {
    const raw = localStorage.getItem('lokava-favorites');
    const value: unknown = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(value)) return [];

    return value.filter((item): item is StoredFavorite =>
      typeof item === 'string' || (
        !!item &&
        typeof item === 'object' &&
        typeof (item as Favorite).id === 'string' &&
        typeof (item as Favorite).type === 'string' &&
        typeof (item as Favorite).addedAt === 'string'
      ),
    );
  } catch {
    return [];
  }
}

export default function FavoriteButton({
  id,
  label,
  type,
}: {
  id: string;
  label: string;
  type: string;
}) {
  const [saved, setSaved] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const sync = () => {
      const favorites = readFavorites();
      setSaved(favorites.some((item) =>
        typeof item === 'string'
          ? item === id
          : item.id === id && item.type === type,
      ));
      setReady(true);
    };

    sync();
    window.addEventListener('lokava:favorites-changed', sync);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('lokava:favorites-changed', sync);
      window.removeEventListener('storage', sync);
    };
  }, [id, type]);

  function toggle() {
    try {
      const favorites = readFavorites();
      const isSaved = favorites.some((item) =>
        typeof item === 'string'
          ? item === id
          : item.id === id && item.type === type,
      );
      const next = favorites.filter((item) =>
        typeof item === 'string'
          ? item !== id
          : !(item.id === id && item.type === type),
      );

      if (!isSaved) {
        next.push({ id, type, addedAt: new Date().toISOString() });
      }

      localStorage.setItem('lokava-favorites', JSON.stringify(next));
      setSaved(!isSaved);
      window.dispatchEvent(new CustomEvent('lokava:favorites-changed', {
        detail: { id, type, saved: !isSaved },
      }));
    } catch {
      // Keep the current state if browser storage is unavailable or blocked.
    }
  }

  return (
    <button
      type="button"
      className={saved ? 'entity-favorite-button is-saved' : 'entity-favorite-button'}
      aria-pressed={saved}
      aria-label={saved ? `Hapus ${label} dari favorit` : `Simpan ${label} ke favorit`}
      disabled={!ready}
      onClick={toggle}
    >
      <Bookmark size={16} fill={saved ? 'currentColor' : 'none'} />
      {saved ? 'Tersimpan' : 'Simpan favorit'}
    </button>
  );
}
