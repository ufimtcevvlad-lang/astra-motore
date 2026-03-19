"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { formatRuPhoneInput, isValidRuPhone, normalizeRuPhone } from "../../lib/phone";

export function SmsLoginForm() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [codeRequested, setCodeRequested] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValid = isValidRuPhone(phone);

  const requestCode = async () => {
    setSending(true);
    setError("");
    setInfo("");
    setPhoneTouched(true);
    if (!phoneValid) {
      setError("Введите корректный номер телефона");
      setSending(false);
      return;
    }
    try {
      const res = await fetch("/api/auth/sms/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeRuPhone(phone) }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Не удалось отправить код");
        return;
      }
      setCodeRequested(true);
      setInfo(
        data?.devCode
          ? `Код создан (dev): ${data.devCode}`
          : "Код отправлен. Введите его ниже."
      );
    } catch {
      setError("Ошибка сети. Попробуйте еще раз.");
    } finally {
      setSending(false);
    }
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setSending(true);
    setError("");
    try {
      const res = await fetch("/api/auth/sms/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone: normalizeRuPhone(phone), code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data?.error || "Неверный код");
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
        <h1 className="text-2xl font-bold text-slate-900">Вход по SMS</h1>
        <p className="mt-1 text-sm text-slate-600">
          Введите телефон, получите код и подтвердите вход.
        </p>
      </div>

      {error && <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}
      {info && <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{info}</p>}

      <div className="space-y-4">
        <div>
          <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
            Телефон
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(formatRuPhoneInput(e.target.value))}
            onBlur={() => setPhoneTouched(true)}
            required
            placeholder="+7 (___) ___-__-__"
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              phoneTouched && !phoneValid
                ? "border-red-500 bg-red-50 text-red-900"
                : "border-slate-300"
            }`}
          />
          {phoneTouched && !phoneValid && (
            <p className="mt-1 text-xs text-red-700">Введите номер в формате +7 (9XX) XXX-XX-XX</p>
          )}
        </div>
        <button
          type="button"
          onClick={requestCode}
          disabled={sending || !phoneValid}
          className="w-full rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-800 hover:bg-slate-50 disabled:opacity-60"
        >
          {sending ? "Отправляем..." : "Получить код"}
        </button>
      </div>

      {codeRequested && (
        <form onSubmit={verifyCode} className="space-y-4">
          <div>
            <label htmlFor="code" className="block text-sm font-medium text-slate-700 mb-1">
              Код из SMS
            </label>
            <input
              id="code"
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              required
              placeholder="6 цифр"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            />
          </div>
          <button
            type="submit"
            disabled={sending || !code.trim()}
            className="w-full rounded-lg bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-700 disabled:opacity-60"
          >
            {sending ? "Проверяем..." : "Войти"}
          </button>
        </form>
      )}
    </div>
  );
}

