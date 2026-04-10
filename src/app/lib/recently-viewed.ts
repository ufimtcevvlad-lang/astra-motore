"use client";

const STORAGE_KEY = "recently-viewed";
const MAX_ITEMS = 12;

/** Получить список ID недавно просмотренных товаров (новейшие — первые). */
export function getRecentlyViewedIds(): string[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const ids = JSON.parse(raw);
    return Array.isArray(ids) ? ids.filter((id): id is string => typeof id === "string") : [];
  } catch {
    return [];
  }
}

/** Добавить товар в начало списка (дедуплицирует, обрезает до MAX_ITEMS). */
export function trackProductView(productId: string): void {
  if (typeof window === "undefined") return;
  try {
    const ids = getRecentlyViewedIds().filter((id) => id !== productId);
    ids.unshift(productId);
    if (ids.length > MAX_ITEMS) ids.length = MAX_ITEMS;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(ids));
  } catch {
    // Quota exceeded или другая ошибка localStorage — молча пропускаем.
  }
}
