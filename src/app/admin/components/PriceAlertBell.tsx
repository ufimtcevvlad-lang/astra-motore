"use client";

import { useEffect, useRef, useState } from "react";
import { Notifications, NotificationItem, fetchNotifications } from "@/app/lib/price-monitor";

interface SourceStatus {
  site: string;
  enabled: number;
  auth_config: string | null;
  last_success_at: string | null;
  last_error: string | null;
}

function formatPrice(p: number) {
  return p.toLocaleString("ru-RU") + " ₽";
}

function ItemRow({
  item,
  zone,
  onDismiss,
}: {
  item: NotificationItem;
  zone: "red" | "yellow";
  onDismiss: () => void;
}) {
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
        <div className="flex items-center gap-1.5 shrink-0">
          <span
            className={`text-xs font-semibold px-1.5 py-0.5 rounded ${
              zone === "red"
                ? "bg-red-100 text-red-700"
                : "bg-yellow-100 text-yellow-700"
            }`}
          >
            {sign}{item.deviation_pct}%
          </span>
          <button
            onClick={onDismiss}
            className="w-5 h-5 flex items-center justify-center text-gray-300 hover:text-gray-600 hover:bg-gray-100 rounded"
            title="Скрыть"
          >
            ×
          </button>
        </div>
      </div>
    </div>
  );
}

const DISMISS_KEY = "price-alerts-dismissed-v1";

function loadDismissed(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(DISMISS_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

function saveDismissed(set: Set<string>) {
  try {
    localStorage.setItem(DISMISS_KEY, JSON.stringify(Array.from(set)));
  } catch {
    /* ignore */
  }
}

function itemKey(item: NotificationItem, generatedAt: string | null): string {
  return `${item.article}|${item.brand}|${generatedAt ?? ""}`;
}

export default function PriceAlertBell() {
  const [data, setData] = useState<Notifications | null>(null);
  const [sources, setSources] = useState<SourceStatus[]>([]);
  const [open, setOpen] = useState(false);
  const [dismissed, setDismissed] = useState<Set<string>>(() => loadDismissed());
  const ref = useRef<HTMLDivElement>(null);

  const dismiss = (item: NotificationItem) => {
    const key = itemKey(item, data?.generated_at ?? null);
    setDismissed((prev) => {
      const next = new Set(prev);
      next.add(key);
      saveDismissed(next);
      return next;
    });
  };

  const dismissAll = () => {
    if (!data) return;
    const keys = [
      ...data.red_items.map((i) => itemKey(i, data.generated_at)),
      ...data.yellow_items.map((i) => itemKey(i, data.generated_at)),
    ];
    setDismissed((prev) => {
      const next = new Set(prev);
      keys.forEach((k) => next.add(k));
      saveDismissed(next);
      return next;
    });
  };

  useEffect(() => {
    const load = () => {
      fetchNotifications().then((d) => {
        setData(d);
        // Prune dismissed keys that no longer match the current batch — keeps localStorage bounded.
        if (d) {
          const liveKeys = new Set([
            ...d.red_items.map((i) => itemKey(i, d.generated_at)),
            ...d.yellow_items.map((i) => itemKey(i, d.generated_at)),
          ]);
          setDismissed((prev) => {
            const next = new Set(Array.from(prev).filter((k) => liveKeys.has(k)));
            if (next.size !== prev.size) saveDismissed(next);
            return next;
          });
        }
      });
      fetch("/api/price-monitor/status")
        .then((r) => (r.ok ? r.json() : { sources: [] }))
        .then((d) => setSources(d.sources || []))
        .catch(() => setSources([]));
    };
    load();
    const id = setInterval(load, 5 * 60 * 1000);
    return () => clearInterval(id);
  }, []);

  // Check exist.ru cookie status — "wholesale" means cookie expired
  const existSource = sources.find((s) => s.site === "exist.ru");
  const existWholesale = existSource?.auth_config === "wholesale";

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  const redItems = (data?.red_items ?? []).filter(
    (i) => !dismissed.has(itemKey(i, data?.generated_at ?? null))
  );
  const yellowItems = (data?.yellow_items ?? []).filter(
    (i) => !dismissed.has(itemKey(i, data?.generated_at ?? null))
  );
  const total = redItems.length + yellowItems.length;
  const hasAlerts = total > 0 || existWholesale;

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
          <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between gap-2">
            <span className="text-sm font-semibold text-gray-900">Ценовые отклонения</span>
            <div className="flex items-center gap-2">
              {total > 0 && (
                <button
                  onClick={dismissAll}
                  className="text-xs text-gray-500 hover:text-gray-800 underline"
                >
                  Скрыть все
                </button>
              )}
              {data?.generated_at && (
                <span className="text-xs text-gray-400">
                  {new Date(data.generated_at).toLocaleDateString("ru-RU", { day: "numeric", month: "short" })}
                </span>
              )}
            </div>
          </div>

          {/* exist.ru cookie warning */}
          {existWholesale && (
            <div className="px-4 py-3 bg-orange-50 border-b border-orange-200">
              <div className="flex items-start gap-2">
                <span className="text-orange-500 text-lg leading-none">⚠️</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-orange-900">exist.ru: слетел cookie</p>
                  <p className="text-xs text-orange-800 mt-0.5">
                    Сейчас парсятся оптовые цены вместо розничных. Нужно обновить cookie — скажи &quot;обнови cookie exist.ru&quot; ассистенту.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Items */}
          <div className="max-h-80 overflow-y-auto">
            {!data || total === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Отклонений нет</p>
            ) : (
              <>
                {redItems.map((item) => (
                  <ItemRow
                    key={`${item.article}-${item.brand}`}
                    item={item}
                    zone="red"
                    onDismiss={() => dismiss(item)}
                  />
                ))}
                {yellowItems.map((item) => (
                  <ItemRow
                    key={`${item.article}-${item.brand}`}
                    item={item}
                    zone="yellow"
                    onDismiss={() => dismiss(item)}
                  />
                ))}
              </>
            )}
          </div>

          {/* Footer */}
          <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 flex items-center gap-3 text-xs text-gray-500">
            {data && (
              <>
                <span className="text-red-600 font-medium">🔴 {redItems.length}</span>
                <span className="text-yellow-600 font-medium">🟡 {yellowItems.length}</span>
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
