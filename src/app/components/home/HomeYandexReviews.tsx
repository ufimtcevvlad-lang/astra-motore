/**
 * Блок отзывов с Яндекс.Карт.
 *
 * Используется официальный бесплатный виджет от Яндекса через iframe.
 * Подтягивает отзывы с карточки организации 1299977455 (GM Shop на Яндекс.Картах).
 * Отзывы обновляются автоматически — ничего не нужно редактировать.
 */

const YANDEX_ORG_ID = "1299977455";
const REVIEWS_EMBED_URL = `https://yandex.ru/maps-reviews-widget/${YANDEX_ORG_ID}?comments`;
const YANDEX_ORG_PAGE = `https://yandex.ru/maps/org/gm_drive/${YANDEX_ORG_ID}/`;

export function HomeYandexReviews() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Отзывы клиентов</h2>
          <p className="mt-2 text-sm text-slate-600">С карточки GM Shop на Яндекс.Картах</p>
        </div>
        <a
          href={YANDEX_ORG_PAGE}
          target="_blank"
          rel="noopener noreferrer"
          className="self-start text-sm font-semibold text-amber-700 hover:text-amber-800 hover:underline sm:self-auto"
        >
          Все отзывы на Яндексе →
        </a>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <iframe
          title="Отзывы GM Shop на Яндекс.Картах"
          src={REVIEWS_EMBED_URL}
          className="h-[560px] w-full border-0 sm:h-[640px]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
        />
      </div>
    </section>
  );
}
