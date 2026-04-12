"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";

type Period = "1d" | "7d" | "30d" | "90d";

interface SummaryData {
  visitors: number;
  pageviews: number;
  orders: number;
  revenue: number;
  visitorsChange: number;
  pageviewsChange: number;
  ordersChange: number;
  revenueChange: number;
  metrikaConnected: boolean;
}

interface ChartPoint {
  date: string;
  orders: number;
  revenue: number;
}

interface TopProduct {
  name: string;
  views: number;
}

const PERIOD_LABELS: { value: Period; label: string }[] = [
  { value: "1d", label: "Сегодня" },
  { value: "7d", label: "7 дней" },
  { value: "30d", label: "30 дней" },
  { value: "90d", label: "90 дней" },
];

function formatCurrency(value: number): string {
  return value.toLocaleString("ru-RU") + " \u20BD";
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("ru-RU", { day: "numeric", month: "short" });
}

function ChangeIndicator({ value }: { value: number }) {
  if (value === 0) {
    return <span className="text-xs text-gray-400">0%</span>;
  }
  if (value > 0) {
    return (
      <span className="inline-flex items-center text-xs text-green-600">
        <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
        </svg>
        +{value}%
      </span>
    );
  }
  return (
    <span className="inline-flex items-center text-xs text-red-600">
      <svg className="w-3 h-3 mr-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
      </svg>
      {value}%
    </span>
  );
}

export default function AnalyticsPage() {
  const [period, setPeriod] = useState<Period>("7d");
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [chartData, setChartData] = useState<ChartPoint[]>([]);
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [topSource, setTopSource] = useState<"metrika" | "local">("local");
  const [loading, setLoading] = useState(true);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [summaryRes, chartRes, topRes] = await Promise.all([
        fetch(`/api/admin/analytics/summary?period=${period}`),
        fetch(`/api/admin/analytics/orders-chart?period=${period}`),
        fetch(`/api/admin/analytics/top-products?period=${period}`),
      ]);

      if (summaryRes.ok) {
        setSummary(await summaryRes.json());
      }
      if (chartRes.ok) {
        const chartJson = await chartRes.json();
        setChartData(chartJson.data || []);
      }
      if (topRes.ok) {
        const topJson = await topRes.json();
        setTopProducts(topJson.products || []);
        setTopSource(topJson.source || "local");
      }
    } catch (err) {
      console.error("Failed to fetch analytics:", err);
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const maxOrders = Math.max(...chartData.map((d) => d.orders), 1);

  return (
    <div className="flex flex-col h-full">
      <AdminHeader title="Аналитика">
        <div className="flex items-center gap-3">
          <a
            href="https://metrika.yandex.ru"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Яндекс.Метрика &#8599;
          </a>
          <a
            href="https://analytics.google.com"
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm text-indigo-600 hover:text-indigo-800"
          >
            Google Analytics &#8599;
          </a>
        </div>
      </AdminHeader>

      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Period selector */}
        <div className="flex gap-2">
          {PERIOD_LABELS.map((p) => (
            <button
              key={p.value}
              onClick={() => setPeriod(p.value)}
              className={`px-4 py-2 text-sm rounded-lg transition-colors ${
                period === p.value
                  ? "bg-indigo-600 text-white"
                  : "bg-white text-gray-700 hover:bg-gray-100 border border-gray-200"
              }`}
            >
              {p.label}
            </button>
          ))}
        </div>

        {/* Metrika not connected warning */}
        {summary && !summary.metrikaConnected && (
          <div className="bg-white rounded-xl shadow-sm p-5 flex items-center justify-between border border-amber-200 bg-amber-50">
            <div>
              <p className="text-sm font-medium text-amber-800">
                Яндекс.Метрика не подключена
              </p>
              <p className="text-xs text-amber-600 mt-1">
                Подключите Метрику для отслеживания посетителей и просмотров
              </p>
            </div>
            <a
              href="/admin/settings/integrations"
              className="px-4 py-2 text-sm bg-amber-600 text-white rounded-lg hover:bg-amber-700 transition-colors"
            >
              Настроить
            </a>
          </div>
        )}

        {/* Summary cards */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="bg-white rounded-xl shadow-sm p-5 animate-pulse">
                <div className="h-4 bg-gray-200 rounded w-24 mb-3" />
                <div className="h-8 bg-gray-200 rounded w-16" />
              </div>
            ))}
          </div>
        ) : summary ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Visitors */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Посетители</span>
                <ChangeIndicator value={summary.visitorsChange} />
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.metrikaConnected
                  ? summary.visitors.toLocaleString("ru-RU")
                  : "\u2014"}
              </p>
            </div>

            {/* Pageviews */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Просмотры</span>
                <ChangeIndicator value={summary.pageviewsChange} />
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.metrikaConnected
                  ? summary.pageviews.toLocaleString("ru-RU")
                  : "\u2014"}
              </p>
            </div>

            {/* Orders */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Заказы</span>
                <ChangeIndicator value={summary.ordersChange} />
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {summary.orders.toLocaleString("ru-RU")}
              </p>
            </div>

            {/* Revenue */}
            <div className="bg-white rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-sm text-gray-500">Выручка</span>
                <ChangeIndicator value={summary.revenueChange} />
              </div>
              <p className="text-2xl font-semibold text-gray-900">
                {formatCurrency(summary.revenue)}
              </p>
            </div>
          </div>
        ) : null}

        {/* Orders chart */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h2 className="text-sm font-medium text-gray-700 mb-4">
            Заказы за период
          </h2>
          {loading ? (
            <div className="h-48 bg-gray-100 rounded animate-pulse" />
          ) : chartData.length > 0 ? (
            <div className="flex items-end gap-1 h-48">
              {chartData.map((d) => (
                <div
                  key={d.date}
                  className="flex-1 flex flex-col items-center gap-1 group relative"
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap z-10">
                    {d.orders} {d.orders === 1 ? "заказ" : "заказов"} &middot;{" "}
                    {formatCurrency(d.revenue)}
                  </div>
                  <div
                    className="w-full bg-indigo-500 rounded-t hover:bg-indigo-600 transition-colors cursor-default"
                    style={{
                      height: `${(d.orders / maxOrders) * 100}%`,
                      minHeight: d.orders > 0 ? "4px" : "0",
                    }}
                  />
                  <span className="text-xs text-gray-500 truncate w-full text-center">
                    {formatDate(d.date)}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-sm text-gray-400">
              Нет данных за выбранный период
            </div>
          )}
        </div>

        {/* Top products */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-sm font-medium text-gray-700">
              Популярные товары
            </h2>
            <span className="text-xs text-gray-400">
              {topSource === "metrika" ? "Данные из Метрики" : "Локальные данные"}
            </span>
          </div>
          {loading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="h-6 bg-gray-100 rounded animate-pulse" />
              ))}
            </div>
          ) : topProducts.length > 0 ? (
            <table className="w-full">
              <thead>
                <tr className="text-xs text-gray-500 border-b border-gray-100">
                  <th className="text-left pb-2 font-medium">#</th>
                  <th className="text-left pb-2 font-medium">Товар</th>
                  <th className="text-right pb-2 font-medium">Просмотры</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.map((product, idx) => (
                  <tr
                    key={idx}
                    className="border-b border-gray-50 last:border-0"
                  >
                    <td className="py-2 text-sm text-gray-400 w-8">
                      {idx + 1}
                    </td>
                    <td className="py-2 text-sm text-gray-900">
                      {product.name}
                    </td>
                    <td className="py-2 text-sm text-gray-600 text-right">
                      {product.views.toLocaleString("ru-RU")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-sm text-gray-400 text-center py-4">
              Нет данных о просмотрах товаров
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
