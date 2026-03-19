"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Pending = {
  provider: "vk" | "telegram";
  providerUserId: string;
  fullName?: string;
  email?: string;
};

export function SocialCompleteForm() {
  const router = useRouter();
  const [pending, setPending] = useState<Pending | null>(null);
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch("/api/auth/social/pending")
      .then((res) => res.json())
      .then((data) => {
        const p = (data?.pending || null) as Pending | null;
        setPending(p);
        if (p?.fullName) setFullName(p.fullName);
        if (p?.email) setEmail(p.email);
      })
      .catch(() => setError("Не удалось загрузить данные соцвхода"))
      .finally(() => setLoading(false));
  }, []);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/social/complete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fullName, email, phone, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Не удалось завершить регистрацию");
        return;
      }
      router.push("/account");
      router.refresh();
    } catch {
      setError("Ошибка сети. Попробуйте еще раз.");
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return <p className="text-slate-600">Загрузка...</p>;
  }

  if (!pending) {
    return <p className="text-red-700">Социальная сессия истекла. Повторите вход через VK или Telegram.</p>;
  }

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Завершите регистрацию</h1>
        <p className="mt-1 text-sm text-slate-600">
          Вход через {pending.provider === "vk" ? "VK" : "Telegram"} подтвержден. Для личного кабинета заполните обязательные поля.
        </p>
      </div>
      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label htmlFor="fullName" className="block text-sm font-medium text-slate-700 mb-1">
            ФИО
          </label>
          <input
            id="fullName"
            type="text"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-slate-700 mb-1">
            Email
          </label>
          <input
            id="email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Телефон
          </label>
          <input
            id="phone"
            type="tel"
            required
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <div>
          <label htmlFor="password" className="block text-sm font-medium text-slate-700 mb-1">
            Пароль
          </label>
          <input
            id="password"
            type="password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Минимум 8 символов"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {sending ? "Сохраняем..." : "Завершить регистрацию"}
        </button>
      </form>
    </div>
  );
}

