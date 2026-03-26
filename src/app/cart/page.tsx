"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";
import { useCart } from "../components/CartContext";
import { TurnstileField } from "../components/security/TurnstileField";
import { products } from "../data/products";
import { formatRuPhoneInput, isValidRuPhone, normalizeRuPhone } from "../lib/phone";

function Widget({
  title,
  children,
  subtle = false,
}: {
  title: string;
  children: React.ReactNode;
  subtle?: boolean;
}) {
  return (
    <section
      className={`rounded-2xl border p-5 shadow-sm ${
        subtle ? "border-slate-200 bg-slate-50/60" : "border-slate-200 bg-white"
      }`}
    >
      <h2 className="text-lg font-semibold text-slate-900">{title}</h2>
      <div className="mt-4">{children}</div>
    </section>
  );
}

export default function CartPage() {
  const { items, addToCart, removeFromCart, clearCart, setItemQuantity, increaseQuantity, decreaseQuantity } = useCart();
  const [sent, setSent] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<"pickup" | "courier">("pickup");
  const [paymentMethod, setPaymentMethod] = useState<"sbp" | "card" | "cash">("sbp");
  const pickupPoints = [
    { id: "p1", name: "Astra Motors, ул. Готвальда, 9", note: "Пн–Пт 10:00–20:00, Сб–Вс 10:00–18:00" },
  ] as const;
  const [pickupPointId, setPickupPointId] = useState<(typeof pickupPoints)[number]["id"]>(pickupPoints[0].id);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [comment, setComment] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [consentPersonalData, setConsentPersonalData] = useState(false);
  const [consentMarketing, setConsentMarketing] = useState(false);
  const [turnstileToken, setTurnstileToken] = useState("");
  const [deliveryCity, setDeliveryCity] = useState("");
  const [deliveryQuoteLoading, setDeliveryQuoteLoading] = useState(false);
  const [deliveryQuote, setDeliveryQuote] = useState<{
    tariffCode: number;
    tariffName: string;
    deliverySum: number;
    periodMin: number | null;
    periodMax: number | null;
  } | null>(null);
  const [pickupPointsCdekLoading, setPickupPointsCdekLoading] = useState(false);
  const [pickupPointsCdek, setPickupPointsCdek] = useState<
    Array<{ code: string; name: string; city: string; address: string; workTime: string }>
  >([]);
  const [selectedCdekPointCode, setSelectedCdekPointCode] = useState("");
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
  const deliveryCost = deliveryMethod === "pickup" ? 0 : deliveryQuote?.deliverySum ?? 0;
  const totalWithDelivery = total + deliveryCost;

  const calculateCdekDelivery = async () => {
    if (!deliveryCity.trim()) {
      setError("Укажите город доставки для расчета СДЭК");
      return;
    }

    setError("");
    setDeliveryQuoteLoading(true);
    try {
      const response = await fetch("/api/cdek/calculate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          city: deliveryCity.trim(),
          itemsCount: totalItems,
          declaredValue: total,
        }),
      });
      const data = await response.json();
      if (!response.ok) {
        setDeliveryQuote(null);
        setError(data.error || "Не удалось рассчитать доставку СДЭК");
        return;
      }
      setDeliveryQuote(data.best);
    } catch {
      setDeliveryQuote(null);
      setError("Ошибка сети при расчете доставки");
    } finally {
      setDeliveryQuoteLoading(false);
    }
  };

  const loadCdekPickupPoints = async () => {
    if (!deliveryCity.trim()) {
      setError("Укажите город для поиска ПВЗ СДЭК");
      return;
    }

    setError("");
    setPickupPointsCdekLoading(true);
    try {
      const response = await fetch("/api/cdek/pickup-points", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city: deliveryCity.trim() }),
      });
      const data = await response.json();
      if (!response.ok) {
        setPickupPointsCdek([]);
        setSelectedCdekPointCode("");
        setError(data.error || "Не удалось загрузить ПВЗ СДЭК");
        return;
      }
      setPickupPointsCdek(data.points ?? []);
      setSelectedCdekPointCode((data.points?.[0]?.code as string) ?? "");
    } catch {
      setPickupPointsCdek([]);
      setSelectedCdekPointCode("");
      setError("Ошибка сети при загрузке ПВЗ");
    } finally {
      setPickupPointsCdekLoading(false);
    }
  };

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
          deliveryCity: deliveryCity.trim(),
          deliveryQuote,
          cdekPickupPoint:
            selectedCdekPointCode && pickupPointsCdek.length > 0
              ? pickupPointsCdek.find((p) => p.code === selectedCdekPointCode) ?? null
              : null,
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
          <Widget title="Товары в корзине">
            <div className="space-y-3">
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
                        <input
                          type="number"
                          min={1}
                          step={1}
                          inputMode="numeric"
                          value={item.quantity}
                          onChange={(e) => {
                            const nextValue = Number.parseInt(e.target.value, 10);
                            if (Number.isNaN(nextValue)) return;
                            setItemQuantity(item.product.id, Math.max(1, nextValue));
                          }}
                          onBlur={(e) => {
                            const nextValue = Number.parseInt(e.target.value, 10);
                            setItemQuantity(item.product.id, Number.isNaN(nextValue) ? 1 : Math.max(1, nextValue));
                          }}
                          className="h-11 w-14 border-x border-slate-200 bg-white px-1 text-center text-sm font-medium text-slate-900 [appearance:textfield] focus:outline-none focus:ring-2 focus:ring-amber-200 [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
                          aria-label="Количество товара"
                        />
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
            </div>
          </Widget>

          <Widget title="Рекомендуем добавить" subtle>
            <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
              {recommendations.map((p) => (
                <article key={p.id} className="rounded-xl border border-slate-200 bg-white p-3">
                  <div className="relative mb-2 aspect-square overflow-hidden rounded-lg border border-slate-200 bg-slate-100">
                    <Image
                      src={p.image}
                      alt={p.name}
                      fill
                      sizes="(max-width: 1024px) 50vw, 25vw"
                      className="object-cover"
                    />
                  </div>
                  <p className="line-clamp-2 min-h-10 text-sm font-medium text-slate-800">{p.name}</p>
                  <p className="mt-1 text-sm font-semibold text-amber-700">{p.price.toLocaleString("ru-RU")} ₽</p>
                  <button
                    type="button"
                    onClick={() => addToCart(p)}
                    className="mt-2 inline-flex h-11 w-full items-center justify-center rounded-lg border border-amber-300 bg-amber-50 text-sm font-medium text-amber-800 hover:bg-amber-100"
                  >
                    Добавить
                  </button>
                </article>
              ))}
            </div>
          </Widget>

          <Widget title="Оформление заказа">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">1. Способ получения</h3>
                <div className="grid gap-3 sm:grid-cols-2">
                  <label
                    className={`relative flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition ${
                      deliveryMethod === "pickup"
                        ? "border-slate-900 bg-white shadow-sm"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "pickup"}
                      onChange={() => setDeliveryMethod("pickup")}
                      className="sr-only"
                    />
                    <div className="pr-4">
                      <p className="text-base font-semibold text-slate-900">Самовывоз</p>
                      <p className="mt-1 text-sm text-slate-600">Сегодня, от 0 ₽</p>
                    </div>
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                        deliveryMethod === "pickup" ? "bg-red-500 text-white" : "bg-slate-200 text-transparent"
                      }`}
                    >
                      ✓
                    </span>
                  </label>

                  <label
                    className={`relative flex cursor-pointer items-start justify-between rounded-2xl border p-4 transition ${
                      deliveryMethod === "courier"
                        ? "border-slate-900 bg-white shadow-sm"
                        : "border-slate-200 bg-slate-50/60 hover:border-slate-300"
                    }`}
                  >
                    <input
                      type="radio"
                      name="delivery"
                      checked={deliveryMethod === "courier"}
                      onChange={() => setDeliveryMethod("courier")}
                      className="sr-only"
                    />
                    <div className="pr-4">
                      <p className="text-base font-semibold text-slate-900">Экспресс-доставка</p>
                      <p className="mt-1 text-sm text-slate-500">
                        От 30 мин., <span className="font-medium text-emerald-600">бесплатно</span>
                      </p>
                    </div>
                    <span
                      aria-hidden
                      className={`mt-0.5 inline-flex h-7 w-7 shrink-0 rounded-full ${
                        deliveryMethod === "courier" ? "bg-red-500" : "bg-slate-200"
                      }`}
                    />
                  </label>
                </div>
              </div>

              {deliveryMethod === "pickup" ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">2. Пункт выдачи</h3>
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
                    <div className="space-y-2">
                      {pickupPoints.map((point) => (
                        <label key={point.id} className={`block rounded-xl border p-3 text-sm transition ${pickupPointId === point.id ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
                          <input
                            type="radio"
                            name="pickupPoint"
                            checked={pickupPointId === point.id}
                            onChange={() => setPickupPointId(point.id)}
                            className="mr-2"
                          />
                          <span className="font-medium text-slate-800">{point.name}</span>
                          <span className="mt-1 block text-xs text-slate-500">{point.note}</span>
                        </label>
                      ))}
                    </div>
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <iframe
                        title="Пункты выдачи Astra Motors"
                        src="https://yandex.ru/map-widget/v1/org/gm_drive/1299977455"
                        className="h-64 w-full border-0"
                        loading="lazy"
                      />
                    </div>
                  </div>
                </div>
              ) : null}

              {deliveryMethod === "courier" ? (
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">2. Доставка СДЭК</h3>
                  <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_220px]">
                    <input
                      type="text"
                      value={deliveryCity}
                      onChange={(e) => setDeliveryCity(e.target.value)}
                      className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Город доставки, например Екатеринбург"
                    />
                    <button
                      type="button"
                      onClick={calculateCdekDelivery}
                      disabled={deliveryQuoteLoading}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {deliveryQuoteLoading ? "Расчет..." : "Рассчитать"}
                    </button>
                  </div>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={loadCdekPickupPoints}
                      disabled={pickupPointsCdekLoading}
                      className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60"
                    >
                      {pickupPointsCdekLoading ? "Загрузка ПВЗ..." : "Найти ПВЗ СДЭК"}
                    </button>
                    {selectedCdekPointCode ? (
                      <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                        Выбран ПВЗ: {pickupPointsCdek.find((p) => p.code === selectedCdekPointCode)?.address || selectedCdekPointCode}
                      </div>
                    ) : null}
                  </div>
                  {pickupPointsCdek.length > 0 ? (
                    <div className="max-h-64 space-y-2 overflow-auto rounded-xl border border-slate-200 p-2">
                      {pickupPointsCdek.map((point) => (
                        <label
                          key={point.code}
                          className={`block rounded-lg border p-3 text-sm transition ${
                            selectedCdekPointCode === point.code ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"
                          }`}
                        >
                          <input
                            type="radio"
                            name="cdekPickupPoint"
                            checked={selectedCdekPointCode === point.code}
                            onChange={() => setSelectedCdekPointCode(point.code)}
                            className="mr-2"
                          />
                          <span className="font-medium text-slate-800">{point.name}</span>
                          <span className="mt-1 block text-xs text-slate-600">{point.address || point.city}</span>
                          {point.workTime ? <span className="mt-1 block text-xs text-slate-500">{point.workTime}</span> : null}
                        </label>
                      ))}
                    </div>
                  ) : null}
                  {deliveryQuote ? (
                    <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
                      СДЭК: {deliveryQuote.deliverySum.toLocaleString("ru-RU")} ₽
                      {deliveryQuote.periodMin && deliveryQuote.periodMax
                        ? `, ${deliveryQuote.periodMin}-${deliveryQuote.periodMax} дн.`
                        : ""}
                      {` (${deliveryQuote.tariffName})`}
                    </div>
                  ) : null}
                </div>
              ) : null}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">3. Оплата</h3>
                <div className="grid gap-2 sm:grid-cols-3">
                  <label className={`rounded-xl border p-3 text-sm transition ${paymentMethod === "sbp" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "sbp"}
                      onChange={() => setPaymentMethod("sbp")}
                      className="mr-2"
                    />
                    СБП
                  </label>
                  <label className={`rounded-xl border p-3 text-sm transition ${paymentMethod === "card" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
                    <input
                      type="radio"
                      name="payment"
                      checked={paymentMethod === "card"}
                      onChange={() => setPaymentMethod("card")}
                      className="mr-2"
                    />
                    Карта
                  </label>
                  <label className={`rounded-xl border p-3 text-sm transition ${paymentMethod === "cash" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"}`}>
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
              </div>

              <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">4. Получатель</h3>
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
                  type="submit"
                  disabled={sending}
                  className="inline-flex h-11 w-full items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 shadow-sm"
                >
                  {sending ? "Отправка…" : "Подтвердить заказ"}
                </button>
              </div>
            </form>
          </Widget>
        </div>

        <aside>
          <Widget title="Итого">
            <div className="space-y-2 text-sm text-slate-600">
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
                <span>
                  {deliveryMethod === "pickup"
                    ? "0 ₽"
                    : deliveryQuote
                      ? `${deliveryQuote.deliverySum.toLocaleString("ru-RU")} ₽`
                      : "Уточним"}
                </span>
              </div>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-4">
              <p className="flex items-center justify-between text-lg font-semibold">
                <span>К оплате</span>
                <span className="text-amber-700">{totalWithDelivery.toLocaleString("ru-RU")} ₽</span>
              </p>
            </div>
            <div className="mt-4 space-y-2">
              <div className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                {deliveryMethod === "pickup"
                  ? `Самовывоз: ${pickupPoints.find((p) => p.id === pickupPointId)?.name ?? "не выбран"}`
                  : `СДЭК: ${
                      pickupPointsCdek.find((p) => p.code === selectedCdekPointCode)?.address || deliveryCity.trim() || "город не указан"
                    }${deliveryQuote ? `, ${deliveryQuote.deliverySum.toLocaleString("ru-RU")} ₽` : ", ожидает расчета"}`}
              </div>
              <button
                type="button"
                onClick={clearCart}
                className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50"
              >
                Очистить корзину
              </button>
            </div>
          </Widget>
        </aside>
      </div>
    </div>
  );
}
