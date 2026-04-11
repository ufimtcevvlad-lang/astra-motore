"use client";

import Link from "next/link";
import AdminHeader from "@/app/admin/components/AdminHeader";
import CategoryList from "@/app/admin/components/CategoryList";

export default function CategoriesPage() {
  return (
    <>
      <AdminHeader title="Категории">
        <Link
          href="/admin/categories/new"
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Добавить категорию
        </Link>
      </AdminHeader>
      <CategoryList />
    </>
  );
}
