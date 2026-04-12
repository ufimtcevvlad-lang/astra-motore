"use client";

import { useEffect, useState } from "react";

interface QuickReply {
  id: number;
  title: string;
  text: string;
}

export default function QuickRepliesManager() {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [error, setError] = useState("");

  async function fetchReplies() {
    try {
      const res = await fetch("/api/admin/quick-replies");
      const data = await res.json();
      setReplies(data.replies ?? []);
    } catch {
      setError("Не удалось загрузить быстрые ответы");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    fetchReplies();
  }, []);

  function resetForm() {
    setEditId(null);
    setTitle("");
    setText("");
    setError("");
  }

  function startEdit(reply: QuickReply) {
    setEditId(reply.id);
    setTitle(reply.title);
    setText(reply.text);
    setError("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !text.trim()) {
      setError("Заполните название и текст");
      return;
    }
    setSaving(true);
    setError("");
    try {
      if (editId !== null) {
        const res = await fetch(`/api/admin/quick-replies/${editId}`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), text: text.trim() }),
        });
        if (!res.ok) throw new Error();
      } else {
        const res = await fetch("/api/admin/quick-replies", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title: title.trim(), text: text.trim() }),
        });
        if (!res.ok) throw new Error();
      }
      resetForm();
      await fetchReplies();
    } catch {
      setError("Ошибка при сохранении");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Удалить этот быстрый ответ?")) return;
    try {
      const res = await fetch(`/api/admin/quick-replies/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error();
      await fetchReplies();
      if (editId === id) resetForm();
    } catch {
      setError("Ошибка при удалении");
    }
  }

  return (
    <div className="space-y-6">
      {/* Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6">
        <h2 className="text-base font-semibold text-gray-800 mb-4">
          {editId !== null ? "Редактировать ответ" : "Добавить быстрый ответ"}
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Название
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Например: Приветствие"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Текст ответа
            </label>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Введите текст быстрого ответа..."
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            />
          </div>
          {error && <p className="text-sm text-red-600">{error}</p>}
          <div className="flex items-center gap-3">
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              {saving ? "Сохраняю..." : editId !== null ? "Сохранить" : "Добавить"}
            </button>
            {editId !== null && (
              <button
                type="button"
                onClick={resetForm}
                className="px-4 py-2 bg-gray-100 text-gray-700 text-sm font-medium rounded-lg hover:bg-gray-200 transition-colors"
              >
                Отмена
              </button>
            )}
          </div>
        </form>
      </div>

      {/* List */}
      <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-100">
          <h2 className="text-base font-semibold text-gray-800">
            Сохранённые ответы{" "}
            {!loading && (
              <span className="text-sm font-normal text-gray-500">({replies.length})</span>
            )}
          </h2>
        </div>
        {loading ? (
          <div className="px-6 py-8 text-sm text-gray-500">Загрузка...</div>
        ) : replies.length === 0 ? (
          <div className="px-6 py-8 text-sm text-gray-500">
            Нет быстрых ответов. Добавьте первый выше.
          </div>
        ) : (
          <ul className="divide-y divide-gray-100">
            {replies.map((reply) => (
              <li
                key={reply.id}
                className={`px-6 py-4 flex items-start justify-between gap-4 ${
                  editId === reply.id ? "bg-indigo-50" : "hover:bg-gray-50"
                } transition-colors`}
              >
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900">{reply.title}</p>
                  <p className="text-sm text-gray-500 mt-0.5 line-clamp-2">{reply.text}</p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => startEdit(reply)}
                    className="px-3 py-1.5 text-xs font-medium text-indigo-600 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors"
                  >
                    Изменить
                  </button>
                  <button
                    type="button"
                    onClick={() => handleDelete(reply.id)}
                    className="px-3 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                  >
                    Удалить
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
