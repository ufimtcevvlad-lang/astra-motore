"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import CategoryForm from "@/app/admin/components/CategoryForm";
import ConfirmModal from "@/app/admin/components/ConfirmModal";

interface CategoryData {
  id: number;
  title: string;
  slug: string;
  groupName: string;
  groupSlug: string;
  sortOrder: number;
}

export default function EditCategoryPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const [category, setCategory] = useState<CategoryData | null>(null);
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    Promise.all([
      fetch(`/api/admin/categories/${id}`).then((r) => {
        if (!r.ok) throw new Error("not found");
        return r.json();
      }),
      fetch("/api/admin/categories").then((r) => r.json()),
    ])
      .then(([cat, all]: [CategoryData, { groupName: string }[]]) => {
        setCategory(cat);
        const unique = [...new Set(all.map((c) => c.groupName).filter(Boolean))];
        setExistingGroups(unique);
      })
      .catch(() => setError("Категория не найдена"))
      .finally(() => setLoading(false));
  }, [id]);

  async function handleDelete() {
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ошибка при удалении");
        return;
      }
      router.push("/admin/categories");
    } catch {
      alert("Ошибка сети");
    } finally {
      setDeleting(false);
      setShowDelete(false);
    }
  }

  if (loading) {
    return (
      <>
        <AdminHeader title="Редактирование категории" />
        <div className="p-6 text-gray-500 text-sm">Загрузка...</div>
      </>
    );
  }

  if (error || !category) {
    return (
      <>
        <AdminHeader title="Редактирование категории" />
        <div className="p-6">
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error || "Категория не найдена"}
          </div>
        </div>
      </>
    );
  }

  return (
    <>
      <AdminHeader title="Редактирование категории">
        <button
          onClick={() => setShowDelete(true)}
          disabled={deleting}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          Удалить
        </button>
      </AdminHeader>
      <CategoryForm category={category} existingGroups={existingGroups} />
      <ConfirmModal
        open={showDelete}
        title="Удалить категорию"
        message={`Вы уверены, что хотите удалить категорию "${category.title}"? Это действие необратимо.`}
        onConfirm={handleDelete}
        onCancel={() => setShowDelete(false)}
      />
    </>
  );
}
