import Link from "next/link";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-auto border-t-2 border-amber-500/40 bg-gradient-to-b from-neutral-950 via-slate-950 to-black text-slate-100">
      <div className="mx-auto max-w-5xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            © {year} <span className="text-white font-semibold">Astra Motors</span>
          </p>
          <nav className="flex flex-wrap gap-4">
            <Link href="/" className="text-sm text-slate-400 hover:text-amber-400 transition">
              Главная
            </Link>
            <Link href="/catalog" className="text-sm text-slate-400 hover:text-amber-400 transition">
              Каталог
            </Link>
            <Link href="/how-to-order" className="text-sm text-slate-400 hover:text-amber-400 transition">
              Как заказать
            </Link>
            <Link href="/contacts" className="text-sm text-slate-400 hover:text-amber-400 transition">
              Контакты
            </Link>
            <div className="text-sm font-semibold text-slate-400 transition">
              <a
                href="tel:+79022540111"
                className="hover:text-amber-400 transition"
              >
                +7 (902) 254-01-11
              </a>
              <br />
              <a
                href="tel:+73432061535"
                className="hover:text-amber-400 transition"
              >
                +7 (343) 206-15-35
              </a>
            </div>
          </nav>
        </div>
      </div>
    </footer>
  );
}
