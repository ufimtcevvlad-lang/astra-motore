"use client";

import { useState } from "react";

interface Category {
  id: number;
  title: string;
}

interface Props {
  ids: number[];
  categories: Category[];
  onClose: () => void;
  onDone: () => void;
}

export function BulkCategoryModal({ ids, categories, onClose, onDone }: Props) {
  const [categoryId, setCategoryId] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!categoryId) return;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/products/bulk", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids, action: { type: "setCategory", categoryId: Number(categoryId) } }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setError(data.error || "Не удалось применить изменение");
        return;
      }
      onDone();
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-96">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">
          Назначить категорию для {ids.length} товаров
        </h3>
        <select
          className="w-full mb-4 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
        >
          <option value="">— выберите категорию —</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
        {error && <p className="text-sm text-red-600 mb-3">{error}</p>}
        <div className="flex gap-2 justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700"
          >
            Отмена
          </button>
          <button
            disabled={!categoryId || saving}
            onClick={submit}
            className="px-4 py-2 text-sm bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg disabled:opacity-50"
          >
            {saving ? "Сохранение..." : "Применить"}
          </button>
        </div>
      </div>
    </div>
  );
}
