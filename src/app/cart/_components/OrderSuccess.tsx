import Link from "next/link";

export function OrderSuccess() {
  return (
    <div className="rounded-xl border border-amber-100 bg-white p-8 text-center shadow-sm">
      <p className="text-lg font-bold text-amber-700">Заказ принят!</p>
      <p className="mt-2 text-slate-600">
        Менеджер <span className="font-medium text-amber-700">GM Shop</span> свяжется с вами в ближайшее время.
      </p>
      <Link href="/catalog" className="mt-4 inline-block font-medium text-amber-600 hover:text-amber-700">
        Вернуться в каталог
      </Link>
    </div>
  );
}
