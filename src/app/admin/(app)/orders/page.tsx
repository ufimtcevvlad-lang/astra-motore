"use client";

import { useEffect, useState, useCallback } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";
import OrderFilters, {
  OrderFiltersState,
  defaultOrderFilters,
} from "@/app/admin/components/OrderFilters";
import OrderList from "@/app/admin/components/OrderList";

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

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFiltersState>(defaultOrderFilters);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [statusCounts, setStatusCounts] = useState<Record<string, number>>({
    all: 0, new: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0,
  });
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.paymentMethod) params.set("paymentMethod", filters.paymentMethod);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotalPages(data.totalPages ?? 1);
      if (data.statusCounts) setStatusCounts(data.statusCounts);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleFilterChange(newFilters: OrderFiltersState) {
    setFilters(newFilters);
    setPage(1);
  }

  return (
    <>
      <AdminHeader title="Заказы" />

      <div className="p-6">
        <OrderFilters
          filters={filters}
          statusCounts={statusCounts}
          onChange={handleFilterChange}
        />

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : (
          <OrderList
            orders={orders}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </>
  );
}
