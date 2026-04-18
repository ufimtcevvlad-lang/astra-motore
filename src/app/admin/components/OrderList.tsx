"use client";

import Link from "next/link";
import Pagination from "./Pagination";
import { ORDER_STATUS_LABELS, ORDER_STATUS_BADGE, PAYMENT_LABELS } from "@/app/admin/lib/order-status";

interface OrderListItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  itemsSummary: string;
  total: number;
  deliveryMethod: string;
  deliveryCity: string;
  paymentMethod: string;
  status: string;
  isUrgent: boolean;
  createdAt: string;
}

interface OrderListProps {
  orders: OrderListItem[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
}

export default function OrderList({
  orders,
  page,
  totalPages,
  onPageChange,
}: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
        Заказы не найдены
      </div>
    );
  }

  function formatDelivery(method: string, city: string) {
    if (method === "pickup") return "Самовывоз";
    return city ? `СДЭК, ${city}` : "СДЭК";
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">№</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Дата</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden sm:table-cell">Клиент</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden lg:table-cell">Товары</th>
              <th className="text-right px-4 py-3 text-xs font-medium text-gray-500 uppercase">Сумма</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Доставка</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase hidden md:table-cell">Оплата</th>
              <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase">Статус</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition"
              >
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                    #{order.orderNumber.replace("AM-", "").replace(/-/g, "").slice(-4)}
                  </Link>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                  {new Date(order.createdAt).toLocaleDateString("ru-RU", { day: "2-digit", month: "2-digit" })}{" "}
                  {new Date(order.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="text-sm text-gray-900">{order.customerName}</div>
                  <div className="text-xs text-gray-500">{order.customerPhone}</div>
                </td>
                <td className="px-4 py-3 hidden lg:table-cell text-sm text-gray-600 max-w-[250px] truncate">
                  {order.itemsSummary}
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900 whitespace-nowrap">
                  {Number(order.total).toLocaleString("ru-RU")} ₽
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">
                  {formatDelivery(order.deliveryMethod, order.deliveryCity)}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">
                  {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${ORDER_STATUS_BADGE[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {ORDER_STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Pagination page={page} totalPages={totalPages} onPageChange={onPageChange} />
    </div>
  );
}
