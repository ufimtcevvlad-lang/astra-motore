"use client";

import { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import AdminHeader from "@/app/admin/components/AdminHeader";
import StatCard from "@/app/admin/components/StatCard";
import Pagination from "@/app/admin/components/Pagination";

interface CustomerDetail {
  name: string;
  phone: string;
  email: string;
  status: string;
  carModels: string;
  notes: string;
  orderCount: number;
  totalSpent: number;
  avgCheck: number;
  lastOrderDate: string | null;
}

interface OrderItem {
  id: number;
  orderNumber: string;
  itemsSummary: string;
  total: number;
  status: string;
  createdAt: string;
}

const STATUS_OPTIONS = [
  { value: "new", label: "Новый" },
  { value: "regular", label: "Постоянный" },
  { value: "vip", label: "VIP" },
  { value: "wholesale", label: "Оптовик" },
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

const ORDER_STATUS_BADGE: Record<string, string> = {
  new: "bg-blue-100 text-blue-800",
  processing: "bg-amber-100 text-amber-800",
  shipped: "bg-indigo-100 text-indigo-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const ORDER_STATUS_LABEL: Record<string, string> = {
  new: "Новый",
  processing: "В работе",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
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

export default function CustomerDetailPage() {
  const params = useParams();
  const phone = decodeURIComponent(params.phone as string);

  const [customer, setCustomer] = useState<CustomerDetail | null>(null);
  const [orders, setOrders] = useState<OrderItem[]>([]);
  const [ordersPage, setOrdersPage] = useState(1);
  const [totalOrderPages, setTotalOrderPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit mode
  const [editing, setEditing] = useState(false);
  const [editStatus, setEditStatus] = useState("new");
  const [editCarModels, setEditCarModels] = useState("");

  // Notes
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesText, setNotesText] = useState("");
  const [saving, setSaving] = useState(false);

  const fetchCustomer = useCallback(
    async (p: number) => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/admin/customers/${encodeURIComponent(phone)}?page=${p}`
        );
        if (!res.ok) throw new Error("Not found");
        const data = await res.json();
        setCustomer(data.customer);
        setOrders(data.orders);
        setTotalOrderPages(data.totalOrderPages);
        setEditStatus(data.customer.status);
        setEditCarModels(data.customer.carModels);
        setNotesText(data.customer.notes);
      } catch {
        setError("Клиент не найден");
      } finally {
        setLoading(false);
      }
    },
    [phone]
  );

  useEffect(() => {
    fetchCustomer(ordersPage);
  }, [ordersPage, fetchCustomer]);

  const saveNotes = async (fields: Record<string, string>) => {
    setSaving(true);
    try {
      await fetch(`/api/admin/customers/${encodeURIComponent(phone)}/notes`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });
      await fetchCustomer(ordersPage);
    } catch {
      /* empty */
    } finally {
      setSaving(false);
    }
  };

  const handleSaveProfile = async () => {
    await saveNotes({ status: editStatus, carModels: editCarModels });
    setEditing(false);
  };

  const handleSaveNotes = async () => {
    await saveNotes({ notes: notesText });
    setEditingNotes(false);
  };

  if (loading && !customer) {
    return (
      <div className="flex flex-col h-full">
        <AdminHeader title="Карточка клиента" />
        <div className="p-6 text-center text-gray-400">Загрузка...</div>
      </div>
    );
  }

  if (error || !customer) {
    return (
      <div className="flex flex-col h-full">
        <AdminHeader title="Карточка клиента" />
        <div className="p-6 text-center text-gray-400">{error || "Клиент не найден"}</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <AdminHeader title="Карточка клиента">
        <Link
          href="/admin/customers"
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          &larr; К списку
        </Link>
      </AdminHeader>

      <div className="p-6 flex-1 overflow-auto space-y-6">
        {/* Header section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <h2 className="text-xl font-bold text-gray-900">
                  {customer.name || "Без имени"}
                </h2>
                <span
                  className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE[customer.status] || STATUS_BADGE.new}`}
                >
                  {STATUS_LABEL[customer.status] || customer.status}
                </span>
              </div>
              <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm text-gray-600">
                <span>{customer.phone}</span>
                {customer.email && <span>{customer.email}</span>}
                {customer.carModels && (
                  <span className="text-gray-500">
                    Авто: {customer.carModels}
                  </span>
                )}
              </div>
            </div>
            <div className="flex gap-2">
              <Link
                href="/admin/conversations"
                className="px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
              >
                Чаты
              </Link>
              <button
                onClick={() => setEditing(!editing)}
                className="px-3 py-1.5 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                {editing ? "Отмена" : "Редактировать"}
              </button>
            </div>
          </div>

          {/* Edit form */}
          {editing && (
            <div className="mt-4 pt-4 border-t border-gray-200 flex flex-wrap items-end gap-4">
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Статус
                </label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                >
                  {STATUS_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex-1 min-w-[200px]">
                <label className="block text-xs font-medium text-gray-500 mb-1">
                  Модели авто
                </label>
                <input
                  type="text"
                  value={editCarModels}
                  onChange={(e) => setEditCarModels(e.target.value)}
                  placeholder="Например: Chevrolet Tahoe 2018"
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <button
                onClick={handleSaveProfile}
                disabled={saving}
                className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
              >
                {saving ? "Сохранение..." : "Сохранить"}
              </button>
            </div>
          )}
        </div>

        {/* Stat cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard label="Заказов" value={customer.orderCount} />
          <StatCard label="Общая сумма" value={formatPrice(customer.totalSpent)} />
          <StatCard label="Средний чек" value={formatPrice(customer.avgCheck)} />
          <StatCard label="Последний заказ" value={formatDate(customer.lastOrderDate)} />
        </div>

        {/* Notes */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              Заметки
            </h3>
            <button
              onClick={() => {
                if (editingNotes) {
                  handleSaveNotes();
                } else {
                  setEditingNotes(true);
                }
              }}
              disabled={saving}
              className="text-sm text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
            >
              {editingNotes ? (saving ? "Сохранение..." : "Сохранить") : "Редактировать"}
            </button>
          </div>
          {editingNotes ? (
            <textarea
              value={notesText}
              onChange={(e) => setNotesText(e.target.value)}
              rows={4}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-y"
              placeholder="Добавить заметки о клиенте..."
            />
          ) : (
            <p className="text-sm text-gray-600 whitespace-pre-wrap">
              {customer.notes || "Нет заметок"}
            </p>
          )}
        </div>

        {/* Orders history */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-200">
            <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wider">
              История заказов
            </h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50 text-left">
                <th className="px-4 py-3 font-medium text-gray-600">Заказ</th>
                <th className="px-4 py-3 font-medium text-gray-600">Дата</th>
                <th className="px-4 py-3 font-medium text-gray-600">Товары</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-right">Сумма</th>
                <th className="px-4 py-3 font-medium text-gray-600 text-center">Статус</th>
              </tr>
            </thead>
            <tbody>
              {orders.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-gray-400">
                    Заказов пока нет
                  </td>
                </tr>
              ) : (
                orders.map((o) => (
                  <tr
                    key={o.id}
                    className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                  >
                    <td className="px-4 py-3">
                      <Link
                        href={`/admin/orders/${o.id}`}
                        className="text-indigo-600 hover:text-indigo-800 font-medium"
                      >
                        {o.orderNumber}
                      </Link>
                    </td>
                    <td className="px-4 py-3 text-gray-500">{formatDate(o.createdAt)}</td>
                    <td className="px-4 py-3 text-gray-600 max-w-xs truncate">
                      {o.itemsSummary}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-gray-900">
                      {formatPrice(o.total)}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${ORDER_STATUS_BADGE[o.status] || "bg-gray-100 text-gray-800"}`}
                      >
                        {ORDER_STATUS_LABEL[o.status] || o.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {totalOrderPages > 1 && (
            <div className="px-4 py-3 border-t border-gray-200">
              <Pagination
                page={ordersPage}
                totalPages={totalOrderPages}
                onPageChange={setOrdersPage}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
