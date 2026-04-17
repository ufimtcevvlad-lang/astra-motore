"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import ProductFilters, { ProductFiltersState } from "@/app/admin/components/ProductFilters";
import ProductList from "@/app/admin/components/ProductList";
import { useProductFilters } from "@/app/admin/components/useProductFilters";
import { useScrollRestore } from "@/app/admin/components/useScrollRestore";

interface Category {
  id: number;
  title: string;
}

interface ProductItem {
  id: number;
  name: string;
  sku: string;
  brand: string | null;
  categoryTitle: string | null;
  price: number;
  inStock: number;
  image: string | null;
}

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

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((r) => r.json())
      .then((data) => setCategories(data.items ?? data))
      .catch(() => {});
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    params.set("page", String(page));
    if (filters.search) params.set("search", filters.search);
    if (filters.categoryId) params.set("categoryId", filters.categoryId);
    if (filters.brand) params.set("brand", filters.brand);
    if (filters.inStock) params.set("inStock", filters.inStock);
    if (filters.priceFrom) params.set("priceFrom", filters.priceFrom);
    if (filters.priceTo) params.set("priceTo", filters.priceTo);

    try {
      const res = await fetch(`/api/admin/products?${params}`);
      const data = await res.json();
      setItems(data.items ?? []);
      setTotalPages(data.totalPages ?? 1);
      if (data.brands) setBrands(data.brands);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [page, filters]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  function handleFilterChange(newFilters: ProductFiltersState) {
    setFilters(newFilters);
  }

  return (
    <>
      <AdminHeader title="Товары">
        <Link
          href="/admin/products/import"
          className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
        >
          Импорт Excel
        </Link>
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
          onChange={handleFilterChange}
        />

        {loading ? (
          <div className="text-center py-12 text-gray-400">Загрузка...</div>
        ) : (
          <ProductList
            items={items}
            page={page}
            totalPages={totalPages}
            onPageChange={setPage}
          />
        )}
      </div>
    </>
  );
}
