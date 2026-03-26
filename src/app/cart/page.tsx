"use client";

import Link from "next/link";
import { useState } from "react";
import { useCart } from "../components/CartContext";
import { formatRuPhoneInput, isValidRuPhone, normalizeRuPhone } from "../lib/phone";

export default function CartPage() {
  const { items, removeFromCart, clearCart } = useCart();
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const phoneValid = isValidRuPhone(phone);

  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneTouched(true);
    if (!phoneValid) {
      setError("Введите корректный номер телефона");
      return;
    }
    if (!consentPersonalData) {
      setError("Нужно согласие на обработку персональных данных");
      return;
    }
    setSending(true);
    try {
      const res = await fetch("/api/send-order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          phone: normalizeRuPhone(phone),
          comment: comment.trim(),
          items: items.map((i) => ({
            name: i.product.name,
            quantity: i.quantity,
            price: i.product.price,
            sum: i.product.price * i.quantity,
          })),
          total,
          consentPersonalData,
          consentMarketing,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Не удалось отправить заказ");
        return;
      }
      setSent(true);
      clearCart();
      setName("");
      setPhone("");
      setComment("");
      setConsentPersonalData(false);
      setConsentMarketing(false);
    } catch {
      setError("Ошибка сети. Проверьте интернет и попробуйте снова.");
    } finally {
      setSending(false);
    }
  };

  if (items.length === 0 && !sent) {
    return (
      <div className="rounded-xl border border-amber-100 bg-white p-8 text-center shadow-sm">
        <p className="text-slate-600">Корзина пуста.</p>
        <Link
          href="/catalog"
          className="mt-4 inline-block font-medium text-amber-600 hover:text-amber-700"
        >
          Перейти в каталог
        </Link>
      </div>
    );
  }

  if (sent) {
    return (
      <div className="rounded-xl border border-amber-100 bg-white p-8 text-center shadow-sm">
        <p className="text-lg font-bold text-amber-700">Заказ принят!</p>
        <p className="mt-2 text-slate-600">
          Менеджер <span className="font-medium text-amber-700">Astra Motors</span> свяжется с вами в ближайшее время.
        </p>
        <Link
          href="/catalog"
          className="mt-4 inline-block font-medium text-amber-600 hover:text-amber-700"
        >
          Вернуться в каталог
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="text-xl font-semibold">Корзина</h1>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.product.id}
            className="flex flex-wrap items-center justify-between gap-4 rounded-lg border border-slate-200 bg-white p-4"
          >
            <div>
              <p className="font-medium">{item.product.name}</p>
              <p className="text-sm text-slate-500">
                {item.product.brand} • {item.product.price.toLocaleString("ru-RU")} ₽ × {item.quantity}
              </p>
            </div>
            <div className="flex items-center gap-3">
              <p className="font-semibold text-amber-600">
                {(item.product.price * item.quantity).toLocaleString("ru-RU")} ₽
              </p>
              <button
                onClick={() => removeFromCart(item.product.id)}
                className="rounded bg-red-100 px-2 py-1 text-sm text-red-700 hover:bg-red-200"
              >
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-col gap-4 rounded-lg border border-slate-200 bg-white p-4 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-lg font-semibold">
          Итого: <span className="text-amber-600 font-bold">{total.toLocaleString("ru-RU")} ₽</span>
        </p>
        <div className="flex gap-2">
          <button
            onClick={clearCart}
            className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Очистить корзину
          </button>
          <button
            onClick={() => setShowForm(true)}
            className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 shadow-sm"
          >
            Оформить заказ
          </button>
        </div>
      </div>

      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-lg border border-slate-200 bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold">Ваши данные для связи</h2>
          {error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700">
              {error}
            </p>
          )}
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-slate-700 mb-1">
              Имя *
            </label>
            <input
              id="name"
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Как к вам обращаться"
            />
          </div>
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-slate-700 mb-1">
              Телефон *
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
              placeholder="+7 (902) 254-01-11"
            />
            {phoneTouched && !phoneValid && (
              <p className="mt-1 text-xs text-red-700">Введите номер в формате +7 (9XX) XXX-XX-XX</p>
            )}
          </div>
          <div>
            <label htmlFor="comment" className="block text-sm font-medium text-slate-700 mb-1">
              Комментарий к заказу
            </label>
            <textarea
              id="comment"
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              rows={3}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
              placeholder="Марка и модель авто, удобное время для звонка..."
            />
          </div>
          <div className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-3">
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
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="rounded-md border border-slate-300 px-4 py-2 text-sm text-slate-700 hover:bg-slate-50"
            >
              Отмена
            </button>
            <button
              type="submit"
              disabled={sending}
              className="rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 shadow-sm"
            >
              {sending ? "Отправка…" : "Отправить заказ"}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
