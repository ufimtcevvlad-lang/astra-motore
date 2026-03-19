"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export function LoginForm() {
  const router = useRouter();
  const [login, setLogin] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login, password }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Не удалось выполнить вход");
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

  return (
    <div className="mx-auto max-w-md rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-5">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Войти</h1>
        <p className="mt-1 text-sm text-slate-600">Войдите по email или телефону и паролю.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
        <div>
          <label htmlFor="login" className="block text-sm font-medium text-slate-700 mb-1">
            Email или телефон
          </label>
          <input
            id="login"
            type="text"
            required
            value={login}
            onChange={(e) => setLogin(e.target.value)}
            placeholder="name@mail.ru или +7..."
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
            placeholder="Введите пароль"
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
          />
        </div>
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
        >
          {sending ? "Входим..." : "Войти"}
        </button>
        <Link
          href="/auth/sms"
          className="block text-center text-sm font-medium text-sky-700 hover:underline"
        >
          Войти по SMS-коду
        </Link>
      </form>

      <div className="space-y-2">
        <Link
          href="/api/auth/social/vk/start"
          className="inline-flex w-full justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Войти через VK
        </Link>
        <Link
          href="/auth/telegram"
          className="inline-flex w-full justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
        >
          Войти через Telegram
        </Link>
      </div>

      <div className="text-sm text-slate-600">
        Нет аккаунта?{" "}
        <Link href="/auth/register" className="font-medium text-sky-700 hover:underline">
          Регистрация
        </Link>
      </div>
    </div>
  );
}

