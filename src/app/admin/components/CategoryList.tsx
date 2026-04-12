"use client";

import { useEffect, useState, useRef } from "react";
import Link from "next/link";
import ConfirmModal from "./ConfirmModal";

interface Category {
  id: number;
  slug: string;
  title: string;
  groupSlug: string;
  groupName: string;
  sortOrder: number;
  productCount: number;
}

interface GroupedCategories {
  groupName: string;
  items: Category[];
}

export default function CategoryList() {
  const [groups, setGroups] = useState<GroupedCategories[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleteTarget, setDeleteTarget] = useState<Category | null>(null);
  const [deleting, setDeleting] = useState(false);
  const dragItem = useRef<{ groupIdx: number; itemIdx: number } | null>(null);
  const dragOver = useRef<{ groupIdx: number; itemIdx: number } | null>(null);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/admin/categories");
      if (!res.ok) throw new Error();
      const data: Category[] = await res.json();

      const map = new Map<string, Category[]>();
      for (const cat of data) {
        const key = cat.groupName || "Без группы";
        if (!map.has(key)) map.set(key, []);
        map.get(key)!.push(cat);
      }

      setGroups(
        Array.from(map.entries()).map(([groupName, items]) => ({ groupName, items }))
      );
    } catch {
      console.error("Failed to fetch categories");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchCategories();
  }, []);

  function handleDragStart(groupIdx: number, itemIdx: number) {
    dragItem.current = { groupIdx, itemIdx };
  }

  function handleDragOver(e: React.DragEvent, groupIdx: number, itemIdx: number) {
    e.preventDefault();
    dragOver.current = { groupIdx, itemIdx };
  }

  async function handleDrop(groupIdx: number) {
    if (!dragItem.current || !dragOver.current) return;
    if (dragItem.current.groupIdx !== groupIdx) return;

    const newGroups = [...groups];
    const group = { ...newGroups[groupIdx], items: [...newGroups[groupIdx].items] };
    const [movedItem] = group.items.splice(dragItem.current.itemIdx, 1);
    group.items.splice(dragOver.current.itemIdx, 0, movedItem);
    newGroups[groupIdx] = group;
    setGroups(newGroups);

    const reorderItems = group.items.map((item, idx) => ({
      id: item.id,
      sortOrder: idx,
    }));

    dragItem.current = null;
    dragOver.current = null;

    try {
      await fetch("/api/admin/categories/reorder", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items: reorderItems }),
      });
    } catch {
      fetchCategories();
    }
  }

  async function handleDelete() {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/categories/${deleteTarget.id}`, {
        method: "DELETE",
      });
      if (!res.ok) {
        const data = await res.json();
        alert(data.error || "Ошибка при удалении");
        return;
      }
      setDeleteTarget(null);
      fetchCategories();
    } catch {
      alert("Ошибка сети");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
          Загрузка...
        </div>
      </div>
    );
  }

  if (groups.length === 0) {
    return (
      <div className="p-6">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center text-gray-500">
          Категорий пока нет. Создайте первую!
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {groups.map((group, groupIdx) => (
        <div key={group.groupName} className="bg-white rounded-xl shadow-sm p-6">
          <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-4">
            {group.groupName}
          </h3>
          <div className="space-y-2">
            {group.items.map((cat, itemIdx) => (
              <div
                key={cat.id}
                draggable
                onDragStart={() => handleDragStart(groupIdx, itemIdx)}
                onDragOver={(e) => handleDragOver(e, groupIdx, itemIdx)}
                onDrop={() => handleDrop(groupIdx)}
                className="flex items-center justify-between px-4 py-3 bg-gray-50 rounded-lg hover:bg-gray-100 cursor-grab active:cursor-grabbing transition-colors"
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                  </svg>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-gray-900 truncate">{cat.title}</span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 flex-shrink-0">
                        {cat.productCount} товаров
                      </span>
                    </div>
                    <span className="text-xs text-gray-400 block">{cat.slug}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Link
                    href={`/admin/categories/${cat.id}`}
                    className="text-gray-600 hover:bg-gray-200 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Изменить
                  </Link>
                  <button
                    onClick={() => setDeleteTarget(cat)}
                    className="text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg text-sm transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ))}

      <ConfirmModal
        open={!!deleteTarget}
        title="Удалить категорию"
        message={`Вы уверены, что хотите удалить категорию "${deleteTarget?.title}"? Это действие необратимо.`}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
