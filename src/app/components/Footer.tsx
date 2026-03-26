import Link from "next/link";

export function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-amber-500/40 bg-gradient-to-b from-neutral-950 via-slate-950 to-black text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            © 2013-2026 <span className="text-white font-semibold">Astra Motors</span>
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
        <div className="mt-6 rounded-lg border border-slate-800/70 bg-slate-900/40 p-4 text-xs leading-relaxed text-slate-300">
          <p className="font-semibold text-slate-100">
            Индивидуальный предприниматель Невьянцев Антон Александрович
          </p>
          <p className="mt-1">
            Свидетельство: № 608466621, от 08 июля 2021 года
          </p>
          <p>
            ИНН 667472249310, ОГРНИП 321665800117840
          </p>
          <p>
            Адрес: Свердловская обл., г. Екатеринбург, ул. Крестинского, д. 27, кв. 269
          </p>
          <p className="mt-2">
            Номер счёта: 40802810038410001623
          </p>
          <p>
            Кор. счёт: 30101810100000000964
          </p>
          <p>
            БИК: 046577964
          </p>
          <p>
            ФИЛИАЛ «ЕКАТЕРИНБУРГСКИЙ» АО «АЛЬФА-БАНК»
          </p>
        </div>
      </div>
    </footer>
  );
}
