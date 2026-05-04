"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";
import ProductForm from "@/app/admin/components/ProductForm";

interface Category {
  id: number;
  title: string;
}

export default function NewProductPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/categories", { cache: "no-store" })
      .then((r) => r.json())
      .then((data) => setCategories(data.items ?? data))
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <>
        <AdminHeader title="Новый товар" />
        <div className="p-6 text-center text-gray-400">Загрузка...</div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Новый товар" />
      <ProductForm categories={categories} />
    </>
  );
}
