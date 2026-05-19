import { useState, useCallback } from 'react';

const STORAGE_KEY = 'landmark-favorites';

function loadFavorites(): Set<number> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as number[];
    return new Set(arr);
  } catch {
    return new Set();
  }
}

function saveFavorites(set: Set<number>): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(Array.from(set)));
}

export function useFavorites() {
  const [favorites, setFavorites] = useState<Set<number>>(() => loadFavorites());

  const toggle = useCallback((pageId: number) => {
    setFavorites(prev => {
      const next = new Set(prev);
      if (next.has(pageId)) {
        next.delete(pageId);
      } else {
        next.add(pageId);
      }
      saveFavorites(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback((pageId: number) => favorites.has(pageId), [favorites]);

  return { favorites, toggle, isFavorite };
}
