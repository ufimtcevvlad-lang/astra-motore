"use client";

import { useState } from "react";
import {
  formatRuPhoneInput,
  isValidRuPhone,
  normalizeRuPhone,
} from "../lib/phone";

function normalizeVin(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function VinRequestForm() {
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [vin, setVin] = useState("");
  const [car, setCar] = useState("");
  const [request, setRequest] = useState("");
  const [comment, setComment] = useState("");

  const [phoneTouched, setPhoneTouched] = useState(false);
  const phoneValid = isValidRuPhone(phone);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setPhoneTouched(true);

    const vinNorm = normalizeVin(vin);
    if (!isValidRuPhone(phone)) {
      setError("Введите корректный номер телефона");
      return;
    }
    if (vinNorm.length !== 17) {
      setError("VIN должен быть 17 символов (буквы/цифры)");
      return;
    }
    if (!name.trim() || !car.trim() || !request.trim()) {
      setError("Заполните имя, авто и что нужно подобрать");
      return;
    }

    setSending(true);
    try {
      const res = await fetch("/api/send-vin-request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizeRuPhone(phone),
          vin: vinNorm,
          car: car.trim(),
          request: request.trim(),
          comment: comment.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Не удалось отправить VIN-запрос");
        return;
      }

      setSent(true);
      setName("");
      setPhone("");
      setVin("");
      setCar("");
      setRequest("");
      setComment("");
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4">
      <h2 className="text-lg font-semibold">Оставить VIN-запрос</h2>

      {sent ? (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Заявка отправлена. Менеджер скоро свяжется с вами.
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinName">
            Имя *
          </label>
          <input
            id="vinName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Как к вам обращаться"
            required
            type="text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinPhone">
            Телефон *
          </label>
          <input
            id="vinPhone"
            value={phone}
            onChange={(e) => setPhone(formatRuPhoneInput(e.target.value))}
            onBlur={() => setPhoneTouched(true)}
            className={`w-full rounded-md border px-3 py-2 text-sm ${
              phoneTouched && !phoneValid ? "border-red-500 bg-red-50 text-red-900" : "border-slate-300"
            }`}
            placeholder="+7 (902) 254-01-11"
            required
            type="tel"
          />
          {phoneTouched && !phoneValid ? (
            <p className="mt-1 text-xs text-red-700">
              Введите номер в формате +7 (9XX) XXX-XX-XX
            </p>
          ) : null}
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinCode">
            VIN (17 символов) *
          </label>
          <input
            id="vinCode"
            value={vin}
            onChange={(e) => setVin(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Например: W0L0ZBF68D1012345"
            required
            type="text"
            inputMode="text"
            autoComplete="off"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinCar">
            Авто (марка/модель/год) *
          </label>
          <input
            id="vinCar"
            value={car}
            onChange={(e) => setCar(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Opel Astra H, 2008"
            required
            type="text"
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-700 mb-1"
            htmlFor="vinRequest"
          >
            Что нужно подобрать *
          </label>
          <input
            id="vinRequest"
            value={request}
            onChange={(e) => setRequest(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Например: тормозные колодки передние / по артикулу…"
            required
            type="text"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinComment">
            Комментарий (необязательно)
          </label>
          <textarea
            id="vinComment"
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            className="w-full min-h-[90px] rounded-md border border-slate-300 px-3 py-2 text-sm"
            placeholder="Можно указать старый артикул, фото/схему (если отправляете отдельно)…"
          />
        </div>

        <button
          type="submit"
          disabled={sending}
          className="w-full rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-60"
        >
          {sending ? "Отправляем..." : "Отправить запрос"}
        </button>
      </form>
    </div>
  );
}

