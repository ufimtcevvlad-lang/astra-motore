import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Страница не найдена",
  robots: { index: false, follow: true },
};

export default function NotFound() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center text-center">
      <p className="text-6xl font-black text-amber-400">404</p>
      <h1 className="mt-4 text-2xl font-bold text-slate-900">Страница не найдена</h1>
      <p className="mt-3 max-w-md text-sm text-slate-600">
        Возможно, страница была перемещена или удалена. Попробуйте найти нужную запчасть
        через каталог или отправьте VIN запрос.
      </p>
      <div className="mt-6 flex flex-wrap gap-3">
        <Link
          href="/catalog"
          className="inline-flex items-center justify-center rounded-full bg-amber-500 px-6 py-3 text-sm font-semibold text-white shadow-md transition hover:bg-amber-600"
        >
          Открыть каталог
        </Link>
        <Link
          href="/vin-request"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          VIN запрос
        </Link>
        <Link
          href="/"
          className="inline-flex items-center justify-center rounded-full border border-slate-300 px-6 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
        >
          На главную
        </Link>
      </div>
    </div>
  );
}
