"use client";

import { useEffect, useState } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";
import CategoryForm from "@/app/admin/components/CategoryForm";

export default function NewCategoryPage() {
  const [existingGroups, setExistingGroups] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/admin/categories")
      .then((res) => res.json())
      .then((data: { groupName: string }[]) => {
        const unique = [...new Set(data.map((c) => c.groupName).filter(Boolean))];
        setExistingGroups(unique);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <AdminHeader title="Новая категория" />
      {loading ? (
        <div className="p-6 text-gray-500 text-sm">Загрузка...</div>
      ) : (
        <CategoryForm existingGroups={existingGroups} />
      )}
    </>
  );
}
