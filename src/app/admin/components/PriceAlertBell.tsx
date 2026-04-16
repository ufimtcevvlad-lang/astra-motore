"use client";

import { useEffect, useRef, useState } from "react";
import { Notifications, NotificationItem, fetchNotifications } from "@/app/lib/price-monitor";

function formatPrice(p: number) {
  return p.toLocaleString("ru-RU") + " ₽";
}

function ItemRow({ item, zone }: { item: NotificationItem; zone: "red" | "yellow" }) {
  const sign = item.deviation_pct >= 0 ? "+" : "";
  return (
    <div className="px-4 py-2.5 border-b border-gray-100 last:border-0 hover:bg-gray-50 transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {item.article}
            <span className="ml-1.5 text-xs font-normal text-gray-400">{item.brand}</span>
          </p>
          <p className="text-xs text-gray-500 mt-0.5">
            Ваша: {formatPrice(item.your_price)} · Медиана: {formatPrice(item.median_price)}
          </p>
        </div>
        <span
          className={`shrink-0 text-xs font-semibold px-1.5 py-0.5 rounded ${
            zone === "red"
              ? "bg-red-100 text-red-700"
              : "bg-yellow-100 text-yellow-700"
          }`}
        >
          {sign}{item.deviation_pct}%
        </span>
      </div>
    </div>
  );
}

export default function PriceAlertBell() {
  const [data, setData] = useState<Notifications | null>(null);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetchNotifications().then(setData);
    const id = setInterval(() => fetchNotifications().then(setData), 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const total = (data?.red_count ?? 0) + (data?.yellow_count ?? 0);
  const hasAlerts = total > 0;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
        title="Ценовые отклонения"
      >
        {/* Bell SVG */}
        <svg
          className={`w-5 h-5 ${hasAlerts ? "text-gray-700" : "text-gray-400"}`}
          fill="none"
          viewBox="0 0 24 24"
          stroke="currentColor"
          strokeWidth={1.8}
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9"
          />
        </svg>
        {hasAlerts && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 bg-white rounded-xl shadow-lg border border-gray-200 z-50 overflow-hidden">
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
            <span className="text-sm font-semibold text-gray-900">Ценовые отклонения</span>
            {data?.generated_at && (
              <span className="text-xs text-gray-400">
                {new Date(data.generated_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
              </span>
            )}
          </div>

          {/* Items */}
          <div className="max-h-80 overflow-y-auto">
            {!data || total === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Отклонений нет</p>
            ) : (
              <>
                {data.red_items.map((item) => (
                  <ItemRow key={`${item.article}-${item.brand}`} item={item} zone="red" />
                ))}
                {data.yellow_items.map((item) => (
                  <ItemRow key={`${item.article}-${item.brand}`} item={item} zone="yellow" />
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 text-xs text-gray-500">
            {data && (
              <>
                <span className="text-red-600 font-medium">🔴 {data.red_count}</span>
                <span className="text-yellow-600 font-medium">🟡 {data.yellow_count}</span>
                <span className="text-green-600 font-medium">🟢 {data.green_count}</span>
                <span className="ml-auto">из {data.total_parsed} товаров</span>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
