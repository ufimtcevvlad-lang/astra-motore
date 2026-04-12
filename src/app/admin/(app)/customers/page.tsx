"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import Link from "next/link";
import AdminHeader from "@/app/admin/components/AdminHeader";
import Pagination from "@/app/admin/components/Pagination";

interface Customer {
  phone: string;
  name: string;
  email: string;
  orderCount: number;
  totalSpent: number;
  lastOrderDate: string | null;
  status: string;
}

const STATUS_OPTIONS = [
  { value: "", label: "Все" },
  { value: "new", label: "Новый" },
  { value: "regular", label: "Постоянный" },
  { value: "vip", label: "VIP" },
  { value: "wholesale", label: "Оптовик" },
];

const SORT_OPTIONS = [
  { value: "lastOrder", label: "По дате" },
  { value: "totalSpent", label: "По сумме" },
  { value: "orderCount", label: "По заказам" },
];

const STATUS_BADGE: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  regular: "bg-indigo-100 text-indigo-800",
  vip: "bg-green-100 text-green-800",
  wholesale: "bg-blue-100 text-blue-800",
};

const STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  regular: "Постоянный",
  vip: "VIP",
  wholesale: "Оптовик",
};

function formatPrice(kopecks: number) {
  return new Intl.NumberFormat("ru-RU").format(kopecks) + " \u20BD";
}

function formatDate(iso: string | null) {
  if (!iso) return "\u2014";
  return new Date(iso).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [sort, setSort] = useState("lastOrder");
  const [loading, setLoading] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const fetchCustomers = useCallback(
    async (p: number, s: string, st: string, sr: string) => {
      setLoading(true);
      try {
        const params = new URLSearchParams({ page: String(p) });
        if (s) params.set("search", s);
        if (st) params.set("status", st);
        if (sr) params.set("sort", sr);
        const res = await fetch(`/api/admin/customers?${params}`);
        if (!res.ok) throw new Error("Fetch failed");
        const data = await res.json();
        setCustomers(data.customers);
        setTotal(data.total);
        setTotalPages(data.totalPages);
      } catch {
        /* empty */
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    fetchCustomers(page, search, status, sort);
  }, [page, status, sort, fetchCustomers]);

  const handleSearch = (val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchCustomers(1, val, status, sort);
    }, 300);
  };

  return (
    <div className="flex flex-col h-full">
      <AdminHeader title="Клиенты" />

      <div className="p-6 flex-1 overflow-auto">
        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3 mb-5">
          <input
            type="text"
            placeholder="Поиск по имени, телефону, email..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-72 focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value);
              setPage(1);
            }}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {SORT_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </select>
          <span className="text-sm text-gray-500 ml-auto">
            {total} {total === 1 ? "клиент" : "клиентов"}
          </span>
        </div>

        {/* Table */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Клиент</th>
                <th className="px-4 py-3 font-medium text-gray-600">Телефон</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Заказов</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Сумма</th>
                <th className="px-4 py-3 font-medium text-gray-600">Последний заказ</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Статус</th>
              </tr>
            </thead>
            <tbody>
              {loading && customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Загрузка...
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-gray-400">
                    Клиенты не найдены
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
                  <tr
                    key={c.phone}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/customers/${encodeURIComponent(c.phone)}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {c.name || "Без имени"}
                      </Link>
                      {c.email && (
                        <p className="text-xs text-gray-400 mt-0.5">{c.email}</p>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{c.phone}</td>
                    <td className="px-4 py-3 text-center text-gray-700">{c.orderCount}</td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatPrice(c.totalSpent)}
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(c.lastOrderDate)}</td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[c.status] || STATUS_BADGE.new}`}
                      >
                        {STATUS_LABEL[c.status] || c.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="mt-4">
            <Pagination page={page} totalPages={totalPages} onPageChange={setPage} />
          </div>
        )}
      </div>
    </div>
  );
}
