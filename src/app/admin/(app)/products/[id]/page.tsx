"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import ProductForm from "@/app/admin/components/ProductForm";

interface Category {
  id: number;
  title: string;
}

type ProductFormProps = Parameters<typeof ProductForm>[0];
type AdminProduct = NonNullable<ProductFormProps["product"]>;

export default function EditProductPage() {
  const params = useParams();
  const id = params.id as string;

  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/products/${id}`).then((r) => {
        if (!r.ok) throw new Error("Товар не найден");
        return r.json();
      }),
      fetch("/api/admin/categories")
        .then((r) => r.json())
        .then((data) => data.items ?? data),
    ])
      .then(([prod, cats]) => {
        setProduct(prod);
        setCategories(cats);
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <>
        <AdminHeader title="Редактирование товара" />
        <div className="p-6 text-center text-gray-400">Загрузка...</div>
      </>
    );
  }

  if (error || !product) {
    return (
      <>
        <AdminHeader title="Редактирование товара" />
        <div className="p-6 text-center text-red-500">{error || "Товар не найден"}</div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Редактирование товара" />
      <ProductForm product={product} categories={categories} />
    </>
  );
}
