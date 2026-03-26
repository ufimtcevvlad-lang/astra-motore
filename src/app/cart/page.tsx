"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "../components/CartContext";
import { TurnstileField } from "../components/security/TurnstileField";
import { products } from "../data/products";
import { formatRuPhoneInput, isValidRuPhone, normalizeRuPhone } from "../lib/phone";

export default function CartPage() {
  const { items, addToCart, removeFromCart, clearCart, increaseQuantity, decreaseQuantity } = useCart();
  const [showForm, setShowForm] = useState(false);
  const [sent, setSent] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "courier">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"sbp" | "card" | "cash">("sbp");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const phoneValid = isValidRuPhone(phone);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const recommendations = useMemo(() => {
    const cartIds = new Set(items.map((i) => i.product.id));
    const cartCategories = new Set(items.map((i) => i.product.category));
    return products
      .filter((p) => !cartIds.has(p.id))
      .sort((a, b) => {
        const aScore = cartCategories.has(a.category) ? 0 : 1;
        const bScore = cartCategories.has(b.category) ? 0 : 1;
        if (aScore !== bScore) return aScore - bScore;
        return a.price - b.price;
      })
      .slice(0, 6);
  }, [items]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setPhoneTouched(true);
    if (!phoneValid) {
      setError("Введите корректный номер телефона");
      return;
    }
    if (!consentPersonalData) {
      setError("Необходимо согласие на обработку персональных данных");
      return;
    }
    if (process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY && !turnstileToken) {
      setError("Подтвердите проверку безопасности");
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
          turnstileToken,
          deliveryMethod,
          paymentMethod,
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
        <h1 className="text-xl font-semibold">Корзина</h1>
        <p className="mt-3 text-slate-600">Пока нет выбранных товаров.</p>
        <Link
          href="/catalog"
          className="mt-5 inline-flex rounded-lg bg-amber-600 px-4 py-2 text-sm font-medium text-white hover:bg-amber-700"
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
      <h1 className="text-2xl font-semibold">Корзина</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          {items.map((item) => (
            <article
              key={item.product.id}
              className="flex gap-3 rounded-xl border border-slate-200 bg-white p-3 shadow-sm sm:gap-4 sm:p-4"
            >
              <div className="h-20 w-20 shrink-0 overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                <Image
                  src={item.product.image}
                  alt={item.product.name}
                  width={80}
                  height={80}
                  className="h-full w-full object-cover"
                />
              </div>
              <div className="min-w-0 flex-1 space-y-2">
                <p className="line-clamp-2 text-sm font-semibold text-slate-900 sm:text-base">{item.product.name}</p>
                <p className="text-xs text-slate-500">
                  Арт. {item.product.sku} · {item.product.brand}
                </p>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="inline-flex items-center rounded-lg border border-slate-200">
                    <button
                      type="button"
                      onClick={() => decreaseQuantity(item.product.id)}
                      className="inline-flex h-11 w-11 items-center justify-center text-lg text-slate-700 hover:bg-slate-50"
                      aria-label="Уменьшить количество"
                    >
                      −
                    </button>
                    <span className="inline-flex min-w-10 items-center justify-center text-sm font-medium text-slate-900">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => increaseQuantity(item.product.id)}
                      className="inline-flex h-11 w-11 items-center justify-center text-lg text-slate-700 hover:bg-slate-50"
                      aria-label="Увеличить количество"
                    >
                      +
                    </button>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-slate-500">{item.product.price.toLocaleString("ru-RU")} ₽ / шт.</p>
                    <p className="text-base font-semibold text-amber-700">
                      {(item.product.price * item.quantity).toLocaleString("ru-RU")} ₽
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => removeFromCart(item.product.id)}
                  className="text-xs font-medium text-red-700 hover:underline"
                >
                  Удалить
                </button>
              </div>
            </article>
          ))}

          <div className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-lg font-semibold">Рекомендуем добавить</h2>
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {recommendations.map((p) => (
                <article key={p.id} className="rounded-lg border border-slate-200 p-3">
                  <p className="line-clamp-2 text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-700">{p.price.toLocaleString("ru-RU")} ₽</p>
                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-md border border-amber-300 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Добавить
                  </button>
                </article>
              ))}
            </div>
          </div>

          {showForm && (
            <form
              onSubmit={handleSubmit}
              className="rounded-xl border border-slate-200 bg-white p-6 shadow-sm space-y-4"
            >
              <h2 className="text-lg font-semibold">Оформление заказа</h2>
              <div className="grid gap-2 sm:grid-cols-2">
                <label className="rounded-lg border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === "pickup"}
                    onChange={() => setDeliveryMethod("pickup")}
                    className="mr-2"
                  />
                  Самовывоз
                </label>
                <label className="rounded-lg border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="delivery"
                    checked={deliveryMethod === "courier"}
                    onChange={() => setDeliveryMethod("courier")}
                    className="mr-2"
                  />
                  Доставка
                </label>
              </div>
              <div className="grid gap-2 sm:grid-cols-3">
                <label className="rounded-lg border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "sbp"}
                    onChange={() => setPaymentMethod("sbp")}
                    className="mr-2"
                  />
                  СБП
                </label>
                <label className="rounded-lg border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "card"}
                    onChange={() => setPaymentMethod("card")}
                    className="mr-2"
                  />
                  Карта
                </label>
                <label className="rounded-lg border border-slate-200 p-3 text-sm">
                  <input
                    type="radio"
                    name="payment"
                    checked={paymentMethod === "cash"}
                    onChange={() => setPaymentMethod("cash")}
                    className="mr-2"
                  />
                  При получении
                </label>
              </div>

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
                  Политикой обработки персональных данных
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
          <TurnstileField onTokenChange={setTurnstileToken} />
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

        <aside className="lg:sticky lg:top-24">
          <div className="rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-xl font-semibold text-slate-900">Итого</h2>
            <div className="mt-4 space-y-2 text-sm text-slate-600">
              <div className="flex items-center justify-between">
                <span>Товаров</span>
                <span>{totalItems}</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Сумма</span>
                <span>{total.toLocaleString("ru-RU")} ₽</span>
              </div>
              <div className="flex items-center justify-between">
                <span>Доставка</span>
                <span>{deliveryMethod === "pickup" ? "0 ₽" : "Уточним"}</span>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="flex items-center justify-between text-lg font-semibold">
                <span>К оплате</span>
                <span className="text-amber-700">{total.toLocaleString("ru-RU")} ₽</span>
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <button
                type="button"
                onClick={() => setShowForm(true)}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700"
              >
                Перейти к оформлению
              </button>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50"
              >
                Очистить корзину
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
