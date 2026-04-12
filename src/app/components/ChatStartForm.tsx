"use client";

import { useState } from "react";

interface ChatStartFormProps {
  onStarted: (conversationId: number) => void;
}

export default function ChatStartForm({ onStarted }: ChatStartFormProps) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) {
      setError("Введите ваше имя");
      return;
    }
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), contact: contact.trim() }),
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      onStarted(data.conversationId);
    } catch {
      setError("Не удалось начать чат. Попробуйте позже.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col h-full px-5 py-4">
      <div className="mb-5">
        <p className="text-sm font-medium text-gray-800">Как вас зовут?</p>
        <p className="text-xs text-gray-500 mt-0.5">
          Оставьте контакт — мы ответим, если вы закроете чат.
        </p>
      </div>
      <form onSubmit={handleSubmit} className="space-y-3 flex-1">
        <div>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Ваше имя *"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        <div>
          <input
            type="text"
            value={contact}
            onChange={(e) => setContact(e.target.value)}
            placeholder="Телефон или e-mail"
            className="w-full px-3 py-2.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button
          type="submit"
          disabled={loading}
          className="w-full py-2.5 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors mt-2"
        >
          {loading ? "Начинаем..." : "Начать чат"}
        </button>
      </form>
    </div>
  );
}
