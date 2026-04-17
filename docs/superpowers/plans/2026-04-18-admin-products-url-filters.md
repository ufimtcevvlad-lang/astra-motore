# Admin Products URL Filters Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Save admin product-list filters+page in URL and scroll position across navigations, with localStorage fallback for fresh visits.

**Architecture:** Two new client hooks — `useProductFilters` syncs ProductFiltersState ↔ `useSearchParams` ↔ `localStorage`; `useScrollRestore` persists `scrollY` in `sessionStorage` keyed by full URL. ProductsPage replaces local `useState` with the hooks; ProductList row onClick writes scroll on navigate.

**Tech Stack:** Next.js 15 App Router, React 19, TypeScript, `next/navigation` (`useRouter`, `useSearchParams`, `usePathname`). No tests in repo — verify via `npx tsc --noEmit` and manual preview check.

---

## File Structure

- Create: `src/app/admin/components/useProductFilters.ts` — URL/localStorage state for filters+page
- Create: `src/app/admin/components/useScrollRestore.ts` — sessionStorage-backed scroll position
- Modify: `src/app/admin/(app)/products/page.tsx` — wire hooks in, replace local state
- Modify: `src/app/admin/components/ProductList.tsx` — save scroll before row click navigation
- Reference (unchanged, used for types): `src/app/admin/components/ProductFilters.tsx` — exports `ProductFiltersState`

---

## Task 1: Create `useProductFilters` hook

**Files:**
- Create: `src/app/admin/components/useProductFilters.ts`

- [ ] **Step 1: Create the hook file**

```ts
"use client";

import { useEffect, useMemo } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import type { ProductFiltersState } from "./ProductFilters";

const STORAGE_KEY = "admin.products.filters.last";
const EMPTY: ProductFiltersState = {
  search: "",
  categoryId: "",
  brand: "",
  inStock: "",
  priceFrom: "",
  priceTo: "",
};

function readParams(sp: URLSearchParams): { filters: ProductFiltersState; page: number } {
  return {
    filters: {
      search: sp.get("search") ?? "",
      categoryId: sp.get("categoryId") ?? "",
      brand: sp.get("brand") ?? "",
      inStock: sp.get("inStock") ?? "",
      priceFrom: sp.get("priceFrom") ?? "",
      priceTo: sp.get("priceTo") ?? "",
    },
    page: Math.max(1, Number(sp.get("page") ?? "1") || 1),
  };
}

function buildQuery(filters: ProductFiltersState, page: number): string {
  const p = new URLSearchParams();
  if (filters.search) p.set("search", filters.search);
  if (filters.categoryId) p.set("categoryId", filters.categoryId);
  if (filters.brand) p.set("brand", filters.brand);
  if (filters.inStock) p.set("inStock", filters.inStock);
  if (filters.priceFrom) p.set("priceFrom", filters.priceFrom);
  if (filters.priceTo) p.set("priceTo", filters.priceTo);
  if (page > 1) p.set("page", String(page));
  return p.toString();
}

function isEmpty(f: ProductFiltersState): boolean {
  return (
    !f.search && !f.categoryId && !f.brand && !f.inStock && !f.priceFrom && !f.priceTo
  );
}

export function useProductFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  const { filters, page } = useMemo(() => readParams(new URLSearchParams(sp.toString())), [sp]);

  // One-time fallback: if URL is empty but localStorage has filters, apply them.
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (sp.toString() !== "") return;
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const saved = JSON.parse(raw) as ProductFiltersState;
      if (isEmpty(saved)) return;
      const q = buildQuery(saved, 1);
      if (q) router.replace(`${pathname}?${q}`, { scroll: false });
    } catch {
      /* ignore */
    }
    // Run once on mount.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const push = (next: ProductFiltersState, nextPage: number) => {
    const q = buildQuery(next, nextPage);
    router.replace(q ? `${pathname}?${q}` : pathname, { scroll: false });
    try {
      if (isEmpty(next)) localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch {
      /* ignore */
    }
  };

  return {
    filters,
    page,
    setFilters: (f: ProductFiltersState) => push(f, 1),
    setPage: (p: number) => push(filters, p),
    reset: () => push(EMPTY, 1),
  };
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors (the hook is not wired yet, but the file must compile standalone).

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/components/useProductFilters.ts
git commit -m "feat(admin): useProductFilters hook — URL + localStorage filter state"
```

---

## Task 2: Create `useScrollRestore` hook

**Files:**
- Create: `src/app/admin/components/useScrollRestore.ts`

- [ ] **Step 1: Create the hook file**

```ts
"use client";

import { useEffect } from "react";

const PREFIX = "admin.products.scroll.";

export function saveScroll(key: string) {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(PREFIX + key, String(window.scrollY));
  } catch {
    /* ignore */
  }
}

export function useScrollRestore(key: string, ready: boolean) {
  useEffect(() => {
    if (!ready) return;
    if (typeof window === "undefined") return;
    let y = 0;
    try {
      const raw = sessionStorage.getItem(PREFIX + key);
      y = raw ? Number(raw) : 0;
    } catch {
      /* ignore */
    }
    if (y > 0) {
      // Defer so layout is settled before scroll.
      requestAnimationFrame(() => window.scrollTo(0, y));
    }
  }, [key, ready]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onHide = () => saveScroll(key);
    window.addEventListener("beforeunload", onHide);
    window.addEventListener("pagehide", onHide);
    return () => {
      window.removeEventListener("beforeunload", onHide);
      window.removeEventListener("pagehide", onHide);
    };
  }, [key]);
}
```

- [ ] **Step 2: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 3: Commit**

```bash
git add src/app/admin/components/useScrollRestore.ts
git commit -m "feat(admin): useScrollRestore hook — sessionStorage scroll position"
```

---

## Task 3: Wire hooks into ProductsPage

**Files:**
- Modify: `src/app/admin/(app)/products/page.tsx`

- [ ] **Step 1: Replace local state with hooks**

Change the top of the component. Find this block:

```tsx
export default function ProductsPage() {
  const [filters, setFilters] = useState<ProductFiltersState>(defaultFilters);
  const [items, setItems] = useState<ProductItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
```

Replace with:

```tsx
export default function ProductsPage() {
  const { filters, page, setFilters, setPage } = useProductFilters();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollKey = `${pathname}?${searchParams.toString()}`;
  const [items, setItems] = useState<ProductItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useScrollRestore(scrollKey, !loading && items.length > 0);
```

- [ ] **Step 2: Update imports**

At the top of the file:

```tsx
import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import ProductFilters, { ProductFiltersState } from "@/app/admin/components/ProductFilters";
import ProductList from "@/app/admin/components/ProductList";
import { useProductFilters } from "@/app/admin/components/useProductFilters";
import { useScrollRestore } from "@/app/admin/components/useScrollRestore";
```

Remove the now-unused `defaultFilters` constant (the whole `const defaultFilters = {...}` block).

- [ ] **Step 3: Update `handleFilterChange`**

Find:

```tsx
function handleFilterChange(newFilters: ProductFiltersState) {
  setFilters(newFilters);
  setPage(1);
}
```

Replace with:

```tsx
function handleFilterChange(newFilters: ProductFiltersState) {
  setFilters(newFilters);
}
```

(`setFilters` from the hook already resets page to 1.)

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/(app)/products/page.tsx
git commit -m "feat(admin): ProductsPage uses useProductFilters + useScrollRestore"
```

---

## Task 4: Save scroll on row click in ProductList

**Files:**
- Modify: `src/app/admin/components/ProductList.tsx`

- [ ] **Step 1: Import saveScroll**

Add to imports at top:

```tsx
import { saveScroll } from "./useScrollRestore";
import { usePathname, useSearchParams } from "next/navigation";
```

- [ ] **Step 2: Read current URL inside ProductList**

At the top of `export default function ProductList(...)`, add:

```tsx
const pathname = usePathname();
const searchParams = useSearchParams();
```

- [ ] **Step 3: Wire onClick on the row Link**

Find the Link inside the map:

```tsx
<Link
  href={`/admin/products/${item.id}`}
  className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 transition"
  title="Редактировать"
>
```

Replace with:

```tsx
<Link
  href={`/admin/products/${item.id}`}
  onClick={() => saveScroll(`${pathname}?${searchParams.toString()}`)}
  className="flex-shrink-0 p-2 text-gray-400 hover:text-indigo-600 transition"
  title="Редактировать"
>
```

- [ ] **Step 4: Type check**

Run: `npx tsc --noEmit`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/app/admin/components/ProductList.tsx
git commit -m "feat(admin): save scroll position before opening product card"
```

---

## Task 5: Manual verification

- [ ] **Step 1: Ensure dev server is running, navigate to /admin/products**

Confirm the list renders, filters still work, page switching still works.

- [ ] **Step 2: Apply a filter, check URL**

Pick a brand in the filter panel. URL should become `/admin/products?brand=<Value>`. Reload the page — filter persists and list re-fetches.

- [ ] **Step 3: Page navigation test**

Click to page 2. URL becomes `?brand=<Value>&page=2`. Reload — still on page 2.

- [ ] **Step 4: Scroll restore test**

On page 2 of a filtered list, scroll halfway down. Click the edit pencil on any row. Click browser Back. Expect: fully filtered list, page 2, scrolled to the same position (within ~50px; exact match not guaranteed by browser).

- [ ] **Step 5: LocalStorage fallback test**

Open DevTools → Application → Local Storage. Confirm key `admin.products.filters.last` contains the last filter JSON. Now open a new tab and go to `/admin/products` (no params). URL should auto-update to include the saved filter.

- [ ] **Step 6: Reset test**

Click the reset filters button (if present in ProductFilters; otherwise clear each field). After all fields empty, URL should have no query params and `admin.products.filters.last` key should be gone from localStorage.

- [ ] **Step 7: If all checks pass, merge and deploy**

```bash
cd /Users/vladislavufimcev/Documents/autoparts-shop
git checkout main
git merge --no-ff claude/heuristic-galileo-8fff2c -m "Merge branch 'claude/heuristic-galileo-8fff2c'"
git push origin main
bash scripts/deploy-vps.sh
```
