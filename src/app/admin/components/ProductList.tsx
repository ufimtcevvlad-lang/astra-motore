"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
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
  onInlineUpdate: (id: number, patch: { price?: number; inStock?: number }) => Promise<void>;
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
  suffix,
  className = "",
}: {
  value: number;
  onSave: (n: number) => Promise<void>;
  suffix?: string;
  className?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [input, setInput] = useState(String(value));
  const [busy, setBusy] = useState(false);

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
    } catch {
      setInput(String(value));
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
        className={`text-right hover:bg-indigo-50 px-2 py-1 rounded ${className}`}
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

  useEffect(() => {
    const payload = items
      .filter((i) => i.sku && i.brand)
      .map((i) => ({ article: i.sku, brand: i.brand as string }));
    if (payload.length === 0) {
      setMarket(new Map());
      setMarketLoading(false);
      return;
    }
    setMarketLoading(true);
    fetchMarketDataBulk(payload).then((m) => {
      setMarket(m);
      setMarketLoading(false);
    });
  }, [items]);

  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
        Товары не найдены
      </div>
    );
  }

  const allSelected = items.every((i) => selectedIds.has(i.id));
  const someSelected = !allSelected && items.some((i) => selectedIds.has(i.id));

  function openProduct(id: number) {
    saveScroll(`${pathname}?${searchParams.toString()}`);
    router.push(`/admin/products/${id}`);
  }

  return (
    <div>
      <div className="bg-white rounded-lg shadow-sm overflow-hidden">
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
        </div>

        {/* Rows */}
        <div className="divide-y divide-gray-100">
          {items.map((item) => {
            const selected = selectedIds.has(item.id);
            return (
              <div
                key={item.id}
                onClick={() => openProduct(item.id)}
                className={`flex items-center gap-3 px-4 py-2 cursor-pointer transition-colors ${
                  selected ? "bg-indigo-50" : "hover:bg-gray-50"
                }`}
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
                  <div className="text-xs text-gray-500 truncate">
                    {item.sku}
                    {item.categoryTitle ? ` · ${item.categoryTitle}` : ""}
                  </div>
                </div>

                <div className="w-24 text-xs text-gray-600 truncate">{item.brand ?? ""}</div>

                <div className="w-28 flex justify-end">
                  <InlineNumber
                    value={Number(item.price)}
                    onSave={(n) => onInlineUpdate(item.id, { price: n })}
                    suffix=" ₽"
                    className="text-sm font-semibold text-gray-900"
                  />
                </div>

                <div className="w-20 flex justify-end">
                  <InlineNumber
                    value={Number(item.inStock)}
                    onSave={(n) => onInlineUpdate(item.id, { inStock: n })}
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
            );
          })}
        </div>
      </div>

      <div className="flex items-center justify-between mt-4 text-sm text-gray-500">
        <span>Всего: {total}</span>
        <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
      </div>
    </div>
  );
}
