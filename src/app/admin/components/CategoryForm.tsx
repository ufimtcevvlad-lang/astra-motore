"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";

interface CategoryData {
  id: number;
  title: string;
  slug: string;
  groupName: string;
  groupSlug: string;
  sortOrder: number;
}

interface CategoryFormProps {
  category?: CategoryData;
  existingGroups: string[];
}

const translitMap: Record<string, string> = {
  а: "a", б: "b", в: "v", г: "g", д: "d", е: "e", ё: "yo", ж: "zh",
  з: "z", и: "i", й: "y", к: "k", л: "l", м: "m", н: "n", о: "o",
  п: "p", р: "r", с: "s", т: "t", у: "u", ф: "f", х: "kh", ц: "ts",
  ч: "ch", ш: "sh", щ: "shch", ъ: "", ы: "y", ь: "", э: "e", ю: "yu",
  я: "ya",
};

function transliterate(text: string): string {
  return text
    .toLowerCase()
    .split("")
    .map((ch) => {
      if (ch === " ") return "-";
      return translitMap[ch] ?? ch;
    })
    .join("")
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

export default function CategoryForm({ category, existingGroups }: CategoryFormProps) {
  const router = useRouter();
  const isEdit = !!category;

  const [title, setTitle] = useState(category?.title ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [groupName, setGroupName] = useState(category?.groupName ?? "");
  const [groupSlug, setGroupSlug] = useState(category?.groupSlug ?? "");
  const [sortOrder, setSortOrder] = useState(category?.sortOrder ?? 0);
  const [slugManual, setSlugManual] = useState(false);
  const [groupSlugManual, setGroupSlugManual] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!slugManual) setSlug(transliterate(title));
  }, [title, slugManual]);

  useEffect(() => {
    if (!groupSlugManual) setGroupSlug(transliterate(groupName));
  }, [groupName, groupSlugManual]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSaving(true);

    const payload = { title, slug, groupName, groupSlug, sortOrder };

    try {
      const url = isEdit
        ? `/api/admin/categories/${category!.id}`
        : "/api/admin/categories";
      const method = isEdit ? "PUT" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Произошла ошибка");
        return;
      }

      router.push("/admin/categories");
    } catch {
      setError("Ошибка сети");
    } finally {
      setSaving(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="p-6 max-w-2xl">
      <div className="bg-white rounded-xl shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            {error}
          </div>
        )}

        <div>
          <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
            Название
          </label>
          <input
            id="title"
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Тормозные колодки"
          />
        </div>

        <div>
          <label htmlFor="slug" className="block text-sm font-medium text-gray-700 mb-1">
            Slug (URL)
          </label>
          <input
            id="slug"
            type="text"
            required
            value={slug}
            onChange={(e) => {
              setSlugManual(true);
              setSlug(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="tormoznye-kolodki"
          />
        </div>

        <div>
          <label htmlFor="groupName" className="block text-sm font-medium text-gray-700 mb-1">
            Группа
          </label>
          <input
            id="groupName"
            type="text"
            list="groupNameList"
            value={groupName}
            onChange={(e) => setGroupName(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="Тормозная система"
          />
          <datalist id="groupNameList">
            {existingGroups.map((g) => (
              <option key={g} value={g} />
            ))}
          </datalist>
        </div>

        <div>
          <label htmlFor="groupSlug" className="block text-sm font-medium text-gray-700 mb-1">
            Slug группы
          </label>
          <input
            id="groupSlug"
            type="text"
            value={groupSlug}
            onChange={(e) => {
              setGroupSlugManual(true);
              setGroupSlug(e.target.value);
            }}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
            placeholder="tormoznaya-sistema"
          />
        </div>

        <div>
          <label htmlFor="sortOrder" className="block text-sm font-medium text-gray-700 mb-1">
            Порядок сортировки
          </label>
          <input
            id="sortOrder"
            type="number"
            value={sortOrder}
            onChange={(e) => setSortOrder(Number(e.target.value))}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="submit"
            disabled={saving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохранение..." : isEdit ? "Сохранить" : "Создать"}
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/categories")}
            className="text-gray-600 hover:bg-gray-100 px-4 py-2 rounded-lg text-sm transition-colors"
          >
            Отмена
          </button>
        </div>
      </div>
    </form>
  );
}
