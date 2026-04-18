"use client";

import { useRef, useState } from "react";

export interface OrderFiltersState {
  search: string;
  status: string;
  paymentMethod: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  statusCounts: Record<string, number>;
  onChange: (filters: OrderFiltersState) => void;
}

export const defaultOrderFilters: OrderFiltersState = {
  search: "",
  status: "",
  paymentMethod: "",
  dateFrom: "",
  dateTo: "",
};

const STATUS_TABS = [
  { key: "", label: "Все", color: "bg-green-600 text-white", activeColor: "bg-green-600 text-white" },
  { key: "new", label: "Новые", color: "text-amber-600 border-amber-200", activeColor: "bg-amber-50 text-amber-700 border-amber-300" },
  { key: "processing", label: "В обработке", color: "text-indigo-600 border-indigo-200", activeColor: "bg-indigo-50 text-indigo-700 border-indigo-300" },
  { key: "shipped", label: "Отправлен", color: "text-blue-600 border-blue-200", activeColor: "bg-blue-50 text-blue-700 border-blue-300" },
  { key: "delivered", label: "Доставлен", color: "text-green-600 border-green-200", activeColor: "bg-green-50 text-green-700 border-green-300" },
  { key: "cancelled", label: "Отменён", color: "text-red-600 border-red-200", activeColor: "bg-red-50 text-red-700 border-red-300" },
];

export default function OrderFilters({ filters, statusCounts, onChange }: OrderFiltersProps) {
  const [localSearch, setLocalSearch] = useState(filters.search);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onChange({ ...filters, search: value });
    }, 300);
  }

  function handleChange(key: keyof OrderFiltersState, value: string) {
    onChange({ ...filters, [key]: value });
  }

  return (
    <div className="space-y-3 mb-4">
      {/* Строка фильтров */}
      <div className="bg-white rounded-xl shadow-sm p-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">🔍</span>
            <input
              type="text"
              placeholder="Номер, клиент, телефон"
              value={localSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <select
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Все статусы</option>
            <option value="new">Новый</option>
            <option value="processing">В обработке</option>
            <option value="shipped">Отправлен</option>
            <option value="delivered">Доставлен</option>
            <option value="cancelled">Отменён</option>
          </select>

          <select
            value={filters.paymentMethod}
            onChange={(e) => handleChange("paymentMethod", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Все способы оплаты</option>
            <option value="sbp">СБП</option>
            <option value="card">Карта</option>
            <option value="cash">Наличные</option>
          </select>

          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange("dateFrom", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <span className="text-gray-400">—</span>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange("dateTo", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* Табы статусов */}
      <div className="flex flex-wrap gap-2">
        {STATUS_TABS.map((tab) => {
          const count = tab.key === "" ? statusCounts.all : (statusCounts[tab.key] ?? 0);
          const isActive = filters.status === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => handleChange("status", tab.key)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium border transition ${
                isActive ? tab.activeColor : `${tab.color} bg-white hover:bg-gray-50`
              }`}
            >
              {tab.label} {count}
            </button>
          );
        })}
      </div>
    </div>
  );
}
