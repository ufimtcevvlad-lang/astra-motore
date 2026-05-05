"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import Link from "next/link";
import { METRIKA_GOALS, reachMetrikaGoal } from "../lib/metrika-goals";
import type { Product } from "../lib/products-types";

export type CartItem = {
  product: Product;
  quantity: number;
};

type CartContextValue = {
  items: CartItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: string) => void;
  setItemQuantity: (productId: string, quantity: number) => void;
  increaseQuantity: (productId: string) => void;
  decreaseQuantity: (productId: string) => void;
  clearCart: () => void;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);
const CART_STORAGE_KEY = "am_cart_items_v1";

function readCartFromStorage(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(CART_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.flatMap((item) => {
      if (!item || typeof item !== "object") return [];
      const product = (item as { product?: unknown }).product;
      const quantity = (item as { quantity?: unknown }).quantity;
      if (!product || typeof product !== "object") return [];
      const qtyNumber = Number(quantity);
      if (!Number.isFinite(qtyNumber) || qtyNumber <= 0) return [];
      return [{ product: product as Product, quantity: Math.floor(qtyNumber) }];
    });
  } catch {
    return [];
  }
}

function CartToast({ productName, onDone }: { productName: string; onDone: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed top-4 right-4 z-[500] max-w-xs rounded-xl border border-slate-200 bg-white px-4 py-3 shadow-lg transition-all duration-300 ${
        visible ? "translate-y-0 opacity-100" : "-translate-y-2 opacity-0"
      }`}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-start gap-3">
        <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
            <path d="M20 6L9 17l-5-5" />
          </svg>
        </span>
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-900">Добавлено в корзину</p>
          <p className="mt-0.5 text-xs text-slate-500 line-clamp-1">{productName}</p>
          <Link href="/cart" className="mt-1 inline-block text-xs font-medium text-amber-600 hover:underline">
            Перейти в корзину →
          </Link>
        </div>
      </div>
    </div>
  );
}

export function CartProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);
  const [toastProduct, setToastProduct] = useState<string | null>(null);
  const [toastKey, setToastKey] = useState(0);
  const toastTimer = useRef<ReturnType<typeof setTimeout>>(undefined);

  useEffect(() => {
    let cancelled = false;
    queueMicrotask(() => {
      if (cancelled) return;
      setItems(readCartFromStorage());
      setHydrated(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    window.localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(items));
  }, [hydrated, items]);

  const addToCart = useCallback((product: Product) => {
    reachMetrikaGoal(METRIKA_GOALS.ADD_TO_CART, {
      product_id: product.id,
      sku: product.sku,
      price: product.price,
      category: product.category,
    });

    setItems((prev) => {
      const existing = prev.find((i) => i.product.id === product.id);
      if (existing) {
        return prev.map((i) =>
          i.product.id === product.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { product, quantity: 1 }];
    });
    clearTimeout(toastTimer.current);
    setToastProduct(product.name);
    setToastKey((k) => k + 1);
  }, []);

  const removeFromCart = useCallback((productId: string) => {
    setItems((prev) => prev.filter((i) => i.product.id !== productId));
  }, []);

  const setItemQuantity = useCallback((productId: string, quantity: number) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== productId) return [i];
        if (quantity <= 0) return [];
        return [{ ...i, quantity }];
      })
    );
  }, []);

  const increaseQuantity = useCallback((productId: string) => {
    setItems((prev) =>
      prev.map((i) =>
        i.product.id === productId ? { ...i, quantity: i.quantity + 1 } : i
      )
    );
  }, []);

  const decreaseQuantity = useCallback((productId: string) => {
    setItems((prev) =>
      prev.flatMap((i) => {
        if (i.product.id !== productId) return [i];
        if (i.quantity <= 1) return [];
        return [{ ...i, quantity: i.quantity - 1 }];
      })
    );
  }, []);

  const clearCart = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      addToCart,
      removeFromCart,
      setItemQuantity,
      increaseQuantity,
      decreaseQuantity,
      clearCart,
    }),
    [items, addToCart, removeFromCart, setItemQuantity, increaseQuantity, decreaseQuantity, clearCart]
  );

  return (
    <CartContext.Provider value={value}>
      {children}
      {toastProduct ? (
        <CartToast
          key={toastKey}
          productName={toastProduct}
          onDone={() => setToastProduct(null)}
        />
      ) : null}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
}
