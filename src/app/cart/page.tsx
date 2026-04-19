"use client";

import { useEffect, useState } from "react";
import { useCart } from "../components/CartContext";
import type { Product } from "../lib/products-types";
import { isValidRuPhone, normalizeRuPhone } from "../lib/phone";
import { CartItemRow } from "./_components/CartItemRow";
import { CartRecommendations } from "./_components/CartRecommendations";
import { DeliveryBlock, type CdekPoint, type CdekQuote, type DeliveryMethod } from "./_components/DeliveryBlock";
import { EmptyCart } from "./_components/EmptyCart";
import { MobileCheckoutBar } from "./_components/MobileCheckoutBar";
import { OrderSuccess } from "./_components/OrderSuccess";
import { OrderSummary } from "./_components/OrderSummary";
import { PaymentSelector, type PaymentMethod } from "./_components/PaymentSelector";
import { RecipientFields } from "./_components/RecipientFields";
import { Widget } from "./_components/Widget";

const PICKUP_POINTS = [
  { id: "p1", name: "GM Shop, ул. Готвальда, 9", note: "Пн–Пт 10:00–20:00, Сб–Вс 10:00–18:00" },
] as const;

export default function CartPage() {
  const { items, addToCart, removeFromCart, clearCart, setItemQuantity, increaseQuantity, decreaseQuantity } =
    useCart();
  const [sent, setSent] = useState(false);
  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("pickup");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("sbp");
  const [pickupPointId, setPickupPointId] = useState<string>(PICKUP_POINTS[0].id);
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
  const [deliveryQuote, setDeliveryQuote] = useState<CdekQuote | null>(null);
  const [pickupPointsCdekLoading, setPickupPointsCdekLoading] = useState(false);
  const [pickupPointsCdek, setPickupPointsCdek] = useState<CdekPoint[]>([]);
  const [selectedCdekPointCode, setSelectedCdekPointCode] = useState("");
  const phoneValid = isValidRuPhone(phone);

  const totalItems = items.reduce((sum, i) => sum + i.quantity, 0);
  const total = items.reduce((sum, i) => sum + i.product.price * i.quantity, 0);
  const [recommendations, setRecommendations] = useState<Product[]>([]);
  useEffect(() => {
    const excludeIds = items.map((i) => i.product.id).filter(Boolean).join(",");
    const preferCategories = Array.from(new Set(items.map((i) => i.product.category).filter(Boolean))).join(",");
    const params = new URLSearchParams();
    if (excludeIds) params.set("excludeIds", excludeIds);
    if (preferCategories) params.set("preferCategories", preferCategories);
    params.set("limit", "6");
    let cancelled = false;
    fetch(`/api/public/products/recommendations?${params.toString()}`)
      .then((r) => r.json())
      .then((data: { items: Product[] }) => { if (!cancelled) setRecommendations(data.items); })
      .catch(() => { if (!cancelled) setRecommendations([]); });
    return () => { cancelled = true; };
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
    return <EmptyCart />;
  }

  if (sent) {
    return <OrderSuccess />;
  }

  return (
    <div className="space-y-6 pb-24 lg:pb-0">
      <h1 className="text-2xl font-semibold">Корзина</h1>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <div className="space-y-4">
          <Widget title="Товары в корзине">
            <div className="space-y-3">
              {items.map((item) => (
                <CartItemRow
                  key={item.product.id}
                  product={item.product}
                  quantity={item.quantity}
                  onIncrease={increaseQuantity}
                  onDecrease={decreaseQuantity}
                  onSetQuantity={setItemQuantity}
                  onRemove={removeFromCart}
                />
              ))}
            </div>
          </Widget>

          <Widget title="Рекомендуем добавить" subtle>
            <CartRecommendations products={recommendations} onAdd={addToCart} />
          </Widget>

          <Widget title="Оформление заказа">
            <form id="checkout-form" onSubmit={handleSubmit} className="space-y-5">
              <DeliveryBlock
                deliveryMethod={deliveryMethod}
                onChangeMethod={setDeliveryMethod}
                pickupPoints={PICKUP_POINTS}
                pickupPointId={pickupPointId}
                onChangePickupPointId={setPickupPointId}
                deliveryCity={deliveryCity}
                onChangeDeliveryCity={setDeliveryCity}
                deliveryQuote={deliveryQuote}
                deliveryQuoteLoading={deliveryQuoteLoading}
                onCalculateCdek={calculateCdekDelivery}
                pickupPointsCdek={pickupPointsCdek}
                pickupPointsCdekLoading={pickupPointsCdekLoading}
                onLoadCdekPoints={loadCdekPickupPoints}
                selectedCdekPointCode={selectedCdekPointCode}
                onSelectCdekPoint={setSelectedCdekPointCode}
              />

              <PaymentSelector value={paymentMethod} onChange={setPaymentMethod} />

              <RecipientFields
                error={error}
                name={name}
                onChangeName={setName}
                phone={phone}
                onChangePhone={setPhone}
                onPhoneBlur={() => setPhoneTouched(true)}
                phoneTouched={phoneTouched}
                phoneValid={phoneValid}
                comment={comment}
                onChangeComment={setComment}
                consentPersonalData={consentPersonalData}
                onChangeConsentPersonalData={setConsentPersonalData}
                consentMarketing={consentMarketing}
                onChangeConsentMarketing={setConsentMarketing}
                onTurnstileToken={setTurnstileToken}
              />

              <div className="flex gap-2">
                <button
                  type="submit"
                  disabled={sending}
                  className="hidden lg:inline-flex h-11 w-full items-center justify-center rounded-lg bg-amber-600 px-4 text-sm font-medium text-white hover:bg-amber-700 disabled:opacity-50 shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
                >
                  {sending ? "Отправка…" : "Подтвердить заказ"}
                </button>
              </div>
            </form>
          </Widget>
        </div>

        <aside className="lg:sticky lg:top-24 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:pr-1">
          <Widget title="Итого">
            <OrderSummary
              totalItems={totalItems}
              total={total}
              totalWithDelivery={totalWithDelivery}
              deliveryMethod={deliveryMethod}
              deliveryQuote={deliveryQuote}
              pickupPoints={PICKUP_POINTS}
              pickupPointId={pickupPointId}
              pickupPointsCdek={pickupPointsCdek}
              selectedCdekPointCode={selectedCdekPointCode}
              deliveryCity={deliveryCity}
              onClearCart={clearCart}
            />
          </Widget>
        </aside>
      </div>
      <MobileCheckoutBar totalWithDelivery={totalWithDelivery} sending={sending} />
    </div>
  );
}
