"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatRuPhoneInput, isValidRuPhone, normalizeRuPhone } from "../../lib/phone";
import { TurnstileField } from "../security/TurnstileField";

export function RegisterForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const phoneValid = isValidRuPhone(phone);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    setPhoneTouched(true);
    if (!phoneValid) {
      setError("Введите корректный номер телефона");
      setSending(false);
      return;
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
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone: normalizeRuPhone(phone),
          password,
          consentPersonalData,
          consentMarketing,
          turnstileToken,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Не удалось зарегистрироваться");
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
        <h1 className="text-2xl font-bold text-slate-900">Регистрация</h1>
        <p className="mt-1 text-sm text-slate-600">Создайте аккаунт для истории заказов и личного кабинета.</p>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
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
            placeholder="Иванов Иван Иванович"
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
            placeholder="name@mail.ru"
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
            onChange={(e) => setPhone(formatRuPhoneInput(e.target.value))}
            onBlur={() => setPhoneTouched(true)}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              phoneTouched && !phoneValid
                ? "border-red-500 bg-red-50 text-red-900"
                : "border-slate-300"
            }`}
            placeholder="+7 (___) ___-__-__"
          />
          {phoneTouched && !phoneValid && (
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
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Не менее 8 символов"
          />
        </div>
        <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consentPersonalData}
              onChange={(e) => setConsentPersonalData(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-500"
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
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consentMarketing}
              onChange={(e) => setConsentMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 accent-amber-500"
            />
            <span>Согласен(а) на получение информационных сообщений (необязательно).</span>
          </label>
        </div>
        <TurnstileField onTokenChange={setTurnstileToken} />
        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {sending ? "Создаем аккаунт..." : "Зарегистрироваться"}
        </button>
      </form>

      <div className="text-sm text-slate-600">
        Уже есть аккаунт?{" "}
        <Link href="/auth/login" className="font-medium text-amber-700 hover:underline">
          Войти
        </Link>
      </div>
    </div>
  );
}

