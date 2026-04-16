"use client";

import { useState, useEffect } from "react";
import {
  MarketSummary,
  PriceZone,
  getPriceZone,
  formatPrice,
  fetchMarketData,
  triggerParse,
} from "@/app/lib/price-monitor";

interface Props {
  article: string;
  brand: string;
  yourPrice: number;
}

const ZONE_STYLES: Record<PriceZone, { bg: string; text: string; label: string }> = {
  red: { bg: "bg-red-50 border-red-200", text: "text-red-700", label: "Выше рынка" },
  green: { bg: "bg-green-50 border-green-200", text: "text-green-700", label: "В рынке" },
  yellow: { bg: "bg-yellow-50 border-yellow-200", text: "text-yellow-700", label: "Ниже рынка" },
  no_data: { bg: "bg-gray-50 border-gray-200", text: "text-gray-500", label: "Нет данных" },
};

export default function MarketPriceWidget({ article, brand, yourPrice }: Props) {
  const [data, setData] = useState<MarketSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [parsing, setParsing] = useState(false);

  useEffect(() => {
    if (article && brand) {
      setLoading(true);
      fetchMarketData(article, brand).then((d) => {
        setData(d);
        setLoading(false);
      });
    }
  }, [article, brand]);

  const handleParse = async () => {
    setParsing(true);
    const result = await triggerParse(article, brand);
    if (result) setData(result);
    setParsing(false);
  };

  if (loading) {
    return (
      <div className="border rounded-lg p-4 bg-gray-50">
        <div className="text-sm text-gray-500">Загрузка рыночных цен...</div>
      </div>
    );
  }

  const zone = getPriceZone(yourPrice, data);
  const style = ZONE_STYLES[zone];

  return (
    <div className={`border rounded-lg p-4 ${style.bg}`}>
      <div className="flex items-center justify-between mb-3">
        <h4 className="font-medium text-sm">Рыночные цены</h4>
        <div className="flex items-center gap-2">
          <span className={`text-xs font-medium px-2 py-0.5 rounded ${style.text} ${style.bg}`}>
            {style.label}
          </span>
          <button
            onClick={handleParse}
            disabled={parsing}
            className="text-xs px-2 py-1 bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
          >
            {parsing ? "Парсинг..." : "Обновить"}
          </button>
        </div>
      </div>

      {data && data.offers.length > 0 ? (
        <>
          <div className="flex gap-4 text-sm mb-3">
            <span>Мин: <b>{formatPrice(data.min_price)}</b></span>
            <span>Медиана: <b>{formatPrice(data.median_price)}</b></span>
            <span>Макс: <b>{formatPrice(data.max_price)}</b></span>
            <span className="text-gray-500">({data.sites_count} сайтов)</span>
          </div>

          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-gray-500 text-xs">
                <th className="pb-1">Сайт</th>
                <th className="pb-1">Цена</th>
                <th className="pb-1">Доставка</th>
                <th className="pb-1">Наличие</th>
              </tr>
            </thead>
            <tbody>
              {data.offers
                .sort((a, b) => a.price - b.price)
                .map((offer, i) => (
                  <tr key={i} className="border-t border-gray-100">
                    <td className="py-1">{offer.site}</td>
                    <td className="py-1 font-medium">{formatPrice(offer.price)}</td>
                    <td className="py-1 text-gray-500">
                      {offer.delivery_days ? `${offer.delivery_days} дн.` : "—"}
                    </td>
                    <td className="py-1">
                      {offer.in_stock === 1 ? "✓" : offer.in_stock === 0 ? "✗" : "—"}
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </>
      ) : (
        <p className="text-sm text-gray-500">
          Нет данных. Нажмите «Обновить» для парсинга.
        </p>
      )}
    </div>
  );
}
