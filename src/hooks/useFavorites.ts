import { useCallback, useEffect, useState } from 'react';

const KEY = 'cursedrock:favorites:v1';

// ─── Favoritos (localStorage hoje, contas amanhã) ────────────────────────────
// API do hook é agnóstica de backend: quando houver login, basta trocar o
// storage interno por chamadas à API mantendo toggle/isFavorite/getAll.

function readAll(): string[] {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.filter((x) => typeof x === 'string') : [];
  } catch {
    return [];
  }
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<string[]>(() => readAll());

  useEffect(() => {
    const onStorage = (e: StorageEvent) => {
      if (e.key === KEY) setFavorites(readAll());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  const persist = useCallback((next: string[]) => {
    setFavorites(next);
    try {
      localStorage.setItem(KEY, JSON.stringify(next));
    } catch {
      /* storage indisponível — mantém em memória */
    }
  }, []);

  const toggle = useCallback(
    (id: string) => {
      persist(favorites.includes(id) ? favorites.filter((f) => f !== id) : [...favorites, id]);
    },
    [favorites, persist],
  );

  const isFavorite = useCallback((id: string) => favorites.includes(id), [favorites]);

  const clear = useCallback(() => persist([]), [persist]);

  return { favorites, toggle, isFavorite, clear, count: favorites.length };
}
