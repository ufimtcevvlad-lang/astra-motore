import Link from "next/link";

export function EmptyCart() {
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
