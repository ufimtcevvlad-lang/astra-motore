"use client";

import Link from "next/link";
import { Fragment, useState, useEffect } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import Pagination from "./Pagination";
import { saveScroll } from "./useScrollRestore";
import type { SortField, SortState } from "./useProductFilters";
import {
  BulkEntry,
  bulkEntryToSummary,
  fetchMarketDataBulk,
  formatPrice,
  getPriceZone,
} from "@/app/lib/price-monitor";

export interface ProductItem {
  id: number;
  name: string;
  sku: string;
  brand: string | null;
  categoryTitle: string | null;
  price: number;
  inStock: number;
  image: string | null;
  createdAt?: string | null;
  hidden?: boolean;
}

interface ProductListProps {
  items: ProductItem[];
  page: number;
  totalPages: number;
  total: number;
  sort: SortState;
  selectedIds: Set<number>;
  onPageChange: (page: number) => void;
  onSortChange: (s: SortState) => void;
  onToggleSelect: (id: number) => void;
  onToggleSelectAll: (select: boolean) => void;
  onInlineUpdate: (id: number, patch: { price?: number; inStock?: number; hidden?: boolean }) => Promise<void>;
}

const ZONE_DOT: Record<string, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  no_data: "bg-gray-300",
};

function SortableHeader({
  label,
  field,
  sort,
  onChange,
  align = "left",
}: {
  label: string;
  field: SortField;
  sort: SortState;
  onChange: (s: SortState) => void;
  align?: "left" | "right";
}) {
  const active = sort.field === field;
  const arrow = active ? (sort.dir === "asc" ? "↑" : "↓") : "↕";
  return (
    <button
      type="button"
      onClick={() =>
        onChange({
          field,
          dir: active && sort.dir === "desc" ? "asc" : "desc",
        })
      }
      className={`flex items-center gap-1 text-xs font-semibold uppercase tracking-wide ${
        active ? "text-indigo-600" : "text-gray-500"
      } hover:text-indigo-600 ${align === "right" ? "ml-auto" : ""}`}
    >
      {label}
      <span className={active ? "text-indigo-600" : "text-gray-300"}>{arrow}</span>
    </button>
  );
}

function InlineNumber({
  value,
  onSave,
  onError,
  suffix,
  className = "",
}: {
  value: number;
  onSave: (n: number) => Promise<void>;
  onError?: (msg: string) => void;
  suffix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(value));
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    if (!editing) setInput(String(value));
  }, [value, editing]);

  async function commit() {
    const n = Number(input);
    if (!Number.isFinite(n) || n < 0 || n === value) {
      setEditing(false);
      setInput(String(value));
      return;
    }
    setBusy(true);
    try {
      await onSave(n);
      setFailed(false);
    } catch (err) {
      setInput(String(value));
      setFailed(true);
      onError?.(err instanceof Error ? err.message : "Не удалось сохранить");
      setTimeout(() => setFailed(false), 2500);
    } finally {
      setBusy(false);
      setEditing(false);
    }
  }

  if (!editing) {
    return (
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          e.preventDefault();
          setEditing(true);
        }}
        className={`text-right px-2 py-1 rounded ${
          failed ? "bg-red-50 ring-1 ring-red-300" : "hover:bg-indigo-50"
        } ${className}`}
        title={failed ? "Не удалось сохранить — попробуйте снова" : undefined}
      >
        {value.toLocaleString("ru-RU")}
        {suffix}
      </button>
    );
  }

  return (
    <input
      type="number"
      min={0}
      autoFocus
      disabled={busy}
      value={input}
      onChange={(e) => setInput(e.target.value)}
      onClick={(e) => e.stopPropagation()}
      onBlur={commit}
      onKeyDown={(e) => {
        if (e.key === "Enter") commit();
        if (e.key === "Escape") {
          setEditing(false);
          setInput(String(value));
        }
      }}
      className={`w-20 text-right px-2 py-1 border border-indigo-400 rounded text-sm ${className}`}
    />
  );
}

function MarketCell({
  item,
  entry,
  loading,
}: {
  item: ProductItem;
  entry: BulkEntry | undefined;
  loading: boolean;
}) {
  if (loading) return <span className="text-xs text-gray-300">…</span>;
  const summary = bulkEntryToSummary(entry);
  if (!summary) return <span className="text-xs text-gray-300">—</span>;
  const zone = getPriceZone(item.price, summary);
  const dot = ZONE_DOT[zone];
  return (
    <div
      className="flex items-center justify-end gap-1.5"
      title={`Мин: ${formatPrice(summary.min_price)}, Медиана: ${formatPrice(summary.median_price)}, Макс: ${formatPrice(summary.max_price)} (${summary.sites_count} сайт.)`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} aria-hidden />
      <span className="text-xs text-gray-600 whitespace-nowrap">
        {Math.round(summary.min_price)}–{Math.round(summary.max_price)}₽
      </span>
    </div>
  );
}

function formatProductDate(value: string | null | undefined): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("ru-RU", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export default function ProductList({
  items,
  page,
  totalPages,
  total,
  sort,
  selectedIds,
  onPageChange,
  onSortChange,
  onToggleSelect,
  onToggleSelectAll,
  onInlineUpdate,
}: ProductListProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [market, setMarket] = useState<Map<string, BulkEntry>>(new Map());
  const [marketLoading, setMarketLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    const payload = items
      .filter((i) => i.sku && i.brand)
      .map((i) => ({ article: i.sku, brand: i.brand as string }));
    if (payload.length === 0) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- очищаем рыночные данные, если нечего запрашивать
      setMarket(new Map());
      setMarketLoading(false);
      return;
    }

    const CACHE_TTL = 5 * 60 * 1000;
    const cacheKey = "admin_market_cache_v1";
    const keysNeeded = payload.map((p) => `${p.article}|${p.brand}`);

    let cached: Record<string, { expires: number; entry: BulkEntry }> = {};
    try {
      cached = JSON.parse(sessionStorage.getItem(cacheKey) ?? "{}");
    } catch {
      cached = {};
    }
    const now = Date.now();
    const fresh = new Map<string, BulkEntry>();
    const missing: { article: string; brand: string }[] = [];
    for (const p of payload) {
      const k = `${p.article}|${p.brand}`;
      const c = cached[k];
      if (c && c.expires > now) fresh.set(k, c.entry);
      else missing.push(p);
    }

    if (missing.length === 0) {
      setMarket(fresh);
      setMarketLoading(false);
      return;
    }

    setMarket(fresh);
    setMarketLoading(true);
    fetchMarketDataBulk(missing).then((m) => {
      const merged = new Map(fresh);
      for (const [k, v] of m) merged.set(k, v);
      setMarket(merged);
      setMarketLoading(false);

      // Обновляем кэш — только для ключей этой выборки
      const next: typeof cached = { ...cached };
      for (const k of keysNeeded) {
        const entry = merged.get(k);
        if (entry) next[k] = { expires: now + CACHE_TTL, entry };
      }
      try {
        sessionStorage.setItem(cacheKey, JSON.stringify(next));
      } catch {}
    });
  }, [items]);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3500);
    return () => clearTimeout(t);
  }, [toast]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
        Товары не найдены
      </div>
    );
  }

  const allSelected = items.every((i) => selectedIds.has(i.id));
  const someSelected = !allSelected && items.some((i) => selectedIds.has(i.id));
  const showAddedDate = sort.field === "created";

  function openProduct(id: number) {
    saveScroll(`${pathname}?${searchParams.toString()}`);
    router.push(`/admin/products/${id}`);
  }

  return (
    <div>
      {toast && (
        <div
          role="status"
          aria-live="polite"
          className="fixed top-4 right-4 z-50 max-w-sm rounded-lg border border-red-200 bg-red-50 text-red-800 px-4 py-3 shadow-lg text-sm"
        >
          {toast}
        </div>
      )}
      <div className="bg-white rounded-lg shadow-sm overflow-x-auto">
        <div className="min-w-[720px]">
        {/* Header row */}
        <div className="flex items-center gap-3 px-4 py-2 border-b border-gray-200 bg-gray-50 text-xs">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = someSelected;
            }}
            onChange={(e) => onToggleSelectAll(e.target.checked)}
            className="rounded border-gray-400"
            aria-label="Выбрать все"
          />
          <div className="w-10" />
          <div className="flex-1">
            <SortableHeader label="Название" field="name" sort={sort} onChange={onSortChange} />
          </div>
          <div className="w-24">
            <SortableHeader label="Бренд" field="brand" sort={sort} onChange={onSortChange} />
          </div>
          <div className="w-28 flex justify-end">
            <SortableHeader
              label="Цена"
              field="price"
              sort={sort}
              onChange={onSortChange}
              align="right"
            />
          </div>
          <div className="w-20 flex justify-end">
            <SortableHeader
              label="Остаток"
              field="inStock"
              sort={sort}
              onChange={onSortChange}
              align="right"
            />
          </div>
          <div className="w-28 text-right">
            <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
              Рынок
            </span>
          </div>
          <div className="w-8" />
          <div className="w-8" />
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {items.map((item, index) => {
            const selected = selectedIds.has(item.id);
            const isHidden = !!item.hidden;
            const addedDate = showAddedDate
              ? formatProductDate(item.createdAt) ?? "Без даты добавления"
              : null;
            const prevItem = index > 0 ? items[index - 1] : null;
            const prevDate =
              showAddedDate && prevItem
                ? formatProductDate(prevItem.createdAt) ?? "Без даты добавления"
                : null;
            const showDateHeader = !!addedDate && addedDate !== prevDate;
            return (
              <Fragment key={item.id}>
                {showDateHeader && (
                  <div className="bg-gray-50 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                    Добавлены {addedDate}
                  </div>
                )}
                <div
                  onClick={() => openProduct(item.id)}
                  className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                    selected ? "bg-indigo-50" : "hover:bg-gray-50"
                  } ${isHidden ? "opacity-50" : ""}`}
                  title={isHidden ? "Скрыт с сайта" : undefined}
                >
                  <input
                    type="checkbox"
                    checked={selected}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => onToggleSelect(item.id)}
                    className="rounded border-gray-400"
                    aria-label={`Выбрать ${item.name}`}
                  />

                  {item.image ? (
                    // eslint-disable-next-line @next/next/no-img-element -- маленькое admin-превью из уже готового URL
                    <img
                      src={item.image}
                      alt=""
                      className="w-10 h-10 rounded object-cover bg-gray-100 flex-shrink-0"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded bg-gray-100 flex-shrink-0" />
                  )}

                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-medium text-gray-900 truncate">{item.name}</div>
                    <div className="text-xs text-gray-500 flex items-center gap-2 min-w-0">
                      <span className="font-mono text-gray-700 flex-shrink-0">{item.sku}</span>
                      {item.categoryTitle && (
                        <span className="truncate" title={item.categoryTitle}>
                          · {item.categoryTitle}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="w-24 text-xs text-gray-600 truncate">{item.brand ?? ""}</div>

                  <div className="w-28 flex justify-end">
                    <InlineNumber
                      value={Number(item.price)}
                      onSave={(n) => onInlineUpdate(item.id, { price: n })}
                      onError={(msg) => setToast(`Цена не сохранена: ${msg}`)}
                      suffix=" ₽"
                      className="text-sm font-semibold text-gray-900"
                    />
                  </div>

                  <div className="w-20 flex justify-end">
                    <InlineNumber
                      value={Number(item.inStock)}
                      onSave={(n) => onInlineUpdate(item.id, { inStock: n })}
                      onError={(msg) => setToast(`Остаток не сохранён: ${msg}`)}
                      className={`text-sm ${
                        item.inStock > 0 ? "text-green-700" : "text-red-600"
                      }`}
                    />
                  </div>

                  <div className="w-28">
                    <MarketCell
                      item={item}
                      entry={item.brand ? market.get(`${item.sku}|${item.brand}`) : undefined}
                      loading={marketLoading}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onInlineUpdate(item.id, { hidden: !isHidden }).catch((err) =>
                        setToast(
                          `Не удалось ${isHidden ? "показать" : "скрыть"}: ${
                            err instanceof Error ? err.message : ""
                          }`
                        )
                      );
                    }}
                    className={`w-8 h-8 flex items-center justify-center rounded ${
                      isHidden
                        ? "text-gray-400 hover:text-indigo-600"
                        : "text-gray-500 hover:text-indigo-600"
                    }`}
                    title={isHidden ? "Показать на сайте" : "Скрыть с сайта"}
                    aria-label={isHidden ? "Показать на сайте" : "Скрыть с сайта"}
                  >
                    {isHidden ? (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                    )}
                  </button>

                  <Link
                    href={`/admin/products/${item.id}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      saveScroll(`${pathname}?${searchParams.toString()}`);
                    }}
                    className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-indigo-600"
                    title="Открыть"
                    aria-label="Открыть карточку товара"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M9 5l7 7-7 7"
                      />
                    </svg>
                  </Link>
                </div>
              </Fragment>
            );
          })}
        </div>
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>Всего: {total}</span>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
