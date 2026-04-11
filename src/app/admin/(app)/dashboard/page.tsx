"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";
import StatCard from "@/app/admin/components/StatCard";
import RecentOrdersTable from "@/app/admin/components/RecentOrdersTable";

interface RecentOrder {
  id: number;
  orderNumber: string;
  customerName: string;
  total: number;
  status: string;
}

interface DashboardData {
  ordersToday: number;
  ordersYesterday: number;
  revenueToday: number;
  revenueYesterday: number;
  newConversations: number;
  totalProducts: number;
  recentOrders: RecentOrder[];
}

function formatPrice(value: number) {
  return new Intl.NumberFormat("ru-RU", {
    style: "currency",
    currency: "RUB",
    maximumFractionDigits: 0,
  }).format(value);
}

function delta(today: number, yesterday: number, isRevenue = false): { text: string; color: "green" | "red" | "gray" } {
  if (yesterday === 0 && today === 0) return { text: "Нет данных за вчера", color: "gray" };
  if (yesterday === 0) return { text: "Вчера не было", color: "green" };
  const diff = today - yesterday;
  const sign = diff >= 0 ? "+" : "";
  const label = isRevenue ? formatPrice(diff) : String(diff);
  return {
    text: `${sign}${label} к вчера`,
    color: diff >= 0 ? "green" : "red",
  };
}

export default function DashboardPage() {
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/admin/dashboard")
      .then((r) => {
        if (!r.ok) throw new Error("Ошибка загрузки");
        return r.json();
      })
      .then((d: DashboardData) => setData(d))
      .catch((e: unknown) => setError(e instanceof Error ? e.message : "Ошибка"))
      .finally(() => setLoading(false));
  }, []);

  const ordersDelta = data ? delta(data.ordersToday, data.ordersYesterday) : null;
  const revenueDelta = data ? delta(data.revenueToday, data.revenueYesterday, true) : null;

  return (
    <>
      <AdminHeader title="Дашборд" />

      <main className="flex-1 p-6 overflow-y-auto">
        {loading && (
          <div className="text-center text-gray-400 py-20 text-sm">Загрузка...</div>
        )}

        {error && (
          <div className="text-center text-red-500 py-10 text-sm">{error}</div>
        )}

        {data && (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 mb-8">
              <StatCard
                label="Заказы сегодня"
                value={data.ordersToday}
                subtitle={ordersDelta?.text}
                subtitleColor={ordersDelta?.color}
              />
              <StatCard
                label="Выручка сегодня"
                value={formatPrice(data.revenueToday)}
                subtitle={revenueDelta?.text}
                subtitleColor={revenueDelta?.color}
              />
              <StatCard
                label="Новые заявки"
                value={data.newConversations}
                subtitle={data.newConversations > 0 ? "Ожидают ответа" : "Все обработаны"}
                subtitleColor={data.newConversations > 0 ? "amber" : "green"}
              />
              <StatCard
                label="Товаров в наличии"
                value={data.totalProducts}
              />
            </div>

            {/* Recent orders */}
            <div className="bg-white rounded-xl shadow-sm">
              <div className="px-5 py-4 border-b border-gray-100">
                <h2 className="text-base font-semibold text-gray-900">Последние заказы</h2>
              </div>
              <RecentOrdersTable orders={data.recentOrders} />
            </div>
          </>
        )}
      </main>
    </>
  );
}
