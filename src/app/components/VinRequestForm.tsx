"use client";

import Image from "next/image";
import Link from "next/link";
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
  const [engine, setEngine] = useState("");
  const [transmission, setTransmission] = useState("");
  const [year, setYear] = useState("");
  const [body, setBody] = useState("");

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
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);

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
    if (!consentPersonalData) {
      setError("Нужно согласие на обработку персональных данных");
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
      fd.append("engine", engine.trim());
      fd.append("transmission", transmission.trim());
      fd.append("year", year.trim());
      fd.append("body", body.trim());
      fd.append("request", neededParts.trim());
      fd.append("comment", comment.trim());
      fd.append("consentPersonalData", String(consentPersonalData));
      fd.append("consentMarketing", String(consentMarketing));
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
      setEngine("");
      setTransmission("");
      setYear("");
      setBody("");
      setNeededParts("");
      setComment("");
      setPhoto(null);
      setConsentPersonalData(false);
      setConsentMarketing(false);
    } catch {
      setError("Ошибка сети. Попробуйте ещё раз.");
    } finally {
      setSending(false);
    }
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
      <h2 className="text-base font-semibold text-slate-800 sm:text-lg">Обратная связь</h2>

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
          <div className="text-base font-semibold text-slate-800 sm:text-lg">Данные об автомобиле</div>
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
            <div className="mt-1 flex items-center gap-3">
              <p className="text-xs text-slate-500">Поле не должно быть пустым</p>
              <div className="group relative">
                <button
                  type="button"
                  className="text-xs font-medium text-amber-700 underline decoration-dotted underline-offset-2 hover:text-amber-800 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/40 rounded"
                >
                  Где взять VIN код?
                </button>
                <div className="pointer-events-none absolute left-0 top-full z-20 mt-2 hidden w-[300px] rounded-lg border border-slate-200 bg-white p-3 text-xs text-slate-700 shadow-xl group-hover:block group-focus-within:block">
                  <p className="font-semibold text-slate-900">Где смотреть VIN:</p>
                  <ul className="mt-1 space-y-1">
                    <li>• В СТС: строка «Идентификационный номер (VIN)».</li>
                    <li>• В ПТС: раздел с основными данными автомобиля.</li>
                    <li>• На кузове: под лобовым стеклом или на стойке двери.</li>
                  </ul>
                  <div className="mt-2 overflow-hidden rounded-md border border-slate-200 bg-slate-100">
                    <Image
                      src="/images/vin-sts-highlight.png"
                      alt="Пример в СТС: выделенная строка VIN"
                      width={236}
                      height={180}
                      className="h-auto w-full"
                    />
                  </div>
                  <p className="mt-2 text-[11px] text-slate-500">
                    VIN состоит из 17 символов (латинские буквы и цифры).
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinBrand">
                Марка <span className="text-red-500">*</span>
              </label>
              <input
                id="vinBrand"
                list="vinBrandSuggestions"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: Opel"
                required
                type="text"
              />
              <datalist id="vinBrandSuggestions">
                <option value="Opel" />
                <option value="Chevrolet" />
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinModel">
                Модель
              </label>
              <input
                id="vinModel"
                list="vinModelSuggestions"
                value={model}
                onChange={(e) => setModel(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: Astra H"
                type="text"
              />
              <datalist id="vinModelSuggestions">
                <option value="Astra H" />
                <option value="Astra J" />
                <option value="Cruze" />
                <option value="Aveo" />
                <option value="Corsa D" />
                <option value="Mokka" />
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                className="block text-sm font-medium text-slate-700 mb-1"
                htmlFor="vinEngine"
              >
                Мотор
              </label>
              <input
                id="vinEngine"
                list="vinEngineSuggestions"
                value={engine}
                onChange={(e) => setEngine(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: 1.6 (X16XER)"
                type="text"
              />
              <datalist id="vinEngineSuggestions">
                <option value="1.4 Turbo (A14NET)" />
                <option value="1.6 (X16XER)" />
                <option value="1.8 (Z18XER)" />
                <option value="2.0 (X20XEV)" />
                <option value="1.7 CDTI" />
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinTransmission">
                Коробка
              </label>
              <input
                id="vinTransmission"
                list="vinTransmissionSuggestions"
                value={transmission}
                onChange={(e) => setTransmission(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: АКПП 6"
                type="text"
              />
              <datalist id="vinTransmissionSuggestions">
                <option value="МКПП 5" />
                <option value="МКПП 6" />
                <option value="АКПП 4" />
                <option value="АКПП 6" />
                <option value="Робот" />
                <option value="CVT" />
              </datalist>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinYear">
                Год выпуска
              </label>
              <input
                id="vinYear"
                list="vinYearSuggestions"
                value={year}
                onChange={(e) => setYear(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: 2008"
                type="text"
              />
              <datalist id="vinYearSuggestions">
                <option value="2005" />
                <option value="2008" />
                <option value="2010" />
                <option value="2012" />
                <option value="2015" />
                <option value="2018" />
                <option value="2020" />
              </datalist>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1" htmlFor="vinBody">
                Кузов
              </label>
              <input
                id="vinBody"
                list="vinBodySuggestions"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm bg-white"
                placeholder="Например: Хэтчбек 5 дв."
                type="text"
              />
              <datalist id="vinBodySuggestions">
                <option value="Седан" />
                <option value="Хэтчбек 3 дв." />
                <option value="Хэтчбек 5 дв." />
                <option value="Универсал" />
                <option value="Кроссовер" />
                <option value="Минивэн" />
              </datalist>
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
              className="absolute bottom-2 left-3 cursor-pointer text-sm font-semibold text-amber-700 transition-colors hover:text-amber-800 hover:underline"
            >
              Прикрепить фото
            </label>
          </div>
        </div>

        <div className="space-y-2 rounded-lg border border-slate-200 bg-slate-50 p-4">
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consentPersonalData}
              onChange={(e) => setConsentPersonalData(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
              required
            />
            <span>
              Я согласен(а) на{" "}
              <Link href="/consent-personal-data" className="text-amber-700 underline hover:text-amber-800">
                обработку персональных данных
              </Link>{" "}
              и ознакомлен(а) с{" "}
              <Link href="/privacy" className="text-amber-700 underline hover:text-amber-800">
                Политикой ПДн
              </Link>
              .
            </span>
          </label>
          <label className="flex items-start gap-2 text-sm text-slate-700">
            <input
              type="checkbox"
              checked={consentMarketing}
              onChange={(e) => setConsentMarketing(e.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300"
            />
            <span>Согласен(а) на получение информационных сообщений (необязательно).</span>
          </label>
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

