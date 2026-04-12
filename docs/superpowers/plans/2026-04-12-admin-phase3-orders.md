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
import { eq, like, and, gte, lte, sql, desc, or } from "drizzle-orm";

const PAGE_SIZE = 20;

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.authorized) return auth.response;

  const url = req.nextUrl;
  const page = Math.max(1, Number(url.searchParams.get("page") ?? 1));
  const search = url.searchParams.get("search")?.trim() || null;
  const status = url.searchParams.get("status") || null;
  const paymentMethod = url.searchParams.get("paymentMethod") || null;
  const dateFrom = url.searchParams.get("dateFrom") || null;
  const dateTo = url.searchParams.get("dateTo") || null;

  const conditions = [];

  if (search) {
    conditions.push(
      or(
        like(schema.orders.orderNumber, `%${search}%`),
        like(schema.orders.customerName, `%${search}%`),
        like(schema.orders.customerPhone, `%${search}%`)
      )
    );
  }
  if (status) {
    conditions.push(eq(schema.orders.status, status));
  }
  if (paymentMethod) {
    conditions.push(eq(schema.orders.paymentMethod, paymentMethod));
  }
  if (dateFrom) {
    conditions.push(gte(schema.orders.createdAt, dateFrom + "T00:00:00"));
  }
  if (dateTo) {
    conditions.push(lte(schema.orders.createdAt, dateTo + "T23:59:59"));
  }

  const where = conditions.length > 0 ? and(...conditions) : undefined;

  // Count for current filter
  const [countResult] = db
    .select({ count: sql<number>`count(*)` })
    .from(schema.orders)
    .where(where)
    .all();

  const total = Number(countResult.count);
  const totalPages = Math.ceil(total / PAGE_SIZE);
  const offset = (page - 1) * PAGE_SIZE;

  // Status counts for tabs (always unfiltered by status, but respect other filters)
  const baseConditions = conditions.filter((_, i) => {
    // Remove status condition (index depends on which conditions were added)
    // Rebuild without status filter
    return true;
  });
  const baseWhere = (() => {
    const conds = [];
    if (search) {
      conds.push(
        or(
          like(schema.orders.orderNumber, `%${search}%`),
          like(schema.orders.customerName, `%${search}%`),
          like(schema.orders.customerPhone, `%${search}%`)
        )
      );
    }
    if (paymentMethod) conds.push(eq(schema.orders.paymentMethod, paymentMethod));
    if (dateFrom) conds.push(gte(schema.orders.createdAt, dateFrom + "T00:00:00"));
    if (dateTo) conds.push(lte(schema.orders.createdAt, dateTo + "T23:59:59"));
    return conds.length > 0 ? and(...conds) : undefined;
  })();

  const statusCountsRaw = db
    .select({
      status: schema.orders.status,
      count: sql<number>`count(*)`,
    })
    .from(schema.orders)
    .where(baseWhere)
    .groupBy(schema.orders.status)
    .all();

  const statusCounts: Record<string, number> = { all: 0, new: 0, processing: 0, shipped: 0, delivered: 0, cancelled: 0 };
  for (const row of statusCountsRaw) {
    statusCounts[row.status] = Number(row.count);
    statusCounts.all += Number(row.count);
  }

  const orders = db
    .select({
      id: schema.orders.id,
      orderNumber: schema.orders.orderNumber,
      customerName: schema.orders.customerName,
      customerPhone: schema.orders.customerPhone,
      items: schema.orders.items,
      total: schema.orders.total,
      deliveryMethod: schema.orders.deliveryMethod,
      deliveryCity: schema.orders.deliveryCity,
      paymentMethod: schema.orders.paymentMethod,
      status: schema.orders.status,
      isUrgent: schema.orders.isUrgent,
      createdAt: schema.orders.createdAt,
    })
    .from(schema.orders)
    .where(where)
    .orderBy(desc(schema.orders.createdAt))
    .limit(PAGE_SIZE)
    .offset(offset)
    .all();

  // Parse items for brief display
  const ordersWithItems = orders.map((o) => {
    let itemsSummary = "";
    try {
      const parsed = JSON.parse(o.items);
      itemsSummary = parsed
        .map((it: { name: string; quantity: number }) => {
          const short = it.name.length > 20 ? it.name.slice(0, 20) + "…" : it.name;
          return `${short} ×${it.quantity}`;
        })
        .join(", ");
    } catch { /* empty */ }
    return { ...o, items: undefined, itemsSummary };
  });

  return NextResponse.json({ orders: ordersWithItems, total, page, totalPages, statusCounts });
}
```

- [ ] **Step 2: Verify TypeScript compilation**

Run: `npx tsc --noEmit`
Expected: No errors

- [ ] **Step 3: Commit**

```bash
git add src/app/api/admin/orders/route.ts
git commit -m "feat(admin): orders list API with filters, pagination, and status counts"
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

  // Статистика клиента по телефону
  const [customerStats] = db
    .select({
      orderCount: sql<number>`count(*)`,
      totalSpent: sql<number>`sum(total)`,
    })
    .from(schema.orders)
    .where(eq(schema.orders.customerPhone, order.customerPhone))
    .all();

  // Парсинг JSON-полей
  let items = [];
  try { items = JSON.parse(order.items); } catch { /* empty */ }
  let deliveryQuote = null;
  try { if (order.deliveryQuote) deliveryQuote = JSON.parse(order.deliveryQuote); } catch { /* empty */ }
  let cdekPickupPoint = null;
  try { if (order.cdekPickupPoint) cdekPickupPoint = JSON.parse(order.cdekPickupPoint); } catch { /* empty */ }

  return NextResponse.json({
    order: { ...order, items, deliveryQuote, cdekPickupPoint },
    statusHistory,
    customerStats: {
      orderCount: Number(customerStats.orderCount),
      totalSpent: Number(customerStats.totalSpent ?? 0),
    },
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

### Task 4: Компонент OrderFilters

**Files:**
- Create: `src/app/admin/components/OrderFilters.tsx`

- [ ] **Step 1: Создать компонент OrderFilters**

Create `src/app/admin/components/OrderFilters.tsx`:
```tsx
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
              placeholder="Номер, клиент, телефон."
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
```

- [ ] **Step 2: Проверить компиляцию TypeScript**

Run: `npx tsc --noEmit`
Expected: Нет ошибок

- [ ] **Step 3: Коммит**

```bash
git add src/app/admin/components/OrderFilters.tsx
git commit -m "feat(admin): OrderFilters component with search, payment, dates, and status tabs"
```

---

### Task 5: Компонент OrderList

**Files:**
- Create: `src/app/admin/components/OrderList.tsx`

- [ ] **Step 1: Создать компонент OrderList**

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
  cash: "Наличные",
};

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
                  {Number(order.total).toLocaleString("ru-RU")} &#8381;
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">
                  {formatDelivery(order.deliveryMethod, order.deliveryCity)}
                </td>
                <td className="px-4 py-3 hidden md:table-cell text-sm text-gray-600">
                  {PAYMENT_LABELS[order.paymentMethod] ?? order.paymentMethod}
                </td>
                <td className="px-4 py-3">
                  <span className={`inline-block text-xs font-medium px-2 py-1 rounded-full ${STATUS_COLORS[order.status] ?? "bg-gray-100 text-gray-700"}`}>
                    {STATUS_LABELS[order.status] ?? order.status}
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
```

- [ ] **Step 2: Проверить компиляцию TypeScript**

Run: `npx tsc --noEmit`
Expected: Нет ошибок

- [ ] **Step 3: Коммит**

```bash
git add src/app/admin/components/OrderList.tsx
git commit -m "feat(admin): OrderList component with items summary, delivery, and payment columns"
```

---

### Task 6: Страница списка заказов

**Files:**
- Create: `src/app/admin/(app)/orders/page.tsx`

- [ ] **Step 1: Создать страницу списка заказов**

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
```

- [ ] **Step 2: Проверить компиляцию TypeScript**

Run: `npx tsc --noEmit`
Expected: Нет ошибок

- [ ] **Step 3: Коммит**

```bash
git add src/app/admin/\(app\)/orders/page.tsx
git commit -m "feat(admin): orders list page with filters, status tabs, and pagination"
```

---

### Task 7: Страница деталей заказа

**Files:**
- Create: `src/app/admin/(app)/orders/[id]/page.tsx`

- [ ] **Step 1: Создать страницу деталей заказа**

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
```

- [ ] **Step 2: Проверить компиляцию TypeScript**

Run: `npx tsc --noEmit`
Expected: Нет ошибок

- [ ] **Step 3: Коммит**

```bash
git add src/app/admin/\(app\)/orders/
git commit -m "feat(admin): order detail page with two-column layout, status buttons, and timeline"
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
