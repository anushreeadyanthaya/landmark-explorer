import { useState, useCallback } from 'react';
import type { Landmark } from '@workspace/api-client-react';

const STORAGE_KEY = 'landmark-saved';

function loadSaved(): Landmark[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Landmark[];
  } catch {
    return [];
  }
}

function persistSaved(items: Landmark[]): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export function useSaved() {
  const [saved, setSaved] = useState<Landmark[]>(() => loadSaved());

  const save = useCallback((landmark: Landmark) => {
    setSaved(prev => {
      if (prev.some(l => l.pageId === landmark.pageId)) return prev;
      const next = [...prev, landmark];
      persistSaved(next);
      return next;
    });
  }, []);

  const remove = useCallback((pageId: number) => {
    setSaved(prev => {
      const next = prev.filter(l => l.pageId !== pageId);
      persistSaved(next);
      return next;
    });
  }, []);

  const isSaved = useCallback((pageId: number) => saved.some(l => l.pageId === pageId), [saved]);

  return { saved, save, remove, isSaved };
}
