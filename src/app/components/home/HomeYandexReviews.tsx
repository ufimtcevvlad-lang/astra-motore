import Link from "next/link";
import { YANDEX_BUSINESS_LINKS } from "@/app/lib/yandex-business";

/**
 * Блок отзывов с Яндекс.Карт.
 *
 * 2-колоночный layout:
 *  - Слева: iframe виджет отзывов с Яндекса (обновляется автоматически)
 *  - Справа: «карточка доверия» с рейтингом, ключевыми фактами и CTA
 */

export function HomeYandexReviews() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Отзывы клиентов</h2>
          <p className="mt-2 text-sm text-slate-600">С карточки GM Shop 66 на Яндекс.Картах</p>
        </div>
        <a
          href={YANDEX_BUSINESS_LINKS.reviews}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm font-semibold text-amber-700 hover:text-amber-800 hover:underline sm:self-auto"
        >
          Все отзывы на Яндексе →
        </a>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        {/* Левая колонка: виджет отзывов Яндекса — фиксированная ширина под размер виджета */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <iframe
            title="Отзывы GM Shop на Яндекс.Картах"
            src={YANDEX_BUSINESS_LINKS.reviewsWidget}
            className="block h-[560px] w-full border-0 lg:h-[620px]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>

        {/* Правая колонка: карточка доверия */}
        <aside className="flex flex-col gap-4 rounded-2xl border border-slate-200 bg-gradient-to-br from-amber-50 via-white to-white p-6 shadow-sm lg:p-7">
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-4xl font-black text-amber-600">4,5</span>
              <span className="text-sm font-medium text-slate-500">из 5</span>
            </div>
            <div className="mt-1 text-amber-500" aria-label="Рейтинг 4,5 из 5">
              ★★★★★
            </div>
            <p className="mt-2 text-xs text-slate-500">
              Актуальная оценка и отзывы подтягиваются из Яндекс.Карт
            </p>
          </div>

          <div className="border-t border-amber-200/60 pt-4">
            <p className="text-sm leading-relaxed text-slate-700">
              Оценки и отзывы реальных клиентов с Яндекс.Карт. Мы не модерируем
              и не редактируем — всё как есть.
            </p>
          </div>

          <div className="mt-auto flex flex-col gap-2 border-t border-amber-200/60 pt-4">
            <a
              href={YANDEX_BUSINESS_LINKS.reviews}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-amber-500 px-4 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-600"
            >
              Смотреть все отзывы
            </a>
            <Link
              href="/contacts"
              className="inline-flex h-11 items-center justify-center rounded-lg border border-slate-300 px-4 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
            >
              Как нас найти
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
