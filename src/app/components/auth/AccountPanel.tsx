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
  const [activeTab, setActiveTab] = useState<"profile" | "orders" | "podbory">("profile");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState("");
  const [isDark, setIsDark] = useState(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem("am-profile-theme") === "dark";
  });

  useEffect(() => {
    window.localStorage.setItem("am-profile-theme", isDark ? "dark" : "light");
    document.documentElement.setAttribute("data-theme", isDark ? "dark" : "light");
  }, [isDark]);

  useEffect(() => {
    let active = true;
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data: MeResponse) => {
        if (!active) return;
        setUser(data.user);
        const fullName = (data.user?.fullName ?? "").trim();
        const nameParts = fullName.split(/\s+/).filter(Boolean);
        setLastName(nameParts[0] ?? "");
        setFirstName(nameParts.length > 1 ? nameParts.slice(1).join(" ") : "");
        setEmail(data.user?.email ?? "");
        setPhone(data.user?.phone ?? "");
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

  const fullName = (user?.fullName ?? "").trim();
  const nameParts = fullName.split(/\s+/).filter(Boolean);
  const fallbackLastName = nameParts[0] ?? "";
  const fallbackFirstName = nameParts.length > 1 ? nameParts.slice(1).join(" ") : "";
  const shellClass = isDark ? "rounded-2xl bg-slate-950/70 p-1" : "";
  const panelClass = isDark
    ? "border-slate-700 bg-slate-900 text-slate-100 shadow-black/30"
    : "border-slate-200 bg-white text-slate-900";
  const mutedClass = isDark ? "text-slate-400" : "text-slate-500";
  const tabIdleClass = isDark ? "text-slate-300 hover:bg-slate-800" : "text-slate-700 hover:bg-slate-50";
  const tabActiveClass = isDark ? "bg-slate-800 font-semibold text-white" : "bg-slate-100 font-semibold text-slate-900";
  const inputClass = isDark
    ? "w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2.5 text-slate-100"
    : "w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 text-slate-900";

  const handleSaveProfile = async () => {
    setSaveMessage("");
    setError("");
    setSaving(true);
    try {
      const res = await fetch("/api/auth/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: firstName.trim() || fallbackFirstName,
          lastName: lastName.trim() || fallbackLastName,
          email: email.trim(),
          phone: phone.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось сохранить профиль");
        return;
      }
      setUser(data.user);
      setSaveMessage("Изменения сохранены");
    } catch {
      setError("Ошибка сети при сохранении профиля");
    } finally {
      setSaving(false);
    }
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
            className="inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
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
    <div className={shellClass}>
      <div className="grid gap-4 lg:grid-cols-[240px_minmax(0,1fr)]">
        <aside className={`h-fit rounded-2xl border p-3 shadow-sm ${panelClass}`}>
          <p className={`px-2 py-1 text-xs font-semibold uppercase tracking-wide ${mutedClass}`}>Кабинет</p>
          <div className="mt-2 rounded-lg border border-transparent p-2">
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium">Ночной режим</span>
              <button
                type="button"
                role="switch"
                aria-checked={isDark}
                onClick={() => setIsDark((v) => !v)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                  isDark ? "bg-amber-400" : "bg-slate-300"
                }`}
              >
                <span
                  className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${isDark ? "translate-x-5" : "translate-x-1"}`}
                />
              </button>
            </div>
            <p className={`mt-1 text-xs ${mutedClass}`}>По умолчанию — дневной режим.</p>
          </div>
        <div className="mt-2 space-y-1">
          <button
            type="button"
            onClick={() => setActiveTab("profile")}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              activeTab === "profile" ? tabActiveClass : tabIdleClass
            }`}
          >
            Профиль
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("orders")}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              activeTab === "orders" ? tabActiveClass : tabIdleClass
            }`}
          >
            Мои заказы
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("podbory")}
            className={`w-full rounded-lg px-3 py-2 text-left text-sm transition ${
              activeTab === "podbory" ? tabActiveClass : tabIdleClass
            }`}
          >
            Подборы
          </button>
        </div>
        <div className={`my-3 h-px ${isDark ? "bg-slate-700" : "bg-slate-200"}`} />
        <button
          type="button"
          onClick={logout}
          className="w-full rounded-lg px-3 py-2 text-left text-sm font-medium text-red-700 transition hover:bg-red-50"
        >
          Выйти
        </button>
        </aside>

      <section className={`rounded-2xl border p-5 shadow-sm sm:p-6 ${panelClass}`}>
        {activeTab === "profile" && (
          <>
            <h1 className="text-2xl font-bold">Профиль</h1>
            <p className={`mt-1 text-sm ${mutedClass}`}>Личные данные аккаунта</p>

            <div className="mt-6 grid gap-4 sm:grid-cols-2">
              <label className="text-sm">
                <span className={`mb-1 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Имя</span>
                <input
                  type="text"
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm">
                <span className={`mb-1 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Фамилия</span>
                <input
                  type="text"
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className={`mb-1 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Телефон</span>
                <input
                  type="text"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className={inputClass}
                />
              </label>
              <label className="text-sm sm:col-span-2">
                <span className={`mb-1 block ${isDark ? "text-slate-300" : "text-slate-600"}`}>Электронная почта</span>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={inputClass}
                />
              </label>
            </div>
            {(error || saveMessage) && (
              <p className={`mt-4 text-sm ${error ? "text-red-700" : isDark ? "text-emerald-300" : "text-emerald-700"}`}>
                {error || saveMessage}
              </p>
            )}

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className={`mt-6 inline-flex rounded-full px-6 py-2.5 text-sm font-semibold ${
                isDark
                  ? "bg-amber-500 text-slate-950 hover:bg-amber-400 disabled:bg-slate-700 disabled:text-slate-400"
                  : "bg-amber-600 text-white hover:bg-amber-700 disabled:bg-slate-200 disabled:text-slate-500"
              }`}
            >
              {saving ? "Сохраняем..." : "Сохранить"}
            </button>
          </>
        )}

        {activeTab === "orders" && (
          <>
            <h2 className="text-2xl font-bold">Мои заказы</h2>
            <p className={`mt-4 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Вы пока не оформили ни одного заказа.
            </p>
          </>
        )}

        {activeTab === "podbory" && (
          <>
            <h2 className="text-2xl font-bold">Подборы</h2>
            <p className={`mt-4 text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>
              Здесь появятся сохранённые подборы менеджера и рекомендации по совместимости деталей.
            </p>
          </>
        )}
      </section>
    </div>
    </div>
  );
}

