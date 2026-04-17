"use client";

import { useEffect, useState } from "react";
import {
  SiteResult,
  SiteStatus,
  SiteResultsResponse,
  fetchSiteResults,
  refreshSiteResults,
  addBrandAlias,
  formatPrice,
} from "@/app/lib/price-monitor";

interface Props {
  article: string;
  brand: string;
  yourPrice: number;
}

const SITE_ORDER = ["exist.ru", "emex.ru", "part-kom.ru", "vdopel.ru", "plentycar.ru"];

const STATUS_STYLE: Record<SiteStatus, { dot: string; label: string }> = {
  OFFERS: { dot: "bg-green-500", label: "В наличии" },
  OUT_OF_STOCK: { dot: "bg-yellow-500", label: "Нет в наличии" },
  NOT_FOUND: { dot: "bg-orange-500", label: "Не нашёл" },
  ERROR: { dot: "bg-red-500", label: "Ошибка" },
  NOT_CONFIGURED: { dot: "bg-gray-400", label: "Не настроен" },
};

export default function MarketPriceWidget({ article, brand }: Props) {
  const [data, setData] = useState<SiteResultsResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!article || !brand) return;
    setLoading(true);
    fetchSiteResults(article, brand).then((d) => {
      setData(d);
      setLoading(false);
    });
  }, [article, brand]);

  const refresh = async () => {
    setRefreshing(true);
    const d = await refreshSiteResults(article, brand);
    if (d) setData(d);
    setRefreshing(false);
  };

  const addAlias = async (aliasBrand: string, site: string) => {
    const ok = await addBrandAlias(brand, aliasBrand, site);
    if (ok) refresh();
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50 text-sm text-gray-500">
        Загрузка...
      </div>
    );
  }

  const bySite = new Map<string, SiteResult>((data?.sites ?? []).map((s) => [s.site, s]));
  const prices = (data?.sites ?? [])
    .filter((s) => s.status === "OFFERS")
    .flatMap((s) => s.offers.map((o) => o.price));
  const min = prices.length ? Math.min(...prices) : null;
  const max = prices.length ? Math.max(...prices) : null;
  const median = prices.length
    ? [...prices].sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    : null;
  const found = (data?.sites ?? []).filter(
    (s) => s.status === "OFFERS" || s.status === "OUT_OF_STOCK"
  ).length;

  const scrapedAt = data?.scraped_at ? new Date(data.scraped_at) : null;
  const ageHours = scrapedAt ? (Date.now() - scrapedAt.getTime()) / 3_600_000 : null;
  const isStale = ageHours !== null && ageHours > 48;
  const scrapedLabel = scrapedAt
    ? scrapedAt.toLocaleString("ru-RU", {
        day: "numeric",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      })
    : null;

  return (
    <div className="border rounded-lg p-4 bg-white">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <h4 className="font-medium text-sm">Рыночные цены</h4>
          {scrapedLabel ? (
            <span className={`text-xs ${isStale ? "text-orange-600" : "text-gray-400"}`}>
              {isStale ? "⚠ устарело · " : ""}{scrapedLabel}
            </span>
          ) : (
            <span className="text-xs text-gray-400">ещё не парсили</span>
          )}
        </div>
        <button
          onClick={refresh}
          disabled={refreshing}
          className="text-xs px-2 py-1 border rounded hover:bg-gray-50 disabled:opacity-50"
        >
          {refreshing ? "Парсинг..." : "Обновить"}
        </button>
      </div>

      {prices.length > 0 && (
        <div className="flex gap-4 text-sm mb-3 text-gray-700">
          <span>
            Мин: <b>{formatPrice(min!)}</b>
          </span>
          <span>
            Медиана: <b>{formatPrice(median!)}</b>
          </span>
          <span>
            Макс: <b>{formatPrice(max!)}</b>
          </span>
          <span className="text-gray-500">({found} из 5 нашли)</span>
        </div>
      )}

      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-gray-500 text-xs">
            <th className="pb-1">Сайт</th>
            <th className="pb-1">Статус</th>
            <th className="pb-1">Цена</th>
            <th className="pb-1">Детали</th>
          </tr>
        </thead>
        <tbody>
          {SITE_ORDER.map((site) => {
            const r = bySite.get(site);
            if (!r) {
              return (
                <tr key={site} className="border-t border-gray-100 text-gray-400">
                  <td className="py-1">{site}</td>
                  <td colSpan={3} className="py-1 text-xs">
                    ещё не парсили — нажмите «Обновить»
                  </td>
                </tr>
              );
            }
            return (
              <tr key={site} className="border-t border-gray-100">
                <td className="py-1">{r.site}</td>
                <td className="py-1">
                  <span
                    className={`inline-block w-2 h-2 rounded-full ${STATUS_STYLE[r.status].dot} mr-1`}
                  />
                  {STATUS_STYLE[r.status].label}
                </td>
                <td className="py-1 font-medium">
                  {r.offers.length > 0 ? formatPrice(r.offers[0].price) : "—"}
                </td>
                <td className="py-1 text-gray-600 text-xs">
                  {r.status === "OFFERS" &&
                    r.offers[0].delivery_days != null &&
                    `${r.offers[0].delivery_days} дн.`}
                  {r.status === "ERROR" && (r.error_text ?? r.error_category)}
                  {r.status === "NOT_CONFIGURED" && r.error_text}
                  {r.status === "NOT_FOUND" && r.found_brands && r.found_brands.length > 0 && (
                    <span>
                      сайт знает:{" "}
                      {r.found_brands.map((b, j) => (
                        <button
                          key={j}
                          onClick={() => addAlias(b, r.site)}
                          className="underline hover:text-blue-600 mr-2"
                        >
                          {b} [+ алиас]
                        </button>
                      ))}
                    </span>
                  )}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
