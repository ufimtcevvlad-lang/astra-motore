export type PaymentMethod = "sbp" | "card" | "cash";

type Props = {
  value: PaymentMethod;
  onChange: (value: PaymentMethod) => void;
};

export function PaymentSelector({ value, onChange }: Props) {
  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold uppercase tracking-wide text-slate-500">3. Оплата</h3>
      <div className="grid gap-2 sm:grid-cols-3">
        <label
          className={`rounded-xl border p-3 text-sm transition ${
            value === "sbp" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name="payment"
            checked={value === "sbp"}
            onChange={() => onChange("sbp")}
            className="mr-2 accent-amber-500"
          />
          СБП
        </label>
        <label
          className={`rounded-xl border p-3 text-sm transition ${
            value === "card" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name="payment"
            checked={value === "card"}
            onChange={() => onChange("card")}
            className="mr-2 accent-amber-500"
          />
          Карта
        </label>
        <label
          className={`rounded-xl border p-3 text-sm transition ${
            value === "cash" ? "border-amber-400 bg-amber-50" : "border-slate-200 bg-white"
          }`}
        >
          <input
            type="radio"
            name="payment"
            checked={value === "cash"}
            onChange={() => onChange("cash")}
            className="mr-2 accent-amber-500"
          />
          При получении
        </label>
      </div>
    </div>
  );
}
