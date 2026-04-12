# Phase 3: Orders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add order management to the admin panel — migrate order storage to SQLite and build list/detail/edit UI.

**Architecture:** Modify existing `send-order` route to write to SQLite instead of NDJSON. Add 5 new admin API routes following the products CRUD pattern (`requireAdmin()`, Drizzle ORM queries, JSON responses). Build 2 admin pages (list + detail) with reusable components following the ProductFilters/ProductList pattern.

**Tech Stack:** Next.js Route Handlers, Drizzle ORM + better-sqlite3, React client components, Tailwind CSS

**Spec:** `docs/superpowers/specs/2026-04-12-admin-phase3-orders.md`

---

### Task 1: Migrate send-order to SQLite

**Files:**
- Modify: `src/app/api/send-order/route.ts`

- [ ] **Step 1: Replace NDJSON persistence with SQLite insert**

In `src/app/api/send-order/route.ts`, add db import and replace the `persistOrder` function and its call:

Replace imports at top — add:
```typescript
import { db, schema } from "@/app/lib/db";
```

Remove these imports (no longer needed):
```typescript
import { promises as fs } from "node:fs";
import path from "node:path";
```

Delete the entire `persistOrder` function (lines 57-62):
```typescript
// DELETE THIS:
async function persistOrder(order: PersistedOrder) {
  const dir = path.join(process.cwd(), "data");
  const file = path.join(dir, "orders.ndjson");
  await fs.mkdir(dir, { recursive: true });
  await fs.appendFile(file, JSON.stringify(order) + "\n", "utf8");
}
```

Replace the persist block (the try/catch that calls `persistOrder(...)`) with:
```typescript
  // Генерируем номер заказа: AM-YYYYMMDD-NNN
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
  const todayStart = now.toISOString().slice(0, 10) + "T00:00:00";
  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(gte(schema.orders.createdAt, todayStart))
    .all();
  const seq = String(Number(countResult.count) + 1).padStart(3, "0");
  const orderNumber = `AM-${dateStr}-${seq}`;

  const nowIso = now.toISOString();

  try {
    db.insert(schema.orders).values({
      orderNumber,
      customerName: name.trim(),
      customerPhone: phone.trim(),
      customerEmail: "",
      items: JSON.stringify(items),
      total,
      deliveryMethod: deliveryMethod ?? "pickup",
      deliveryCity: deliveryCity?.trim() ?? "",
      deliveryAddress: "",
      deliveryCost: typeof deliveryQuote?.deliverySum === "number" ? Math.round(deliveryQuote.deliverySum) : 0,
      deliveryQuote: deliveryQuote ? JSON.stringify(deliveryQuote) : null,
      cdekPickupPoint: cdekPickupPoint ? JSON.stringify(cdekPickupPoint) : null,
      paymentMethod: paymentMethod ?? "cash",
      status: "new",
      isUrgent: false,
      comment: comment?.trim() ?? "",
      userAgent: request.headers.get("user-agent") ?? undefined,
      ip,
      createdAt: nowIso,
      updatedAt: nowIso,
    }).run();
  } catch {
    // Не блокируем оформление, если запись в БД не удалась
  }
```

Add the missing Drizzle import at the top with the other drizzle imports:
```typescript
import { sql, gte } from "drizzle-orm";
```

Also remove the `PersistedOrder` type definition (lines 44-48) — it's no longer needed.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/send-order/route.ts
git commit -m "feat(admin): migrate send-order from NDJSON to SQLite"
```

---

### Task 2: Orders list API

**Files:**
- Create: `src/app/api/admin/orders/route.ts`

- [ ] **Step 1: Create the orders list API route**

Create `src/app/api/admin/orders/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, like, and, gte, lte, sql, desc, asc, or } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const search = url.searchParams.get("search")?.trim() || null;
  const status = url.searchParams.get("status") || null;
  const deliveryMethod = url.searchParams.get("deliveryMethod") || null;
  const dateFrom = url.searchParams.get("dateFrom") || null;
  const dateTo = url.searchParams.get("dateTo") || null;
  const sortBy = url.searchParams.get("sortBy") || "createdAt";
  const sortOrder = url.searchParams.get("sortOrder") || "desc";

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.orders.orderNumber, `%${search}%`),
        like(schema.orders.customerName, `%${search}%`)
      )
    );
  }
  if (status) {
    conditions.push(eq(schema.orders.status, status));
  }
  if (deliveryMethod) {
    conditions.push(eq(schema.orders.deliveryMethod, deliveryMethod));
  }
  if (dateFrom) {
    conditions.push(gte(schema.orders.createdAt, dateFrom + "T00:00:00"));
  }
  if (dateTo) {
    conditions.push(lte(schema.orders.createdAt, dateTo + "T23:59:59"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(where)
    .all();

  const total = Number(countResult.count);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;

  const sortColumn = sortBy === "total" ? schema.orders.total
    : sortBy === "status" ? schema.orders.status
    : schema.orders.createdAt;
  const orderFn = sortOrder === "asc" ? asc : desc;

  const orders = db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      customerName: schema.orders.customerName,
      customerPhone: schema.orders.customerPhone,
      total: schema.orders.total,
      deliveryMethod: schema.orders.deliveryMethod,
      status: schema.orders.status,
      isUrgent: schema.orders.isUrgent,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(where)
    .orderBy(orderFn(sortColumn))
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  return NextResponse.json({ orders, total, page, totalPages });
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/orders/route.ts
git commit -m "feat(admin): orders list API with filters and pagination"
```

---

### Task 3: Order detail, update, status, and urgent API routes

**Files:**
- Create: `src/app/api/admin/orders/[id]/route.ts`
- Create: `src/app/api/admin/orders/[id]/status/route.ts`
- Create: `src/app/api/admin/orders/[id]/urgent/route.ts`

- [ ] **Step 1: Create the order detail + update route**

Create `src/app/api/admin/orders/[id]/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq, desc } from "drizzle-orm";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);

  const [order] = db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const statusHistory = db
    .select({
      id: schema.orderStatusHistory.id,
      status: schema.orderStatusHistory.status,
      comment: schema.orderStatusHistory.comment,
      adminId: schema.orderStatusHistory.adminId,
      adminName: schema.admins.name,
      createdAt: schema.orderStatusHistory.createdAt,
    })
    .from(schema.orderStatusHistory)
    .leftJoin(schema.admins, eq(schema.orderStatusHistory.adminId, schema.admins.id))
    .where(eq(schema.orderStatusHistory.orderId, orderId))
    .orderBy(desc(schema.orderStatusHistory.createdAt))
    .all();

  // Parse JSON fields
  let items = [];
  try { items = JSON.parse(order.items); } catch { /* empty */ }
  let deliveryQuote = null;
  try { if (order.deliveryQuote) deliveryQuote = JSON.parse(order.deliveryQuote); } catch { /* empty */ }
  let cdekPickupPoint = null;
  try { if (order.cdekPickupPoint) cdekPickupPoint = JSON.parse(order.cdekPickupPoint); } catch { /* empty */ }

  return NextResponse.json({
    order: { ...order, items, deliveryQuote, cdekPickupPoint },
    statusHistory,
  });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);
  const body = await req.json();

  const [existing] = db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!existing) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const updates: Record<string, unknown> = {
    updatedAt: new Date().toISOString(),
  };

  if (body.customerName !== undefined) updates.customerName = body.customerName.trim();
  if (body.customerPhone !== undefined) updates.customerPhone = body.customerPhone.trim();
  if (body.customerEmail !== undefined) updates.customerEmail = body.customerEmail.trim();
  if (body.items !== undefined) {
    updates.items = JSON.stringify(body.items);
    // Recalculate total
    const newTotal = body.items.reduce((acc: number, it: { sum: number }) => acc + it.sum, 0);
    updates.total = newTotal;
  }
  if (body.deliveryMethod !== undefined) updates.deliveryMethod = body.deliveryMethod;
  if (body.deliveryCity !== undefined) updates.deliveryCity = body.deliveryCity;
  if (body.deliveryAddress !== undefined) updates.deliveryAddress = body.deliveryAddress;
  if (body.deliveryCost !== undefined) updates.deliveryCost = body.deliveryCost;
  if (body.cdekPickupPoint !== undefined) {
    updates.cdekPickupPoint = body.cdekPickupPoint ? JSON.stringify(body.cdekPickupPoint) : null;
  }
  if (body.paymentMethod !== undefined) updates.paymentMethod = body.paymentMethod;
  if (body.comment !== undefined) updates.comment = body.comment;

  db.update(schema.orders)
    .set(updates)
    .where(eq(schema.orders.id, orderId))
    .run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 2: Create the status change route**

Create `src/app/api/admin/orders/[id]/status/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

const VALID_STATUSES = ["new", "processing", "shipped", "delivered", "cancelled"];

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);
  const body = await req.json();

  if (!body.status || !VALID_STATUSES.includes(body.status)) {
    return NextResponse.json({ error: "Некорректный статус" }, { status: 400 });
  }

  const [order] = db
    .select()
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  const now = new Date().toISOString();

  db.update(schema.orders)
    .set({ status: body.status, updatedAt: now })
    .where(eq(schema.orders.id, orderId))
    .run();

  db.insert(schema.orderStatusHistory).values({
    orderId,
    status: body.status,
    comment: body.comment?.trim() ?? "",
    adminId: auth.admin.id,
    createdAt: now,
  }).run();

  return NextResponse.json({ ok: true });
}
```

- [ ] **Step 3: Create the urgent toggle route**

Create `src/app/api/admin/orders/[id]/urgent/route.ts`:
```typescript
import { NextRequest, NextResponse } from "next/server";
import { requireAdmin } from "@/app/lib/admin-middleware";
import { db, schema } from "@/app/lib/db";
import { eq } from "drizzle-orm";

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const { id } = await params;
  const orderId = Number(id);

  const [order] = db
    .select({ isUrgent: schema.orders.isUrgent })
    .from(schema.orders)
    .where(eq(schema.orders.id, orderId))
    .all();

  if (!order) {
    return NextResponse.json({ error: "Заказ не найден" }, { status: 404 });
  }

  db.update(schema.orders)
    .set({ isUrgent: !order.isUrgent, updatedAt: new Date().toISOString() })
    .where(eq(schema.orders.id, orderId))
    .run();

  return NextResponse.json({ ok: true, isUrgent: !order.isUrgent });
}
```

- [ ] **Step 4: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 5: Commit**

```bash
git add src/app/api/admin/orders/
git commit -m "feat(admin): order detail, update, status change, and urgent toggle APIs"
```

---

### Task 4: OrderFilters component

**Files:**
- Create: `src/app/admin/components/OrderFilters.tsx`

- [ ] **Step 1: Create the OrderFilters component**

Create `src/app/admin/components/OrderFilters.tsx`:
```tsx
"use client";

import { useRef, useState } from "react";

export interface OrderFiltersState {
  search: string;
  status: string;
  deliveryMethod: string;
  dateFrom: string;
  dateTo: string;
}

interface OrderFiltersProps {
  filters: OrderFiltersState;
  onChange: (filters: OrderFiltersState) => void;
}

export const defaultOrderFilters: OrderFiltersState = {
  search: "",
  status: "",
  deliveryMethod: "",
  dateFrom: "",
  dateTo: "",
};

export default function OrderFilters({ filters, onChange }: OrderFiltersProps) {
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
    <div className="bg-white rounded-xl shadow-sm p-4 mb-4 space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        {/* Search */}
        <input
          type="text"
          placeholder="Поиск по номеру или имени..."
          value={localSearch}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        />

        {/* Status */}
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

        {/* Delivery method */}
        <select
          value={filters.deliveryMethod}
          onChange={(e) => handleChange("deliveryMethod", e.target.value)}
          className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">Все способы доставки</option>
          <option value="pickup">Самовывоз</option>
          <option value="courier">Курьер</option>
        </select>

        {/* Placeholder for alignment */}
        <div />

        {/* Date range */}
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">От:</label>
          <input
            type="date"
            value={filters.dateFrom}
            onChange={(e) => handleChange("dateFrom", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
          />
        </div>
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-500 whitespace-nowrap">До:</label>
          <input
            type="date"
            value={filters.dateTo}
            onChange={(e) => handleChange("dateTo", e.target.value)}
            className="border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 flex-1"
          />
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/components/OrderFilters.tsx
git commit -m "feat(admin): OrderFilters component with search, status, delivery, and date range"
```

---

### Task 5: OrderList component

**Files:**
- Create: `src/app/admin/components/OrderList.tsx`

- [ ] **Step 1: Create the OrderList component**

Create `src/app/admin/components/OrderList.tsx`:
```tsx
"use client";

import Link from "next/link";
import Pagination from "./Pagination";

interface OrderListItem {
  id: number;
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  total: number;
  deliveryMethod: string;
  status: string;
  isUrgent: boolean;
  createdAt: string;
}

interface OrderListProps {
  orders: OrderListItem[];
  page: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  sortBy: string;
  sortOrder: string;
  onSortChange: (column: string) => void;
}

const STATUS_LABELS: Record<string, string> = {
  new: "Новый",
  processing: "В обработке",
  shipped: "Отправлен",
  delivered: "Доставлен",
  cancelled: "Отменён",
};

const STATUS_COLORS: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Самовывоз",
  courier: "Курьер",
};

function SortHeader({
  label,
  column,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  column: string;
  sortBy: string;
  sortOrder: string;
  onSort: (col: string) => void;
}) {
  const active = sortBy === column;
  return (
    <button
      onClick={() => onSort(column)}
      className="flex items-center gap-1 text-xs font-medium text-gray-500 uppercase hover:text-gray-700"
    >
      {label}
      {active && (
        <span className="text-indigo-600">{sortOrder === "asc" ? "↑" : "↓"}</span>
      )}
    </button>
  );
}

export default function OrderList({
  orders,
  page,
  totalPages,
  onPageChange,
  sortBy,
  sortOrder,
  onSortChange,
}: OrderListProps) {
  if (orders.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500 bg-white rounded-xl shadow-sm">
        Заказы не найдены
      </div>
    );
  }

  return (
    <div>
      <div className="bg-white rounded-xl shadow-sm overflow-hidden">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-4 py-3">
                <SortHeader label="Номер" column="orderNumber" sortBy={sortBy} sortOrder={sortOrder} onSort={onSortChange} />
              </th>
              <th className="text-left px-4 py-3 hidden sm:table-cell">
                <span className="text-xs font-medium text-gray-500 uppercase">Клиент</span>
              </th>
              <th className="text-right px-4 py-3">
                <SortHeader label="Сумма" column="total" sortBy={sortBy} sortOrder={sortOrder} onSort={onSortChange} />
              </th>
              <th className="text-left px-4 py-3 hidden md:table-cell">
                <span className="text-xs font-medium text-gray-500 uppercase">Доставка</span>
              </th>
              <th className="text-left px-4 py-3">
                <SortHeader label="Статус" column="status" sortBy={sortBy} sortOrder={sortOrder} onSort={onSortChange} />
              </th>
              <th className="text-right px-4 py-3 hidden lg:table-cell">
                <SortHeader label="Дата" column="createdAt" sortBy={sortBy} sortOrder={sortOrder} onSort={onSortChange} />
              </th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr
                key={order.id}
                className="border-b border-gray-50 hover:bg-gray-50 transition cursor-pointer"
              >
                <td className="px-4 py-3">
                  <Link href={`/admin/orders/${order.id}`} className="font-medium text-indigo-600 hover:text-indigo-800">
                    {order.orderNumber}
                  </Link>
                  {order.isUrgent && (
                    <span className="ml-2 text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">
                      Срочный
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 hidden sm:table-cell">
                  <div className="text-sm text-gray-900">{order.customerName}</div>
                  <div className="text-xs text-gray-500">{order.customerPhone}</div>
                </td>
                <td className="px-4 py-3 text-right font-semibold text-gray-900">
                  {Number(order.total).toLocaleString("ru-RU")} &#8381;
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">
                  {DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
                  </span>
                </td>
                <td className="px-4 py-3 text-right text-sm text-gray-500 hidden lg:table-cell">
                  {new Date(order.createdAt).toLocaleDateString("ru-RU")}
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
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/components/OrderList.tsx
git commit -m "feat(admin): OrderList component with sortable columns and status badges"
```

---

### Task 6: Orders list page

**Files:**
- Create: `src/app/admin/(app)/orders/page.tsx`

- [ ] **Step 1: Create the orders list page**

Create `src/app/admin/(app)/orders/page.tsx`:
```tsx
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
  total: number;
  deliveryMethod: string;
  status: string;
  isUrgent: boolean;
  createdAt: string;
}

export default function OrdersPage() {
  const [filters, setFilters] = useState<OrderFiltersState>(defaultOrderFilters);
  const [orders, setOrders] = useState<OrderListItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [sortBy, setSortBy] = useState("createdAt");
  const [sortOrder, setSortOrder] = useState("desc");
  const [loading, setLoading] = useState(true);

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    params.set("sortBy", sortBy);
    params.set("sortOrder", sortOrder);
    if (filters.search) params.set("search", filters.search);
    if (filters.status) params.set("status", filters.status);
    if (filters.deliveryMethod) params.set("deliveryMethod", filters.deliveryMethod);
    if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) params.set("dateTo", filters.dateTo);

    try {
      const res = await fetch(`/api/admin/orders?${params}`);
      const data = await res.json();
      setOrders(data.orders ?? []);
      setTotalPages(data.totalPages ?? 1);
    } catch {
      setOrders([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters, sortBy, sortOrder]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  function handleFilterChange(newFilters: OrderFiltersState) {
    setFilters(newFilters);
    setPage(1);
  }

  function handleSortChange(column: string) {
    if (sortBy === column) {
      setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortBy(column);
      setSortOrder("desc");
    }
    setPage(1);
  }

  return (
    <>
      <AdminHeader title="Заказы" />

      <div className="p-6">
        <OrderFilters filters={filters} onChange={handleFilterChange} />

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : (
          <OrderList
            orders={orders}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
            sortBy={sortBy}
            sortOrder={sortOrder}
            onSortChange={handleSortChange}
          />
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(app\)/orders/page.tsx
git commit -m "feat(admin): orders list page with filters, sorting, and pagination"
```

---

### Task 7: Order detail page

**Files:**
- Create: `src/app/admin/(app)/orders/[id]/page.tsx`

- [ ] **Step 1: Create the order detail page**

Create `src/app/admin/(app)/orders/[id]/page.tsx`:
```tsx
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
  deliveryQuote: { tariffName?: string; deliverySum?: number } | null;
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

const STATUS_COLORS: Record<string, string> = {
  new: "bg-amber-100 text-amber-800",
  processing: "bg-indigo-100 text-indigo-800",
  shipped: "bg-blue-100 text-blue-800",
  delivered: "bg-green-100 text-green-800",
  cancelled: "bg-red-100 text-red-800",
};

const PAYMENT_LABELS: Record<string, string> = {
  sbp: "СБП",
  card: "Карта",
  cash: "При получении",
};

const DELIVERY_LABELS: Record<string, string> = {
  pickup: "Самовывоз",
  courier: "Курьер (СДЭК)",
};

export default function OrderDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [statusHistory, setStatusHistory] = useState<StatusHistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Status change form
  const [newStatus, setNewStatus] = useState("");
  const [statusComment, setStatusComment] = useState("");

  // Editing states
  const [editingItems, setEditingItems] = useState(false);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [editingDelivery, setEditingDelivery] = useState(false);
  const [editDelivery, setEditDelivery] = useState({ method: "", city: "", address: "" });
  const [editingClient, setEditingClient] = useState(false);
  const [editClient, setEditClient] = useState({ name: "", phone: "", email: "" });

  const fetchOrder = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/orders/${id}`);
      if (!res.ok) { router.push("/admin/orders"); return; }
      const data = await res.json();
      setOrder(data.order);
      setStatusHistory(data.statusHistory ?? []);
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
        body: JSON.stringify({
          customerName: editClient.name,
          customerPhone: editClient.phone,
          customerEmail: editClient.email,
        }),
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
        body: JSON.stringify({
          deliveryMethod: editDelivery.method,
          deliveryCity: editDelivery.city,
          deliveryAddress: editDelivery.address,
        }),
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

  return (
    <>
      <AdminHeader title={`Заказ ${order.orderNumber}`} />

      <div className="p-6 space-y-6 max-w-4xl">
        {/* Header: status + urgent */}
        <div className="bg-white rounded-xl shadow-sm p-5 flex flex-wrap items-center gap-4">
          <span className={`text-sm font-medium px-3 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100"}`}>
            {STATUS_LABELS[order.status] ?? order.status}
          </span>
          <span className="text-sm text-gray-500">
            {new Date(order.createdAt).toLocaleString("ru-RU")}
          </span>
          <button
            onClick={handleUrgentToggle}
            disabled={saving}
            className={`ml-auto text-sm px-3 py-1 rounded-lg border transition ${
              order.isUrgent
                ? "bg-red-50 border-red-300 text-red-700 hover:bg-red-100"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {order.isUrgent ? "Снять срочность" : "Пометить срочным"}
          </button>
        </div>

        {/* Client */}
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
              <input value={editClient.name} onChange={(e) => setEditClient({ ...editClient, name: e.target.value })} placeholder="Имя" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={editClient.phone} onChange={(e) => setEditClient({ ...editClient, phone: e.target.value })} placeholder="Телефон" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <input value={editClient.email} onChange={(e) => setEditClient({ ...editClient, email: e.target.value })} placeholder="Email" className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500" />
              <div className="flex gap-2">
                <button onClick={saveClient} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Сохранить</button>
                <button onClick={() => setEditingClient(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
              </div>
            </div>
          ) : (
            <div className="space-y-1 text-sm text-gray-700">
              <div><span className="text-gray-500">Имя:</span> {order.customerName}</div>
              <div><span className="text-gray-500">Телефон:</span> {order.customerPhone}</div>
              {order.customerEmail && <div><span className="text-gray-500">Email:</span> {order.customerEmail}</div>}
            </div>
          )}
        </div>

        {/* Items */}
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
                  <span className="text-gray-500">x {item.price.toLocaleString("ru-RU")} &#8381;</span>
                  <span className="font-medium w-24 text-right">{item.sum.toLocaleString("ru-RU")} &#8381;</span>
                  <button onClick={() => setEditItems(editItems.filter((_, j) => j !== i))} className="text-red-500 hover:text-red-700 p-1" title="Удалить">✕</button>
                </div>
              ))}
              <div className="text-right font-semibold text-gray-900">
                Итого: {editItems.reduce((a, b) => a + b.sum, 0).toLocaleString("ru-RU")} &#8381;
              </div>
              <div className="flex gap-2">
                <button onClick={saveItems} disabled={saving} className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm hover:bg-indigo-700 disabled:opacity-50">Сохранить</button>
                <button onClick={() => setEditingItems(false)} className="border border-gray-300 px-4 py-2 rounded-lg text-sm hover:bg-gray-50">Отмена</button>
              </div>
            </div>
          ) : (
            <>
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500 border-b border-gray-100">
                    <th className="pb-2">Название</th>
                    <th className="pb-2 text-center">Кол-во</th>
                    <th className="pb-2 text-right">Цена</th>
                    <th className="pb-2 text-right">Сумма</th>
                  </tr>
                </thead>
                <tbody>
                  {order.items.map((item, i) => (
                    <tr key={i} className="border-b border-gray-50">
                      <td className="py-2">{item.name}</td>
                      <td className="py-2 text-center">{item.quantity}</td>
                      <td className="py-2 text-right">{item.price.toLocaleString("ru-RU")} &#8381;</td>
                      <td className="py-2 text-right font-medium">{item.sum.toLocaleString("ru-RU")} &#8381;</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="text-right font-semibold text-gray-900 mt-3">
                Итого: {Number(order.total).toLocaleString("ru-RU")} &#8381;
              </div>
            </>
          )}
        </div>

        {/* Delivery */}
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
              <div><span className="text-gray-500">Способ:</span> {DELIVERY_LABELS[order.deliveryMethod] ?? order.deliveryMethod}</div>
              {order.deliveryCity && <div><span className="text-gray-500">Город:</span> {order.deliveryCity}</div>}
              {order.deliveryAddress && <div><span className="text-gray-500">Адрес:</span> {order.deliveryAddress}</div>}
              {order.cdekPickupPoint && (
                <div><span className="text-gray-500">ПВЗ:</span> {[order.cdekPickupPoint.name, order.cdekPickupPoint.address].filter(Boolean).join(", ")}</div>
              )}
              {order.deliveryCost > 0 && <div><span className="text-gray-500">Стоимость:</span> {order.deliveryCost.toLocaleString("ru-RU")} &#8381;</div>}
            </div>
          )}
        </div>

        {/* Payment */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Оплата</h3>
          <div className="text-sm text-gray-700">
            {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
          </div>
        </div>

        {/* Comment */}
        {order.comment && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">Комментарий клиента</h3>
            <div className="text-sm text-gray-700 whitespace-pre-wrap">{order.comment}</div>
          </div>
        )}

        {/* Status change */}
        <div className="bg-white rounded-xl shadow-sm p-5">
          <h3 className="font-semibold text-gray-900 mb-3">Смена статуса</h3>
          <div className="space-y-3">
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="new">Новый</option>
              <option value="processing">В обработке</option>
              <option value="shipped">Отправлен</option>
              <option value="delivered">Доставлен</option>
              <option value="cancelled">Отменён</option>
            </select>
            <textarea
              value={statusComment}
              onChange={(e) => setStatusComment(e.target.value)}
              placeholder="Комментарий (необязательно)"
              rows={2}
              className="border border-gray-200 rounded-lg px-3 py-2 text-sm w-full focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <button
              onClick={handleStatusChange}
              disabled={saving || newStatus === order.status}
              className="bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50"
            >
              Сменить статус
            </button>
          </div>
        </div>

        {/* Status history */}
        {statusHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h3 className="font-semibold text-gray-900 mb-3">История изменений</h3>
            <div className="space-y-3">
              {statusHistory.map((entry) => (
                <div key={entry.id} className="flex items-start gap-3 text-sm border-b border-gray-50 pb-3 last:border-0">
                  <div className="text-gray-400 text-xs whitespace-nowrap mt-0.5">
                    {new Date(entry.createdAt).toLocaleString("ru-RU")}
                  </div>
                  <div>
                    <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status] ?? "bg-gray-100"}`}>
                      {STATUS_LABELS[entry.status] ?? entry.status}
                    </span>
                    {entry.comment && <div className="text-gray-600 mt-1">{entry.comment}</div>}
                    {entry.adminName && <div className="text-gray-400 text-xs mt-0.5">{entry.adminName}</div>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/\(app\)/orders/
git commit -m "feat(admin): order detail page with editing, status change, and history"
```

---

### Task 8: Fix dashboard to read orders from SQLite

**Files:**
- Modify: `src/app/api/admin/dashboard/route.ts`

- [ ] **Step 1: Verify dashboard reads from orders table**

Read `src/app/api/admin/dashboard/route.ts` and verify it queries the `orders` table via Drizzle ORM. The dashboard already queries SQLite (observation #112 confirmed this). Since we now write orders to SQLite (Task 1), the dashboard should start working automatically. Verify the query is correct and no changes are needed.

If the dashboard queries are already using `schema.orders` — no changes needed, just confirm.

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Build verification**

Run: `npx next build`
Expected: Build succeeds

- [ ] **Step 4: Commit (if changes were made)**

```bash
git add src/app/api/admin/dashboard/route.ts
git commit -m "fix(admin): dashboard orders query aligned with SQLite storage"
```
