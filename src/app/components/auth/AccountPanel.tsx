"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type MeResponse = {
  user: null | {
    id: string;
    fullName: string;
    email: string;
    phone: string;
    createdAt: string;
  };
};

export function AccountPanel() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<MeResponse["user"]>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => {
        if (!active) return;
        setUser(data.user);
      })
      .catch(() => {
        if (!active) return;
        setError("Не удалось загрузить профиль");
      })
      .finally(() => {
        if (!active) return;
        setLoading(false);
      });
    return () => {
      active = false;
    };
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/auth/login");
    router.refresh();
  };

  if (loading) {
    return (
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <p className="text-slate-600">Загружаем личный кабинет...</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="space-y-4">
        <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-bold text-slate-900">Личный кабинет</h1>
          <p className="mt-2 text-slate-600">Вы не авторизованы. Войдите или зарегистрируйтесь.</p>
          {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
        </div>
        <div className="flex gap-2">
          <Link
            href="/auth/login"
            className="inline-flex rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white hover:bg-rose-700"
          >
            Войти
          </Link>
          <Link
            href="/auth/register"
            className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
          >
            Регистрация
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-2xl font-bold text-slate-900">Личный кабинет</h1>
        <p className="mt-2 text-slate-600">Добро пожаловать, {user.fullName}.</p>
        <div className="mt-4 grid gap-2 text-sm text-slate-700">
          <p>
            <span className="font-medium">Email:</span> {user.email}
          </p>
          <p>
            <span className="font-medium">Телефон:</span> {user.phone}
          </p>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">История заказов</h2>
          <p className="mt-2 text-sm text-slate-600">
            На следующем этапе здесь появятся ваши заказы, их статусы и кнопка «Повторить заказ».
          </p>
        </section>

        <section className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
          <h2 className="font-semibold text-slate-900">Мои автомобили (VIN)</h2>
          <p className="mt-2 text-sm text-slate-600">
            На следующем этапе здесь появится гараж автомобилей и история VIN-поиска.
          </p>
        </section>
      </div>

      <button
        type="button"
        onClick={logout}
        className="inline-flex rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50"
      >
        Выйти
      </button>
    </div>
  );
}

