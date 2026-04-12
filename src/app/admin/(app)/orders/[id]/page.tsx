"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";

interface OrderItem {
  name: string;
  quantity: number;
  price: number;
  sum: number;
}

interface StatusHistoryEntry {
  id: number;
  status: string;
  comment: string;
  adminName: string | null;
  createdAt: string;
}

interface CustomerStats {
  orderCount: number;
  totalSpent: number;
}

interface Order {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  customerEmail: string;
  items: OrderItem[];
  total: number;
  deliveryMethod: string;
  deliveryCity: string;
  deliveryAddress: string;
  deliveryCost: number;
  deliveryQuote: { tariffName?: string; deliverySum?: number; periodMin?: number | null; periodMax?: number | null } | null;
  cdekPickupPoint: { name?: string; address?: string; city?: string } | null;
  paymentMethod: string;
  status: string;
  isUrgent: boolean;
  comment: string;
  createdAt: string;
  updatedAt: string;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUS_BUTTON_COLORS: Record<string, { active: string; inactive: string }> = {
  new: { active: "bg-amber-100 text-amber-800 border-amber-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  processing: { active: "bg-indigo-100 text-indigo-800 border-indigo-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  shipped: { active: "bg-blue-100 text-blue-800 border-blue-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  delivered: { active: "bg-green-100 text-green-800 border-green-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
  cancelled: { active: "bg-red-100 text-red-800 border-red-300", inactive: "bg-white text-gray-600 border-gray-200 hover:bg-gray-50" },
};

const PAYMENT_LABELS: Record<string, string> = {
  sbp: "СБП",
  card: "Карта",
  cash: "Наличные",
};

// Прогрессия статусов для timeline
const STATUS_PROGRESSION = ["new", "processing", "shipped", "delivered"];

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [customerStats, setCustomerStats] = useState<CustomerStats>({ orderCount: 0, totalSpent: 0 });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Смена статуса
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");

  // Редактирование товаров
  const [editingItems, setEditingItems] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);

  // Редактирование клиента
  const [editingClient, setEditingClient] = useState(false);
  const [editClient, setEditClient] = useState({ name: "", phone: "", email: "" });

  // Редактирование доставки
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [editDelivery, setEditDelivery] = useState({ method: "", city: "", address: "" });

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) { router.push("/admin/orders"); return; }
      const data = await res.json();
      setOrder(data.order);
      setStatusHistory(data.statusHistory ?? []);
      setCustomerStats(data.customerStats ?? { orderCount: 0, totalSpent: 0 });
      setNewStatus(data.order.status);
    } catch {
      router.push("/admin/orders");
    } finally {
      setLoading(false);
    }
  }, [id, router]);

  useEffect(() => { fetchOrder(); }, [fetchOrder]);

  async function handleStatusChange() {
    if (!newStatus || newStatus === order?.status) return;
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, comment: statusComment }),
      });
      setStatusComment("");
      await fetchOrder();
    } finally { setSaving(false); }
  }

  async function handleUrgentToggle() {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${id}/urgent`, { method: "PATCH" });
      await fetchOrder();
    } finally { setSaving(false); }
  }

  async function saveItems() {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: editItems }),
      });
      setEditingItems(false);
      await fetchOrder();
    } finally { setSaving(false); }
  }

  async function saveClient() {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerName: editClient.name, customerPhone: editClient.phone, customerEmail: editClient.email }),
      });
      setEditingClient(false);
      await fetchOrder();
    } finally { setSaving(false); }
  }

  async function saveDelivery() {
    setSaving(true);
    try {
      await fetch(`/api/admin/orders/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deliveryMethod: editDelivery.method, deliveryCity: editDelivery.city, deliveryAddress: editDelivery.address }),
      });
      setEditingDelivery(false);
      await fetchOrder();
    } finally { setSaving(false); }
  }

  if (loading || !order) {
    return (
      <>
        <AdminHeader title="Заказ" />
        <div className="p-6 text-center text-gray-400">Загрузка...</div>
      </>
    );
  }

  // Находим пройденные шаги для timeline
  const currentStepIndex = STATUS_PROGRESSION.indexOf(order.status);
  const isCancelled = order.status === "cancelled";

  // Собираем данные истории по статусу
  const historyByStatus: Record<string, StatusHistoryEntry> = {};
  for (const entry of [...statusHistory].reverse()) {
    historyByStatus[entry.status] = entry;
  }

  return (
    <>
      <AdminHeader title={`Заказ ${order.orderNumber} — детали`} />

      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 max-w-6xl">
        {/* === ЛЕВАЯ КОЛОНКА === */}
        <div className="space-y-6">
          {/* Статус заказа */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Статус заказа</h3>
            <div className="flex flex-wrap gap-2 mb-2">
              {["new", "processing", "shipped", "delivered"].map((s) => {
                const isActive = newStatus === s;
                const colors = STATUS_BUTTON_COLORS[s];
                return (
                  <button
                    key={s}
                    onClick={() => setNewStatus(s)}
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${isActive ? colors.active : colors.inactive}`}
                  >
                    {STATUS_LABELS[s]}
                  </button>
                );
              })}
            </div>
            <div className="mb-3">
              <button
                onClick={() => setNewStatus("cancelled")}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium border transition ${
                  newStatus === "cancelled"
                    ? STATUS_BUTTON_COLORS.cancelled.active
                    : STATUS_BUTTON_COLORS.cancelled.inactive
                }`}
              >
                {STATUS_LABELS.cancelled}
              </button>
            </div>
            <textarea
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              placeholder="Комментарий к смене статуса (необязательно)"
              rows={2}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none mb-3"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleStatusChange}
                disabled={saving || newStatus === order.status}
                className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
              >
                Сменить статус
              </button>
              <label className="flex items-center gap-1.5 text-sm text-gray-600">
                <input type="checkbox" defaultChecked className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500" />
                Уведомить клиента
              </label>
            </div>
          </div>

          {/* Клиент */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Клиент</h3>
              {!editingClient && (
                <button onClick={() => { setEditClient({ name: order.customerName, phone: order.customerPhone, email: order.customerEmail }); setEditingClient(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">
                  Редактировать
                </button>
              )}
            </div>
            {editingClient ? (
              <div className="space-y-3">
                <input value={editClient.name} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} placeholder="Имя" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
                <input value={editClient.phone} onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} placeholder="Телефон" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
                <input value={editClient.email} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} placeholder="Email" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
                <div className="flex gap-2">
                  <button onClick={saveClient} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Сохранить</button>
                  <button onClick={() => setEditingClient(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm">
                <div className="font-medium text-gray-900">{order.customerName}</div>
                <div><a href={`tel:${order.customerPhone}`} className="text-indigo-600 hover:text-indigo-800">{order.customerPhone}</a></div>
                {order.customerEmail && <div className="text-gray-600">{order.customerEmail}</div>}
                <div className="text-gray-400 text-xs mt-2">
                  Заказов всего: {customerStats.orderCount} · На сумму: {customerStats.totalSpent.toLocaleString("ru-RU")} ₽
                </div>
              </div>
            )}
          </div>

          {/* Доставка + Оплата */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Доставка</h3>
              {!editingDelivery && (
                <button onClick={() => { setEditDelivery({ method: order.deliveryMethod, city: order.deliveryCity, address: order.deliveryAddress }); setEditingDelivery(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">
                  Редактировать
                </button>
              )}
            </div>
            {editingDelivery ? (
              <div className="space-y-3">
                <select value={editDelivery.method} onChange={(e) => setEditDelivery({ ...editDelivery, method: e.target.value })} className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full">
                  <option value="pickup">Самовывоз</option>
                  <option value="courier">Курьер</option>
                </select>
                <input value={editDelivery.city} onChange={(e) => setEditDelivery({ ...editDelivery, city: e.target.value })} placeholder="Город" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
                <input value={editDelivery.address} onChange={(e) => setEditDelivery({ ...editDelivery, address: e.target.value })} placeholder="Адрес" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full" />
                <div className="flex gap-2">
                  <button onClick={saveDelivery} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Сохранить</button>
                  <button onClick={() => setEditingDelivery(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
                </div>
              </div>
            ) : (
              <div className="space-y-1 text-sm text-gray-700">
                <div className="font-medium">
                  {order.deliveryMethod === "pickup" ? "Самовывоз" : "СДЭК · до пункта выдачи"}
                </div>
                {order.deliveryCity && (
                  <div>г. {order.deliveryCity}{order.deliveryAddress ? `, ${order.deliveryAddress}` : ""}</div>
                )}
                {order.cdekPickupPoint?.address && (
                  <div>{[order.cdekPickupPoint.name, order.cdekPickupPoint.address].filter(Boolean).join(", ")}</div>
                )}
                {order.deliveryCost > 0 && (
                  <div>
                    Стоимость: {order.deliveryCost.toLocaleString("ru-RU")} ₽
                    {order.deliveryQuote?.periodMin != null && order.deliveryQuote?.periodMax != null && (
                      <> · Срок: {order.deliveryQuote.periodMin}-{order.deliveryQuote.periodMax} дня</>
                    )}
                  </div>
                )}
                <div>Оплата: {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}</div>
              </div>
            )}
          </div>
        </div>

        {/* === ПРАВАЯ КОЛОНКА === */}
        <div className="space-y-6">
          {/* Товары */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">Товары</h3>
              {!editingItems && (
                <button onClick={() => { setEditItems([...order.items]); setEditingItems(true); }} className="text-sm text-indigo-600 hover:text-indigo-800">
                  Редактировать
                </button>
              )}
            </div>
            {editingItems ? (
              <div className="space-y-3">
                {editItems.map((item, i) => (
                  <div key={i} className="flex items-center gap-2 text-sm">
                    <input value={item.name} onChange={(e) => { const arr = [...editItems]; arr[i] = { ...arr[i], name: e.target.value }; setEditItems(arr); }} className="border border-gray-200 rounded px-2 py-1 flex-1 text-sm" />
                    <input type="number" value={item.quantity} min={1} onChange={(e) => { const arr = [...editItems]; const qty = Number(e.target.value) || 1; arr[i] = { ...arr[i], quantity: qty, sum: qty * arr[i].price }; setEditItems(arr); }} className="border border-gray-200 rounded px-2 py-1 w-16 text-sm text-center" />
                    <span className="text-gray-500 whitespace-nowrap">{item.price.toLocaleString("ru-RU")} ₽</span>
                    <button onClick={() => setEditItems(editItems.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-1">✕</button>
                  </div>
                ))}
                <div className="flex gap-2 pt-2">
                  <button onClick={saveItems} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Сохранить</button>
                  <button onClick={() => setEditingItems(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {order.items.map((item, i) => (
                  <div key={i} className="flex items-start justify-between">
                    <div>
                      <div className="text-sm font-medium text-gray-900">{item.name}</div>
                    </div>
                    <div className="text-right flex-shrink-0 ml-4">
                      <div className="text-sm font-medium">×{item.quantity}</div>
                      <div className="text-xs text-gray-500">{item.price.toLocaleString("ru-RU")} ₽</div>
                    </div>
                  </div>
                ))}
                <div className="border-t border-gray-100 pt-3 text-right">
                  <div className="font-semibold text-gray-900">
                    Итого {Number(order.total).toLocaleString("ru-RU")} ₽
                  </div>
                  {order.deliveryCost > 0 && (
                    <div className="text-xs text-gray-500">вкл. доставку {order.deliveryCost.toLocaleString("ru-RU")} ₽</div>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* История — timeline */}
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-4">История</h3>
            <div className="space-y-0">
              {STATUS_PROGRESSION.map((s, i) => {
                const isPassed = !isCancelled && i <= currentStepIndex;
                const isCurrent = !isCancelled && i === currentStepIndex;
                const historyEntry = historyByStatus[s];

                return (
                  <div key={s} className="flex gap-3">
                    {/* Линия + точка */}
                    <div className="flex flex-col items-center">
                      <div className={`w-2.5 h-2.5 rounded-full mt-1 ${isPassed ? "bg-amber-400" : "bg-gray-300"}`} />
                      {i < STATUS_PROGRESSION.length - 1 && (
                        <div className={`w-0.5 flex-1 min-h-[32px] ${isPassed && i < currentStepIndex ? "bg-amber-300" : "bg-gray-200"}`} />
                      )}
                    </div>
                    {/* Текст */}
                    <div className="pb-4">
                      <div className={`text-sm ${isCurrent ? "font-semibold text-gray-900" : isPassed ? "font-medium text-gray-700" : "text-gray-400"}`}>
                        {STATUS_LABELS[s]}
                      </div>
                      {historyEntry && isPassed && (
                        <div className="text-xs text-gray-500 mt-0.5">
                          {new Date(historyEntry.createdAt).toLocaleDateString("ru-RU")}, {new Date(historyEntry.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                          {historyEntry.comment && <> · {historyEntry.comment}</>}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
              {/* Отменён — отдельно если активен */}
              {isCancelled && (
                <div className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full mt-1 bg-red-400" />
                  </div>
                  <div>
                    <div className="text-sm font-semibold text-red-700">Отменён</div>
                    {historyByStatus.cancelled && (
                      <div className="text-xs text-gray-500 mt-0.5">
                        {new Date(historyByStatus.cancelled.createdAt).toLocaleDateString("ru-RU")}, {new Date(historyByStatus.cancelled.createdAt).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}
                        {historyByStatus.cancelled.comment && <> · {historyByStatus.cancelled.comment}</>}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
