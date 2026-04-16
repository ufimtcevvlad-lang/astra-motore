"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import Pagination from "./Pagination";
import { MarketSummary, fetchMarketData, getPriceZone, formatPrice } from "@/app/lib/price-monitor";

interface ProductItem {
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
  onPageChange: (page: number) => void;
}

const ZONE_DOT: Record<string, string> = {
  red: "bg-red-500",
  green: "bg-green-500",
  yellow: "bg-yellow-400",
  no_data: "bg-gray-300",
};

function MarketCell({ item }: { item: ProductItem }) {
  const [data, setData] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!item.sku || !item.brand) {
      setLoading(false);
      return;
    }
    fetchMarketData(item.sku, item.brand).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [item.sku, item.brand]);

  if (loading) {
    return <span className="text-xs text-gray-300">…</span>;
  }

  const zone = getPriceZone(item.price, data);
  const dot = ZONE_DOT[zone];

  if (!data || data.offers.length === 0) {
    return (
      <div className="flex items-center justify-end gap-1.5">
        <span className={`w-2 h-2 rounded-full ${dot}`} />
        <span className="text-xs text-gray-400">нет</span>
      </div>
    );
  }

  return (
    <div
      className="flex items-center justify-end gap-1.5"
      title={`Мин: ${formatPrice(data.min_price)}, Медиана: ${formatPrice(data.median_price)}, Макс: ${formatPrice(data.max_price)} (${data.sites_count} сайт.)`}
    >
      <span className={`w-2 h-2 rounded-full ${dot}`} />
      <span className="text-xs text-gray-600 whitespace-nowrap">
        {Math.round(data.min_price)}–{Math.round(data.max_price)}₽
      </span>
    </div>
  );
}

export default function ProductList({ items, page, totalPages, onPageChange }: ProductListProps) {
  if (items.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
        Товары не найдены
      </div>
    );
  }

  return (
    <div>
      <div className="space-y-2">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-4 p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition border border-gray-100"
          >
            {/* Image */}
            {item.image ? (
              <img
                src={item.image}
                alt={item.name}
                className="w-14 h-14 rounded object-cover bg-gray-100 flex-shrink-0"
              />
            ) : (
              <div className="w-14 h-14 rounded bg-gray-100 flex-shrink-0 flex items-center justify-center text-gray-300">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={1.5}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
            )}

            {/* Info */}
            <div className="flex-1 min-w-0">
              <div className="font-medium text-gray-900 truncate">{item.name}</div>
              <div className="text-xs text-gray-500 mt-0.5">
                {item.sku}
                {item.brand ? ` \u00b7 ${item.brand}` : ""}
                {item.categoryTitle ? ` \u00b7 ${item.categoryTitle}` : ""}
              </div>
            </div>

            {/* Price & stock */}
            <div className="text-right flex-shrink-0">
              <div className="font-semibold text-gray-900">
                {Number(item.price).toLocaleString("ru-RU")} &#8381;
              </div>
              <div className={`text-xs mt-0.5 ${item.inStock > 0 ? "text-green-600" : "text-red-500"}`}>
                {item.inStock > 0 ? "В наличии" : "Нет в наличии"}
              </div>
            </div>

            {/* Market indicator */}
            <div className="flex-shrink-0 w-28">
              <MarketCell item={item} />
            </div>

            {/* Edit link */}
            <Link
              href={`/admin/products/${item.id}`}
              className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 transition"
              title="Редактировать"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={1.5}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </Link>
          </div>
        ))}
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
