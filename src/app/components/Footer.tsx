import Link from "next/link";
import { SITE_BRAND } from "../lib/site";

export function Footer() {
  return (
    <footer className="mt-auto border-t-2 border-amber-500/40 bg-gradient-to-b from-neutral-950 via-slate-950 to-black text-slate-100">
      <div className="mx-auto max-w-7xl px-4 py-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-medium">
            © 2013-2026 <span className="text-white font-semibold">{SITE_BRAND}</span>
          </p>
          <nav className="flex flex-wrap gap-4">
            <div className="text-sm font-semibold text-slate-400 transition">
              <a
                href="tel:+79022540111"
                className="inline-flex min-h-11 items-center rounded px-1 py-1 hover:text-amber-400 transition"
              >
                +7 (902) 254-01-11
              </a>
              <br />
              <a
                href="tel:+73432061535"
                className="inline-flex min-h-11 items-center rounded px-1 py-1 hover:text-amber-400 transition"
              >
                +7 (343) 206-15-35
              </a>
            </div>
          </nav>
        </div>
        <div className="mt-6 text-xs leading-relaxed text-slate-400">
          <p>Индивидуальный предприниматель Невьянцев Антон Александрович</p>
          <p>ИНН 667472249310</p>
          <p>ОГРНИП 321665800117840</p>
          <p>Юридический адрес: Свердловская обл., г. Екатеринбург, ул. Крестинского, д. 27, кв. 269</p>
        </div>
        <div className="mt-4 border-t border-slate-800 pt-4 text-xs text-slate-500">
          <p className="flex flex-wrap gap-x-1">
            <Link href="/supply-agreement" className="hover:text-slate-300 transition">Оферта</Link>
            <span>·</span>
            <Link href="/returns" className="hover:text-slate-300 transition">Возврат</Link>
            <span>·</span>
            <Link href="/warranty" className="hover:text-slate-300 transition">Гарантия</Link>
            <span>·</span>
            <Link href="/payment" className="hover:text-slate-300 transition">Оплата</Link>
          </p>
          <p className="mt-1 flex flex-wrap gap-x-1">
            <Link href="/privacy" className="hover:text-slate-300 transition">Конфиденциальность</Link>
            <span>·</span>
            <Link href="/consent-personal-data" className="hover:text-slate-300 transition">Согласие на ПДн</Link>
            <span>·</span>
            <Link href="/cookie-policy" className="hover:text-slate-300 transition">Cookies</Link>
            <span>·</span>
            <Link href="/terms" className="hover:text-slate-300 transition">Пользовательское соглашение</Link>
          </p>
        </div>
      </div>
    </footer>
  );
}
