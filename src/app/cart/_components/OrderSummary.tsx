import type { CdekPoint, CdekQuote, DeliveryMethod, PickupPoint } from "./DeliveryBlock";

type Props = {
  totalItems: number;
  total: number;
  totalWithDelivery: number;
  deliveryMethod: DeliveryMethod;
  deliveryQuote: CdekQuote | null;
  pickupPoints: readonly PickupPoint[];
  pickupPointId: string;
  pickupPointsCdek: CdekPoint[];
  selectedCdekPointCode: string;
  deliveryCity: string;
  onClearCart: () => void;
};

export function OrderSummary({
  totalItems,
  total,
  totalWithDelivery,
  deliveryMethod,
  deliveryQuote,
  pickupPoints,
  pickupPointId,
  pickupPointsCdek,
  selectedCdekPointCode,
  deliveryCity,
  onClearCart,
}: Props) {
  return (
    <>
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
                pickupPointsCdek.find((p) => p.code === selectedCdekPointCode)?.address ||
                deliveryCity.trim() ||
                "город не указан"
              }${deliveryQuote ? `, ${deliveryQuote.deliverySum.toLocaleString("ru-RU")} ₽` : ", ожидает расчета"}`}
        </div>
        <button
          type="button"
          onClick={onClearCart}
          className="inline-flex h-11 w-full items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50"
        >
          Очистить корзину
        </button>
      </div>
    </>
  );
}
