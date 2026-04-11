"use client";

import { Suspense, useState, FormEvent, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import Link from "next/link";

function VerifyForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const adminId = searchParams.get("id");

  const [code, setCode] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!adminId) {
      router.replace("/admin/login");
    }
  }, [adminId, router]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/admin/auth/2fa", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId: Number(adminId), code }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Неверный код");
        return;
      }

      router.push("/admin");
    } catch {
      setError("Сетевая ошибка. Попробуйте снова.");
    } finally {
      setLoading(false);
    }
  }

  function handleCodeChange(value: string) {
    // Only digits, max 6 chars
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setCode(digits);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label htmlFor="code" className="block text-sm font-medium text-gray-700 mb-1">
          Код подтверждения
        </label>
        <input
          id="code"
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          required
          value={code}
          onChange={(e) => handleCodeChange(e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent tracking-widest text-center text-lg font-mono"
          placeholder="000000"
          maxLength={6}
        />
      </div>

      {error && (
        <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={loading || code.length !== 6}
        className="w-full py-2.5 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white text-sm font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
      >
        {loading ? "Проверка..." : "Подтвердить"}
      </button>
    </form>
  );
}

export default function AdminLoginVerifyPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <Image
            src="/brand/gm-shop-logo-header.png"
            alt="GM Shop"
            width={120}
            height={40}
            className="h-10 w-auto object-contain"
          />
        </div>

        <h1 className="text-xl font-semibold text-gray-900 text-center mb-1">
          Двухфакторная аутентификация
        </h1>
        <p className="text-sm text-gray-500 text-center mb-6">
          Введите 6-значный код из Telegram
        </p>

        <Suspense fallback={<div className="text-center text-gray-400 text-sm py-4">Загрузка...</div>}>
          <VerifyForm />
        </Suspense>

        <div className="mt-5 text-center">
          <Link
            href="/admin/login"
            className="text-sm text-gray-500 hover:text-gray-700 underline underline-offset-2"
          >
            Назад к входу
          </Link>
        </div>
      </div>
    </div>
  );
}
