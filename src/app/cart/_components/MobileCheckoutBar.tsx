type Props = {
  totalWithDelivery: number;
  sending: boolean;
};

export function MobileCheckoutBar({ totalWithDelivery, sending }: Props) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-[60] p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] lg:hidden">
      <div className="rounded-2xl border border-slate-200 bg-white/95 p-3 shadow-xl backdrop-blur">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">К оплате</p>
            <p className="text-lg font-bold text-amber-700">{totalWithDelivery.toLocaleString("ru-RU")} ₽</p>
          </div>
          <button
            type="submit"
            form="checkout-form"
            disabled={sending}
            className="inline-flex h-11 items-center justify-center rounded-lg bg-amber-600 px-5 text-sm font-semibold text-white hover:bg-amber-700 disabled:opacity-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35"
          >
            {sending ? "Отправка…" : "Подтвердить заказ"}
          </button>
        </div>
      </div>
    </div>
  );
}
