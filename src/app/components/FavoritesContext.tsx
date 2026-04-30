"use client";

import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";

const STORAGE_KEY = "am_favorites_v1";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

type FavoritesContextValue = {
  favorites: Set<string>;
  toggle: (productId: string) => void;
  isFavorite: (productId: string) => boolean;
  count: number;
};

const FavoritesContext = createContext<FavoritesContextValue>({
  favorites: new Set(),
  toggle: () => {},
  isFavorite: () => false,
  count: 0,
});

function readStorage(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const arr = JSON.parse(raw);
      return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
    }
  } catch {
    // localStorage can be unavailable in some embedded browser modes.
  }
  try {
    const cookie = document.cookie
      .split("; ")
      .find((row) => row.startsWith(`${STORAGE_KEY}=`))
      ?.split("=")[1];
    if (!cookie) return new Set();
    const arr = JSON.parse(decodeURIComponent(cookie));
    return new Set(Array.isArray(arr) ? arr.filter((x): x is string => typeof x === "string") : []);
  } catch {
    return new Set();
  }
}

function writeStorage(ids: Set<string>) {
  const payload = JSON.stringify([...ids]);
  try {
    window.localStorage.setItem(STORAGE_KEY, payload);
  } catch {
    // quota exceeded — молча пропускаем
  }
  try {
    document.cookie = `${STORAGE_KEY}=${encodeURIComponent(payload)}; path=/; max-age=${COOKIE_MAX_AGE}; SameSite=Lax`;
  } catch {
    // Cookie write can be blocked; localStorage remains the primary store.
  }
}

export function FavoritesProvider({ children }: { children: ReactNode }) {
  const [favorites, setFavorites] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setFavorites(readStorage());
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const toggle = useCallback((productId: string) => {
    setFavorites((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) next.delete(productId);
      else next.add(productId);
      writeStorage(next);
      return next;
    });
  }, []);

  const isFavorite = useCallback(
    (productId: string) => favorites.has(productId),
    [favorites],
  );

  return (
    <FavoritesContext.Provider value={{ favorites, toggle, isFavorite, count: favorites.size }}>
      {children}
    </FavoritesContext.Provider>
  );
}

export function useFavorites() {
  return useContext(FavoritesContext);
}
