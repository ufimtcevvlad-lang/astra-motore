"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatRuPhoneInput, isValidRuPhone, normalizeRuPhone } from "../../lib/phone";
import { TurnstileField } from "../security/TurnstileField";

export function LoginForm() {
  const router = useRouter();
  const [loginMode, setLoginMode] = useState<"phone" | "email">("phone");
  const [login, setLogin] = useState("+7");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const phoneValid = loginMode === "phone" ? isValidRuPhone(login) : true;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    if (loginMode === "phone") {
      setPhoneTouched(true);
      if (!phoneValid) {
        setError("Введите корректный номер телефона");
        setSending(false);
        return;
      }
    }
    if (!consentPersonalData) {
      setError("Необходимо согласие на обработку персональных данных");
      setSending(false);
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Подтвердите проверку безопасности");
      setSending(false);
      return;
    }
    try {
      const payloadLogin =
        loginMode === "phone" ? normalizeRuPhone(login) : login.trim();
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ login: payloadLogin, password, rememberMe, consentPersonalData, turnstileToken }),
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
        <div className="grid grid-cols-2 rounded-md border border-slate-300 p-1">
          <button
            type="button"
            onClick={() => {
              setLoginMode("phone");
              setLogin("+7");
              setPhoneTouched(false);
            }}
            className={`rounded px-3 py-2 text-sm font-medium ${
              loginMode === "phone"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Телефон
          </button>
          <button
            type="button"
            onClick={() => {
              setLoginMode("email");
              setLogin("");
              setPhoneTouched(false);
            }}
            className={`rounded px-3 py-2 text-sm font-medium ${
              loginMode === "email"
                ? "bg-slate-900 text-white"
                : "text-slate-700 hover:bg-slate-100"
            }`}
          >
            Почта
          </button>
        </div>
        <div>
          <label htmlFor="login" className="block text-sm font-medium text-slate-700 mb-1">
            {loginMode === "phone" ? "Телефон" : "Email"}
          </label>
          <input
            id="login"
            type={loginMode === "phone" ? "tel" : "email"}
            required
            value={login}
            onChange={(e) =>
              setLogin(
                loginMode === "phone"
                  ? formatRuPhoneInput(e.target.value)
                  : e.target.value
              )
            }
            onBlur={() => {
              if (loginMode === "phone") setPhoneTouched(true);
            }}
            placeholder={loginMode === "phone" ? "+7 (___) ___-__-__" : "name@mail.ru"}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              loginMode === "phone" && phoneTouched && !phoneValid
                ? "border-red-500 bg-red-50 text-red-900"
                : "border-slate-300"
            }`}
          />
          {loginMode === "phone" && phoneTouched && !phoneValid && (
            <p className="mt-1 text-xs text-red-700">Введите номер в формате +7 (9XX) XXX-XX-XX</p>
          )}
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
        <label className="flex items-center gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={rememberMe}
            onChange={(e) => setRememberMe(e.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
          />
          Запомнить меня
        </label>
        <label className="flex items-start gap-2 text-sm text-slate-700">
          <input
            type="checkbox"
            checked={consentPersonalData}
            onChange={(e) => setConsentPersonalData(e.target.checked)}
            className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-600 focus:ring-amber-500"
            required
          />
          <span>
            Я согласен(а) на обработку персональных данных и ознакомлен(а) с{" "}
            <Link href="/privacy" className="text-amber-700 underline hover:text-amber-800">
              политикой обработки персональных данных
            </Link>
            .
          </span>
        </label>
        <TurnstileField onTokenChange={setTurnstileToken} />
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {sending ? "Входим..." : "Войти"}
        </button>
        <Link
          href="/auth/sms"
          className="block text-center text-sm font-medium text-amber-700 hover:underline"
        >
          Войти по SMS-коду
        </Link>
      </form>

      <div className="text-sm text-slate-600">
        Нет аккаунта?{" "}
        <Link href="/auth/register" className="font-medium text-amber-700 hover:underline">
          Регистрация
        </Link>
      </div>
    </div>
  );
}

