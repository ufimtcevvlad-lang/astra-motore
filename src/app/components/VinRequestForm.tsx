"use client";

import { useState } from "react";

function normalizeVin(value: string) {
  return value.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

export function VinRequestForm() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [vin, setVin] = useState("");
  const [brand, setBrand] = useState("");
  const [model, setModel] = useState("");
  const [modification, setModification] = useState("");
  const [year, setYear] = useState("");

  const [neededParts, setNeededParts] = useState("");
  const [comment, setComment] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const [emailTouched, setEmailTouched] = useState(false);
  const emailValid =
    email.trim().length > 0 &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());

  const [vinTouched, setVinTouched] = useState(false);

  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    const vinNorm = normalizeVin(vin);
    if (!name.trim() || !email.trim()) {
      setError("Заполните имя и email");
      return;
    }
    if (!emailValid) {
      setError("Введите корректный email");
      return;
    }
    if (vinTouched && vinNorm.length !== 17) {
      setError("VIN должен быть 17 символов (буквы/цифры)");
      return;
    }
    if (vinNorm.length !== 17) {
      setError("VIN должен быть 17 символов (буквы/цифры)");
      return;
    }

    if (!brand.trim() || !neededParts.trim()) {
      setError("Заполните марку и необходимые вам запчасти");
      return;
    }

    setSending(true);
    try {
      const fd = new FormData();
      fd.append("name", name.trim());
      fd.append("email", email.trim());
      fd.append("vin", vinNorm);
      fd.append("brand", brand.trim());
      fd.append("model", model.trim());
      fd.append("modification", modification.trim());
      fd.append("year", year.trim());
      fd.append("request", neededParts.trim());
      fd.append("comment", comment.trim());
      if (photo) {
        fd.append("photo", photo);
      }

      const res = await fetch("/api/send-vin-request", {
        method: "POST",
        body: fd,
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error || "Не удалось отправить VIN-запрос");
        return;
      }

      setSent(true);
      setName("");
      setEmail("");
      setVin("");
      setBrand("");
      setModel("");
      setModification("");
      setYear("");
      setNeededParts("");
      setComment("");
      setPhoto(null);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-sm font-semibold text-slate-800">Обратная связь</h2>

      {sent ? (
        <div className="rounded-md bg-amber-50 px-3 py-2 text-sm text-amber-900">
          Заявка отправлена. Менеджер скоро свяжется с вами.
        </div>
      ) : error ? (
        <div className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      ) : null}

      <form onSubmit={onSubmit} className="space-y-6">
        <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">

          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-1"
              htmlFor="vinName"
            >
              Ваше имя <span className="text-red-500">*</span>
            </label>
          <input
            id="vinName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            placeholder="Ваше имя"
            type="text"
            required
          />
          </div>

          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-1"
              htmlFor="vinEmail"
            >
              Email <span className="text-red-500">*</span>
            </label>
            <input
              id="vinEmail"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => setEmailTouched(true)}
              className={`w-full rounded-md border px-3 py-2 text-sm bg-white ${
                emailTouched && !emailValid ? "border-red-500 bg-red-50 text-red-900" : "border-slate-300"
              }`}
              placeholder="name@mail.ru"
              type="email"
              required
              autoComplete="email"
            />
            {emailTouched && !emailValid ? (
              <p className="mt-1 text-xs text-red-700">Введите корректный email</p>
            ) : null}
          </div>
        </div>

        <div className="space-y-4">
          <div className="text-sm font-semibold text-slate-800">Данные об автомобиле</div>
          <div className="space-y-4 rounded-lg border border-slate-200 bg-slate-50 p-4">

          <div>
            <label
              className="block text-sm font-medium text-slate-700 mb-1"
              htmlFor="vinCode"
            >
              VIN <span className="text-red-500">*</span>
            </label>
            <input
              id="vinCode"
              value={vin}
              onChange={(e) => setVin(e.target.value)}
              onBlur={() => setVinTouched(true)}
              className={`w-full rounded-md border px-3 py-2 text-sm bg-white ${
                vinTouched && normalizeVin(vin).length !== 17
                  ? "border-red-500 bg-red-50 text-red-900"
                  : "border-slate-300"
              }`}
              placeholder="Введите VIN код"
              type="text"
              inputMode="text"
              autoComplete="off"
              required
            />
            <p className="mt-1 text-xs text-slate-500">Поле не должно быть пустым</p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinBrand">
                Марка <span className="text-red-500">*</span>
              </label>
              <input
                id="vinBrand"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: Opel"
                required
                type="text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinModel">
                Модель
              </label>
              <input
                id="vinModel"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: Astra H"
                type="text"
              />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="block text-sm font-medium text-slate-700 mb-1"
                htmlFor="vinModification"
              >
                Модификация
              </label>
              <input
                id="vinModification"
                value={modification}
                onChange={(e) => setModification(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: 1.6 (X16XER)"
                type="text"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinYear">
                Год
              </label>
              <input
                id="vinYear"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: 2008"
                type="text"
              />
            </div>
          </div>
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <div className="text-sm font-semibold text-slate-800">
            Необходимые вам запчасти <span className="text-red-500">*</span>
          </div>
          <textarea
            id="vinRequest"
            value={neededParts}
            onChange={(e) => setNeededParts(e.target.value)}
            className="w-full min-h-[120px] rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
            placeholder="Укажите, что нужно подобрать (например: тормозные колодки передние по VIN)"
            required
          />
        </div>

        <div>
          <label
            className="block text-sm font-medium text-slate-700 mb-1"
            htmlFor="vinComment"
          >
            Комментарий (необязательно)
          </label>
          <div className="relative">
            <textarea
              id="vinComment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              className="w-full min-h-[110px] rounded-md border border-slate-300 px-3 py-2 pb-9 text-sm bg-white"
              placeholder="Можно указать старый артикул, фото/схему (если отправляете отдельно)…"
            />

            <input
              id="vinPhoto"
              type="file"
              accept="image/*"
              onChange={(e) => setPhoto(e.target.files?.[0] ?? null)}
              className="hidden"
            />
            <label
              htmlFor="vinPhoto"
              className="absolute bottom-2 left-3 cursor-pointer text-sm font-semibold text-slate-600 transition-colors hover:text-blue-600 hover:underline"
            >
              Прикрепить фото
            </label>
          </div>
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

