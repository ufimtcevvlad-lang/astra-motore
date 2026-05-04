"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import ProductFilters from "@/app/admin/components/ProductFilters";
import ProductList, { ProductItem } from "@/app/admin/components/ProductList";
import BulkActionBar from "@/app/admin/components/BulkActionBar";
import { useProductFilters } from "@/app/admin/components/useProductFilters";
import { useScrollRestore } from "@/app/admin/components/useScrollRestore";
import { BulkCategoryModal } from "./_components/BulkCategoryModal";

interface Category {
  id: number;
  title: string;
}

export default function ProductsPage() {
  const { filters, page, sort, setFilters, setPage, setSort, reset } = useProductFilters();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const scrollKey = `${pathname}?${searchParams.toString()}`;
  const [items, setItems] = useState<ProductItem[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [brands, setBrands] = useState<string[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [showBulkCategoryModal, setShowBulkCategoryModal] = useState(false);

  useScrollRestore(scrollKey, !loading && items.length > 0);

  useEffect(() => {
    fetch("/api/admin/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCategories(data.items ?? data))
      .catch(() => {});
  }, []);

  const buildQuery = useCallback(() => {
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (filters.search) params.set("search", filters.search);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.inStock) params.set("inStock", filters.inStock);
    if (filters.hidden) params.set("hidden", filters.hidden);
    if (filters.priceFrom) params.set("priceFrom", filters.priceFrom);
    if (filters.priceTo) params.set("priceTo", filters.priceTo);
    if (filters.nocat) params.set("nocat", "1");
    if (filters.recent) params.set("recent", "1");
    params.set("sort", sort.field);
    params.set("dir", sort.dir);
    return params.toString();
  }, [filters, page, sort]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/products?${buildQuery()}`, { cache: "no-store" });
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      setTotal(Number(data.total ?? 0));
      if (data.brands) setBrands(data.brands);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [buildQuery]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAll(select: boolean) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (select) items.forEach((i) => next.add(i.id));
      else items.forEach((i) => next.delete(i.id));
      return next;
    });
  }

  async function inlineUpdate(id: number, patch: { price?: number; inStock?: number; hidden?: boolean }) {
    const res = await fetch(`/api/admin/products/${id}/quick`, {
      method: "PATCH",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) throw new Error("fail");
    const updated = await res.json();
    setItems((prev) => prev.map((i) => (i.id === id ? { ...i, ...updated } : i)));
  }

  async function bulkPatch(action: unknown) {
    const ids = [...selectedIds];
    const res = await fetch(`/api/admin/products/bulk`, {
      method: "PATCH",
      cache: "no-store",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids, action }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Не удалось применить изменение");
    }
    await fetchProducts();
  }

  async function bulkDelete(force = false) {
    const ids = [...selectedIds];
    const res = await fetch(
      `/api/admin/products/bulk${force ? "?force=1" : ""}`,
      {
        method: "DELETE",
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids }),
      }
    );
    if (res.status === 409) {
      const data = await res.json().catch(() => ({}));
      if (data.error === "product_used_in_orders") {
        const err: Error & { warning?: string } = new Error("product_used_in_orders");
        err.warning = data.message;
        throw err;
      }
    }
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Не удалось удалить");
    }
    setSelectedIds(new Set());
    await fetchProducts();
  }

  const hasFilters =
    !!filters.search ||
    !!filters.categoryId ||
    !!filters.brand ||
    !!filters.inStock ||
    !!filters.hidden ||
    !!filters.priceFrom ||
    !!filters.priceTo ||
    !!filters.nocat ||
    !!filters.recent ||
    sort.field !== "updated" ||
    sort.dir !== "desc";

  return (
    <>
      <AdminHeader title="Товары">
        <Link
          href="/admin/products/import"
          className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
        >
          Импорт Excel
        </Link>
        <a
          href={`/api/admin/products/export?${(() => {
            const p = new URLSearchParams();
            if (filters.search) p.set("search", filters.search);
            if (filters.categoryId) p.set("categoryId", filters.categoryId);
            if (filters.brand) p.set("brand", filters.brand);
            if (filters.inStock) p.set("inStock", filters.inStock);
            if (filters.hidden) p.set("hidden", filters.hidden);
            if (filters.priceFrom) p.set("priceFrom", filters.priceFrom);
            if (filters.priceTo) p.set("priceTo", filters.priceTo);
            return p.toString();
          })()}`}
          className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
        >
          Экспорт Excel
        </a>
        {selectedIds.size > 0 && filters.nocat && (
          <button
            onClick={() => setShowBulkCategoryModal(true)}
            className="bg-amber-500 hover:bg-amber-600 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            Назначить категорию ({selectedIds.size})
          </button>
        )}
        <Link
          href="/admin/products/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
        >
          + Добавить товар
        </Link>
      </AdminHeader>

      <div className="p-6">
        <ProductFilters
          categories={categories}
          brands={brands}
          filters={filters}
          sort={sort}
          onChange={setFilters}
          onSortChange={setSort}
          onReset={hasFilters ? reset : undefined}
          resultCount={loading ? null : total}
        />

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : (
          <ProductList
            items={items}
            page={page}
            totalPages={totalPages}
            total={total}
            sort={sort}
            selectedIds={selectedIds}
            onPageChange={setPage}
            onSortChange={setSort}
            onToggleSelect={toggleSelect}
            onToggleSelectAll={toggleSelectAll}
            onInlineUpdate={inlineUpdate}
          />
        )}
      </div>

      <BulkActionBar
        selectedCount={selectedIds.size}
        categories={categories}
        onClear={() => setSelectedIds(new Set())}
        onDelete={bulkDelete}
        onSetInStock={(value) => bulkPatch({ type: "setInStock", value })}
        onSetCategory={(categoryId) => bulkPatch({ type: "setCategory", categoryId })}
        onPriceDelta={(percent) => bulkPatch({ type: "priceDelta", percent })}
        onSetHidden={(value) => bulkPatch({ type: "setHidden", value })}
      />

      {showBulkCategoryModal && (
        <BulkCategoryModal
          ids={[...selectedIds]}
          categories={categories}
          onClose={() => setShowBulkCategoryModal(false)}
          onDone={() => {
            setSelectedIds(new Set());
            fetchProducts();
          }}
        />
      )}
    </>
  );
}
