import { YANDEX_BUSINESS_LINKS } from "@/app/lib/yandex-business";

export type DeliveryMethod = "pickup" | "courier";

export type PickupPoint = { id: string; name: string; note: string };

export type CdekPoint = {
  code: string;
  name: string;
  city: string;
  address: string;
  workTime: string;
};

export type CdekQuote = {
  tariffCode: number;
  tariffName: string;
  deliverySum: number;
  periodMin: number | null;
  periodMax: number | null;
};

type Props = {
  deliveryMethod: DeliveryMethod;
  onChangeMethod: (method: DeliveryMethod) => void;

  // pickup
  pickupPoints: readonly PickupPoint[];
  pickupPointId: string;
  onChangePickupPointId: (id: string) => void;

  // cdek
  deliveryCity: string;
  onChangeDeliveryCity: (value: string) => void;
  deliveryQuote: CdekQuote | null;
  deliveryQuoteLoading: boolean;
  onCalculateCdek: () => void;
  pickupPointsCdek: CdekPoint[];
  pickupPointsCdekLoading: boolean;
  onLoadCdekPoints: () => void;
  selectedCdekPointCode: string;
  onSelectCdekPoint: (code: string) => void;
};

export function DeliveryBlock({
  deliveryMethod,
  onChangeMethod,
  pickupPoints,
  pickupPointId,
  onChangePickupPointId,
  deliveryCity,
  onChangeDeliveryCity,
  deliveryQuote,
  deliveryQuoteLoading,
  onCalculateCdek,
  pickupPointsCdek,
  pickupPointsCdekLoading,
  onLoadCdekPoints,
  selectedCdekPointCode,
  onSelectCdekPoint,
}: Props) {
  return (
    <>
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
              onChange={() => onChangeMethod("pickup")}
              className="sr-only"
            />
            <div className="pr-4">
              <p className="text-base font-semibold text-slate-900">Самовывоз</p>
              <p className="mt-1 text-sm text-slate-600">Сегодня, от 0 ₽</p>
            </div>
            <span
              aria-hidden
              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                deliveryMethod === "pickup"
                  ? "bg-amber-500 text-white ring-2 ring-amber-200"
                  : "bg-slate-200 text-transparent"
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
              onChange={() => onChangeMethod("courier")}
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
              className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-sm font-semibold ${
                deliveryMethod === "courier"
                  ? "bg-amber-500 text-white ring-2 ring-amber-200"
                  : "bg-slate-200 text-transparent"
              }`}
            >
              ✓
            </span>
          </label>
        </div>
      </div>

      {deliveryMethod === "pickup" ? (
        <div className="space-y-3">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">2. Пункт выдачи</h3>
          <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="space-y-2">
              {pickupPoints.map((point) => (
                <label
                  key={point.id}
                  className={`block rounded-xl border p-3 text-sm transition ${
                    pickupPointId === point.id ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"
                  }`}
                >
                  <input
                    type="radio"
                    name="pickupPoint"
                    checked={pickupPointId === point.id}
                    onChange={() => onChangePickupPointId(point.id)}
                    className="mr-2 accent-amber-500"
                  />
                  <span className="font-medium text-slate-800">{point.name}</span>
                  <span className="mt-1 block text-xs text-slate-500">{point.note}</span>
                </label>
              ))}
            </div>
            <div className="overflow-hidden rounded-xl border border-slate-200">
              <iframe
                title="Пункты выдачи GM Shop"
                src={YANDEX_BUSINESS_LINKS.mapWidget}
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
              onChange={(e) => onChangeDeliveryCity(e.target.value)}
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
              placeholder="Город доставки, например Екатеринбург"
            />
            <button
              type="button"
              onClick={onCalculateCdek}
              disabled={deliveryQuoteLoading}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {deliveryQuoteLoading ? "Расчет..." : "Рассчитать"}
            </button>
          </div>
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={onLoadCdekPoints}
              disabled={pickupPointsCdekLoading}
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm text-slate-700 hover:bg-slate-50 disabled:opacity-60 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 focus-visible:ring-offset-2 focus-visible:ring-offset-white"
            >
              {pickupPointsCdekLoading ? "Загрузка ПВЗ..." : "Найти ПВЗ СДЭК"}
            </button>
            {selectedCdekPointCode ? (
              <div className="rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs text-slate-600">
                Выбран ПВЗ:{" "}
                {pickupPointsCdek.find((p) => p.code === selectedCdekPointCode)?.address || selectedCdekPointCode}
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
                    onChange={() => onSelectCdekPoint(point.code)}
                    className="mr-2 accent-amber-500"
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
    </>
  );
}
