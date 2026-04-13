# Price Monitor — Admin Panel Integration Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Integrate competitor price monitoring into the existing Next.js Admin Panel — price scale widget, "Спарсить цену" button, notification bell, and morning dashboard.

**Architecture:** Next.js API route proxies requests to the parser FastAPI service (on separate VPS). Admin product page fetches price summary and renders a visual scale. After each nightly run the parser writes a notifications file; admin panel reads it on load and displays the bell count + dashboard summary.

**Prerequisite:** Parser Service (plan `2026-04-13-price-monitor-parser.md`) must be deployed and accessible at `PARSER_API_URL`.

**Tech Stack:** Next.js 14 (App Router), TypeScript, Tailwind CSS, Server Components + Client Components

---

## File Structure

```
src/app/
├── api/
│   └── price-monitor/
│       └── route.ts              ← прокси к FastAPI (GET /price, POST /parse)
├── admin/
│   ├── components/
│   │   ├── PriceScaleWidget.tsx  ← шкала с цветом + статус + кнопка "Спарсить"
│   │   ├── NotificationBell.tsx  ← колокольчик с числом непрочитанных
│   │   └── PriceDashboard.tsx    ← утренний дашборд (статистика за ночь)
│   ├── notifications/
│   │   └── page.tsx              ← список товаров в красной/жёлтой зоне
│   └── products/[id]/
│       └── page.tsx              ← MODIFY: добавить PriceScaleWidget
└── lib/
    └── price-monitor.ts          ← типы + функция fetchPriceSummary
```

---

## Task 1: Переменные окружения

**Files:**
- Modify: `.env.local` (создать если нет)
- Modify: `.env.example` (если есть)

- [ ] **Step 1: Добавить переменные в .env.local**

```bash
# .env.local
PARSER_API_URL=http://PARSER_VPS_IP:8080
PARSER_API_TOKEN=your-secret-token-here
```

`PARSER_VPS_IP` — IP адрес парсер VPS. Заменить на реальный после деплоя парсера.

- [ ] **Step 2: Коммит (без .env.local — он в .gitignore)**

Убедиться что `.env.local` в `.gitignore`:
```bash
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore
git add .gitignore
git commit -m "chore: add env vars for price monitor"
```

---

## Task 2: Типы и клиент (lib/price-monitor.ts)

**Files:**
- Create: `src/app/lib/price-monitor.ts`

- [ ] **Step 1: Написать lib/price-monitor.ts**

```typescript
// src/app/lib/price-monitor.ts

export interface SitePrice {
  site: string;
  price: number;
  updated_at: string;
}

export interface PriceSummary {
  article: string;
  brand: string;
  avg_price: number;
  min_price: number;
  max_price: number;
  sites_count: number;
  updated_at: string;
  sites: SitePrice[];
}

export type PriceZone = "red" | "green" | "yellow" | "no_data";

export function getPriceZone(yourPrice: number, avgPrice: number): PriceZone {
  const ratio = yourPrice / avgPrice;
  if (ratio > 1.15) return "red";
  if (ratio < 0.85) return "yellow";
  return "green";
}

export function getPriceDeviation(yourPrice: number, avgPrice: number): number {
  return Math.round(((yourPrice - avgPrice) / avgPrice) * 100);
}

export async function fetchPriceSummary(
  article: string,
  brand: string
): Promise<PriceSummary | null> {
  try {
    const res = await fetch(
      `/api/price-monitor?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`,
      { cache: "no-store" }
    );
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return res.json();
  } catch {
    return null;
  }
}

export async function triggerParse(
  article: string,
  brand: string
): Promise<PriceSummary | null> {
  try {
    const res = await fetch(
      `/api/price-monitor?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`,
      { method: "POST", cache: "no-store" }
    );
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
```

- [ ] **Step 2: Коммит**

```bash
git add src/app/lib/price-monitor.ts
git commit -m "feat: price-monitor types and client helpers"
```

---

## Task 3: API Route (прокси к FastAPI)

**Files:**
- Create: `src/app/api/price-monitor/route.ts`

- [ ] **Step 1: Написать route.ts**

```typescript
// src/app/api/price-monitor/route.ts
import { NextRequest, NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL!;
const PARSER_TOKEN = process.env.PARSER_API_TOKEN!;

const headers = () => ({ "X-API-Token": PARSER_TOKEN });

export async function GET(req: NextRequest) {
  const article = req.nextUrl.searchParams.get("article");
  const brand = req.nextUrl.searchParams.get("brand");
  if (!article || !brand) {
    return NextResponse.json({ error: "article and brand required" }, { status: 400 });
  }
  const res = await fetch(
    `${PARSER_URL}/price?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`,
    { headers: headers(), cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}

export async function POST(req: NextRequest) {
  const article = req.nextUrl.searchParams.get("article");
  const brand = req.nextUrl.searchParams.get("brand");
  if (!article || !brand) {
    return NextResponse.json({ error: "article and brand required" }, { status: 400 });
  }
  const res = await fetch(
    `${PARSER_URL}/parse?article=${encodeURIComponent(article)}&brand=${encodeURIComponent(brand)}`,
    { method: "POST", headers: headers(), cache: "no-store" }
  );
  const data = await res.json();
  return NextResponse.json(data, { status: res.status });
}
```

- [ ] **Step 2: Проверить вручную**

Запустить `npm run dev`, затем в браузере или curl:
```bash
curl "http://localhost:3000/api/price-monitor?article=95227052&brand=ACDelco"
```

Ожидаемый результат: JSON от парсера или `{"detail":"No data"}`.

- [ ] **Step 3: Коммит**

```bash
git add src/app/api/price-monitor/
git commit -m "feat: price-monitor API proxy route"
```

---

## Task 4: Компонент PriceScaleWidget

**Files:**
- Create: `src/app/admin/components/PriceScaleWidget.tsx`

- [ ] **Step 1: Написать PriceScaleWidget.tsx**

```tsx
// src/app/admin/components/PriceScaleWidget.tsx
"use client";

import { useState } from "react";
import { PriceSummary, getPriceZone, getPriceDeviation, triggerParse } from "@/app/lib/price-monitor";

interface Props {
  article: string;
  brand: string;
  yourPrice: number;
  initial: PriceSummary | null;
}

const ZONE_STYLES = {
  red:     { bar: "bg-red-500",    badge: "bg-red-100 text-red-800",    icon: "⛔", label: "Выше рынка" },
  yellow:  { bar: "bg-yellow-400", badge: "bg-yellow-100 text-yellow-800", icon: "⚠️", label: "Ниже рынка" },
  green:   { bar: "bg-green-500",  badge: "bg-green-100 text-green-800",  icon: "✅", label: "Рыночная цена" },
  no_data: { bar: "bg-gray-300",   badge: "bg-gray-100 text-gray-600",    icon: "—",  label: "Нет данных" },
};

export function PriceScaleWidget({ article, brand, yourPrice, initial }: Props) {
  const [summary, setSummary] = useState<PriceSummary | null>(initial);
  const [loading, setLoading] = useState(false);

  const zone = summary ? getPriceZone(yourPrice, summary.avg_price) : "no_data";
  const deviation = summary ? getPriceDeviation(yourPrice, summary.avg_price) : 0;
  const style = ZONE_STYLES[zone];

  // Позиция ползунка на шкале (0-100%)
  const barPosition = summary
    ? Math.min(100, Math.max(0, ((yourPrice / summary.avg_price - 0.7) / 0.6) * 100))
    : 50;

  async function handleParse() {
    setLoading(true);
    const result = await triggerParse(article, brand);
    if (result) setSummary(result);
    setLoading(false);
  }

  return (
    <div className="rounded-xl border border-gray-200 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-gray-700">Анализ рынка</span>
        {summary && (
          <span className="text-xs text-gray-400">
            {summary.sites_count} магазин{summary.sites_count === 1 ? "" : "ов"}
          </span>
        )}
      </div>

      {/* Строка цен */}
      <div className="flex items-baseline gap-4">
        <div>
          <div className="text-xs text-gray-500">Ваша цена</div>
          <div className="text-lg font-bold">{yourPrice.toLocaleString("ru-RU")} ₽</div>
        </div>
        {summary && (
          <div>
            <div className="text-xs text-gray-500">Рынок (ср.)</div>
            <div className="text-lg font-semibold text-gray-700">
              {summary.avg_price.toLocaleString("ru-RU")} ₽
            </div>
          </div>
        )}
      </div>

      {/* Шкала */}
      <div className="relative h-2 rounded-full bg-gradient-to-r from-yellow-300 via-green-400 to-red-400">
        <div
          className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full border-2 border-white shadow"
          style={{ left: `${barPosition}%`, backgroundColor: zone === "no_data" ? "#9ca3af" : undefined }}
        />
      </div>
      <div className="flex justify-between text-xs text-gray-400">
        <span>дёшево</span>
        <span>норма</span>
        <span>дорого</span>
      </div>

      {/* Статус */}
      <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${style.badge}`}>
        <span>{style.icon}</span>
        <span>
          {zone === "no_data"
            ? "Нет данных о рынке"
            : `${style.label} на ${Math.abs(deviation)}%`}
        </span>
      </div>

      {/* Кнопка */}
      <button
        onClick={handleParse}
        disabled={loading}
        className="w-full text-sm border border-gray-300 rounded-lg px-3 py-2 hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {loading ? "Парсим цены..." : "Спарсить цену"}
      </button>

      {/* Детали по сайтам */}
      {summary && summary.sites.length > 0 && (
        <div className="space-y-1 pt-1 border-t border-gray-100">
          {summary.sites.map((s) => (
            <div key={s.site} className="flex justify-between text-xs text-gray-500">
              <span>{s.site}</span>
              <span className="font-medium">{s.price.toLocaleString("ru-RU")} ₽</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Коммит**

```bash
git add src/app/admin/components/PriceScaleWidget.tsx
git commit -m "feat: PriceScaleWidget with color zones and parse button"
```

---

## Task 5: Интеграция на страницу товара в админке

**Files:**
- Modify: страница товара в Admin Panel (найти через `find src/app/admin -name "*.tsx" | xargs grep -l "price\|Price" | head -5`)

- [ ] **Step 1: Найти файл страницы товара в админке**

```bash
find src/app/admin -name "*.tsx" | head -20
```

Найти файл где отображается/редактируется цена товара (`price`). Это скорее всего `src/app/admin/products/[id]/page.tsx` или похожий путь.

- [ ] **Step 2: Добавить PriceScaleWidget на страницу**

В найденный файл добавить импорт и компонент. Пример (адаптировать под реальную структуру файла):

```tsx
import { PriceScaleWidget } from "@/app/admin/components/PriceScaleWidget";
import { fetchPriceSummary } from "@/app/lib/price-monitor";

// Внутри серверного компонента (async function):
const priceSummary = await fetchPriceSummary(product.article, product.brand);

// В JSX рядом с полем цены:
<PriceScaleWidget
  article={product.article}
  brand={product.brand}
  yourPrice={product.price}
  initial={priceSummary}
/>
```

- [ ] **Step 3: Проверить в браузере**

Открыть товар в админке. Виджет должен появиться. Нажать "Спарсить цену" — через 10-15 сек шкала обновится.

- [ ] **Step 4: Коммит**

```bash
git add src/app/admin/
git commit -m "feat: add PriceScaleWidget to admin product page"
```

---

## Task 6: Система уведомлений — структура данных

**Files:**
- Modify: `price-monitor/runner.py` (на парсер VPS) — добавить запись notifications.json
- Create: `src/app/api/price-notifications/route.ts` — отдаёт уведомления

- [ ] **Step 1: Добавить запись notifications.json в runner.py (парсер VPS)**

В конец функции `run_all()` в `runner.py` добавить:

```python
import json
from config import PRICE_GREEN_LOW, PRICE_GREEN_HIGH
from db import get_summary

# После завершения всего парсинга:
async def write_notifications(articles: list[tuple[str, str]]):
    notifications = []
    for article, brand in articles:
        summary = get_summary(article, brand)
        if not summary:
            continue
        # Здесь нужна ваша цена — добавить в articles.txt третий столбец: артикул|бренд|цена
        # Пример: 95227052|ACDelco|3800
        # Пропустить если цена не передана
    with open("notifications.json", "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_parsed": len(articles),
            "items": notifications,
        }, f, ensure_ascii=False, indent=2)
```

> **Важно:** Для уведомлений нужна ваша цена. Добавить в `articles.txt` третий столбец:
> ```
> 95227052|ACDelco|3800
> 93745242|ACDelco|2500
> ```
> Это цена из 1С — экспортировать вместе с артикулом и брендом.

- [ ] **Step 2: Обновить runner.py — полный блок записи уведомлений**

Заменить функцию `write_notifications` на полную версию:

```python
async def write_notifications(articles: list[tuple[str, str, float]]):
    red_items = []
    yellow_items = []
    green_count = 0

    for article, brand, your_price in articles:
        summary = get_summary(article, brand)
        if not summary or not summary["avg_price"]:
            continue
        avg = summary["avg_price"]
        ratio = your_price / avg
        deviation = round((ratio - 1) * 100)
        item = {
            "article": article,
            "brand": brand,
            "your_price": your_price,
            "avg_price": avg,
            "deviation_pct": deviation,
            "sites_count": summary["sites_count"],
        }
        if ratio > PRICE_GREEN_HIGH:
            red_items.append(item)
        elif ratio < PRICE_GREEN_LOW:
            yellow_items.append(item)
        else:
            green_count += 1

    red_items.sort(key=lambda x: x["deviation_pct"], reverse=True)
    yellow_items.sort(key=lambda x: x["deviation_pct"])

    with open("notifications.json", "w", encoding="utf-8") as f:
        json.dump({
            "generated_at": datetime.now().isoformat(),
            "total_parsed": len(articles),
            "red_count": len(red_items),
            "yellow_count": len(yellow_items),
            "green_count": green_count,
            "red_items": red_items,
            "yellow_items": yellow_items,
        }, f, ensure_ascii=False, indent=2)
    log.info(f"Notifications: {len(red_items)} red, {len(yellow_items)} yellow, {green_count} green")
```

- [ ] **Step 3: Добавить GET /notifications в api.py (парсер VPS)**

```python
# в api.py
import json
from pathlib import Path

@app.get("/notifications")
def get_notifications(x_api_token: str = Header(default=None)):
    check_token(x_api_token)
    path = Path("notifications.json")
    if not path.exists():
        return {"generated_at": None, "red_count": 0, "yellow_count": 0, "green_count": 0, "red_items": [], "yellow_items": []}
    return json.loads(path.read_text(encoding="utf-8"))
```

- [ ] **Step 4: Создать API route в Next.js**

```typescript
// src/app/api/price-notifications/route.ts
import { NextResponse } from "next/server";

const PARSER_URL = process.env.PARSER_API_URL!;
const PARSER_TOKEN = process.env.PARSER_API_TOKEN!;

export async function GET() {
  try {
    const res = await fetch(`${PARSER_URL}/notifications`, {
      headers: { "X-API-Token": PARSER_TOKEN },
      cache: "no-store",
    });
    const data = await res.json();
    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ red_count: 0, yellow_count: 0, green_count: 0, red_items: [], yellow_items: [] });
  }
}
```

- [ ] **Step 5: Коммит**

```bash
git add src/app/api/price-notifications/
git commit -m "feat: price notifications API route"
```

---

## Task 7: Колокольчик (NotificationBell.tsx)

**Files:**
- Create: `src/app/admin/components/NotificationBell.tsx`

- [ ] **Step 1: Написать NotificationBell.tsx**

```tsx
// src/app/admin/components/NotificationBell.tsx
import Link from "next/link";

async function getNotificationCount(): Promise<number> {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/price-notifications`,
      { cache: "no-store" }
    );
    const data = await res.json();
    return (data.red_count ?? 0) + (data.yellow_count ?? 0);
  } catch {
    return 0;
  }
}

export async function NotificationBell() {
  const count = await getNotificationCount();
  return (
    <Link href="/admin/notifications" className="relative inline-flex items-center">
      <svg className="w-6 h-6 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
          d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6 6 0 10-12 0v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
      </svg>
      {count > 0 && (
        <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
          {count > 99 ? "99+" : count}
        </span>
      )}
    </Link>
  );
}
```

- [ ] **Step 2: Добавить колокольчик в шапку Admin Panel**

Найти шапку (header) Admin Panel и добавить компонент:

```tsx
import { NotificationBell } from "@/app/admin/components/NotificationBell";

// В JSX шапки:
<NotificationBell />
```

- [ ] **Step 3: Коммит**

```bash
git add src/app/admin/components/NotificationBell.tsx
git commit -m "feat: NotificationBell with red+yellow count in admin header"
```

---

## Task 8: Страница уведомлений + Дашборд

**Files:**
- Create: `src/app/admin/notifications/page.tsx`
- Create: `src/app/admin/components/PriceDashboard.tsx`

- [ ] **Step 1: Написать PriceDashboard.tsx**

```tsx
// src/app/admin/components/PriceDashboard.tsx
async function fetchNotifications() {
  try {
    const res = await fetch(
      `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/price-notifications`,
      { cache: "no-store" }
    );
    return res.json();
  } catch {
    return null;
  }
}

export async function PriceDashboard() {
  const data = await fetchNotifications();
  if (!data || !data.generated_at) return null;

  const date = new Date(data.generated_at).toLocaleDateString("ru-RU", {
    day: "numeric", month: "long", year: "numeric"
  });

  return (
    <div className="rounded-xl border border-gray-200 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800">📊 Ночной отчёт — {date}</h2>
      </div>
      <div className="grid grid-cols-3 gap-4 text-center">
        <div className="rounded-lg bg-red-50 p-3">
          <div className="text-2xl font-bold text-red-600">{data.red_count}</div>
          <div className="text-xs text-red-500 mt-1">⛔ Выше рынка</div>
        </div>
        <div className="rounded-lg bg-yellow-50 p-3">
          <div className="text-2xl font-bold text-yellow-600">{data.yellow_count}</div>
          <div className="text-xs text-yellow-500 mt-1">⚠️ Ниже рынка</div>
        </div>
        <div className="rounded-lg bg-green-50 p-3">
          <div className="text-2xl font-bold text-green-600">{data.green_count}</div>
          <div className="text-xs text-green-500 mt-1">✅ В норме</div>
        </div>
      </div>
      <div className="text-sm text-gray-500">
        Обновлено товаров: {(data.red_count + data.yellow_count + data.green_count).toLocaleString("ru-RU")}
      </div>
      <a href="/admin/notifications" className="block text-center text-sm text-blue-600 hover:underline">
        Посмотреть список →
      </a>
    </div>
  );
}
```

- [ ] **Step 2: Написать страницу уведомлений**

```tsx
// src/app/admin/notifications/page.tsx
async function fetchNotifications() {
  const res = await fetch(
    `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/price-notifications`,
    { cache: "no-store" }
  );
  return res.json();
}

export default async function NotificationsPage() {
  const data = await fetchNotifications();
  const items = [...(data.red_items ?? []), ...(data.yellow_items ?? [])];

  return (
    <div className="p-6 space-y-6">
      <h1 className="text-xl font-bold">Уведомления о ценах</h1>
      {items.length === 0 ? (
        <p className="text-gray-500">Все цены в норме ✅</p>
      ) : (
        <div className="space-y-2">
          {items.map((item: any) => {
            const isRed = item.deviation_pct > 0;
            return (
              <div
                key={`${item.article}-${item.brand}`}
                className={`flex items-center justify-between p-4 rounded-lg border ${
                  isRed ? "border-red-200 bg-red-50" : "border-yellow-200 bg-yellow-50"
                }`}
              >
                <div>
                  <div className="font-medium text-gray-800">{item.brand} {item.article}</div>
                  <div className="text-sm text-gray-500">
                    Ваша цена: {item.your_price.toLocaleString("ru-RU")} ₽ ·
                    Рынок: {item.avg_price.toLocaleString("ru-RU")} ₽ ·
                    {item.sites_count} магазин{item.sites_count === 1 ? "" : "ов"}
                  </div>
                </div>
                <div className={`text-lg font-bold ${isRed ? "text-red-600" : "text-yellow-600"}`}>
                  {item.deviation_pct > 0 ? "+" : ""}{item.deviation_pct}%
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 3: Добавить PriceDashboard на главную страницу Admin Panel**

Найти `src/app/admin/page.tsx` (или аналог) и добавить:

```tsx
import { PriceDashboard } from "@/app/admin/components/PriceDashboard";

// В JSX главной страницы:
<PriceDashboard />
```

- [ ] **Step 4: Коммит**

```bash
git add src/app/admin/notifications/ src/app/admin/components/PriceDashboard.tsx
git commit -m "feat: notifications page and morning dashboard"
```

---

## Готово — Admin Panel Integration

После выполнения всех задач в Admin Panel:
- На карточке каждого товара — шкала с цветом и кнопка "Спарсить цену"
- В шапке — колокольчик с числом товаров требующих внимания
- На главной — утренний дашборд с разбивкой по зонам
- Страница `/admin/notifications` — полный список с отклонением %
