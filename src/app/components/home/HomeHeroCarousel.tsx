"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ReactNode,
  type TouchEvent as ReactTouchEvent,
} from "react";

/**
 * Автопереключающаяся hero-карусель на главной — 4 слайда.
 *
 * Особенности:
 *  - Автопереключение каждые 6 секунд
 *  - Пауза при наведении мыши / фокусе клавиатурой
 *  - Свайп пальцем на мобильном
 *  - Точки-индикаторы снизу (кликабельные)
 *  - Стрелки влево/вправо (только десктоп, при hover)
 *  - Уважает prefers-reduced-motion (отключает автопереключение)
 *  - Фиксированная высота — контент не прыгает при переключении
 *  - Все слайды в DOM одновременно — хорошо для SEO и скринридеров
 */

type SlideAccent = {
  /** Крупный символ/число/буква в правой части слайда. */
  label: string;
  /** Подпись под символом. */
  caption: string;
};

type Slide = {
  id: string;
  /** Мелкая подпись-бейдж сверху (uppercase). */
  eyebrow: string;
  /** Главный заголовок слайда — H2 для карусели. */
  headline: ReactNode;
  /** Описание. */
  text: string;
  /** Единственная кнопка (амбер). Каждый слайд — своя уникальная ссылка. */
  primaryCta: { label: string; href: string };
  /** Большой декоративный акцент справа. */
  accent: SlideAccent;
};

const SLIDES: Slide[] = [
  {
    id: "utp",
    eyebrow: "Екатеринбург · с 2013 года",
    headline: (
      <>
        Запчасти GM, которых нет
        <span className="block text-amber-400">у крупных поставщиков</span>
      </>
    ),
    text: "Оригинал и проверенные аналоги Opel, Chevrolet. В наличии на складе и под заказ. Подбор по VIN, доставка по всей России.",
    primaryCta: { label: "Открыть каталог", href: "/catalog" },
    accent: { label: "12+", caption: "лет с GM" },
  },
  {
    id: "to",
    eyebrow: "Расходники для ТО",
    headline: (
      <>
        Всё для планового ТО —
        <span className="block text-amber-400">в одном месте</span>
      </>
    ),
    text: "Свечи, фильтры, прокладки, ремни ГРМ. Оригинал и проверенные аналоги. Отправьте VIN запрос — соберём список под ваш мотор.",
    primaryCta: { label: "VIN запрос", href: "/vin-request" },
    accent: { label: "ТО", caption: "соберём комплект" },
  },
  {
    id: "vin",
    eyebrow: "Быстрый подбор",
    headline: (
      <>
        Подбор по VIN
        <span className="block text-amber-400">за 15 минут</span>
      </>
    ),
    text: "Не уверены в артикуле? Отправьте VIN запрос — подтвердим применимость и предложим варианты с точной ценой. Отвечаем за подбор.",
    primaryCta: { label: "Как заказать", href: "/how-to-order" },
    accent: { label: "VIN", caption: "точный подбор" },
  },
  {
    id: "rare",
    eyebrow: "Сложный подбор",
    headline: (
      <>
        Находим то, чего нет
        <span className="block text-amber-400">в свободной продаже</span>
      </>
    ),
    text: "Позиции из внутреннего каталога GM, снятые с производства детали, нестандартные артикулы. Если не нашли — свяжитесь с нами.",
    primaryCta: { label: "Связаться с нами", href: "/contacts" },
    accent: { label: "∞", caption: "найдём" },
  },
];

const SLIDE_INTERVAL_MS = 6000;
const SWIPE_THRESHOLD_PX = 50;

export function HomeHeroCarousel() {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);
  const [reducedMotion, setReducedMotion] = useState(false);
  const touchStartX = useRef<number | null>(null);

  // Уважаем prefers-reduced-motion
  useEffect(() => {
    if (typeof window === "undefined") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => setReducedMotion(mq.matches);
    update();
    mq.addEventListener("change", update);
    return () => mq.removeEventListener("change", update);
  }, []);

  // Автопереключение
  useEffect(() => {
    if (paused || reducedMotion) return;
    const id = setInterval(() => {
      setActive((i) => (i + 1) % SLIDES.length);
    }, SLIDE_INTERVAL_MS);
    return () => clearInterval(id);
  }, [paused, reducedMotion]);

  const next = useCallback(() => {
    setActive((i) => (i + 1) % SLIDES.length);
  }, []);
  const prev = useCallback(() => {
    setActive((i) => (i - 1 + SLIDES.length) % SLIDES.length);
  }, []);

  const onTouchStart = (e: ReactTouchEvent<HTMLElement>) => {
    touchStartX.current = e.touches[0]?.clientX ?? null;
  };
  const onTouchEnd = (e: ReactTouchEvent<HTMLElement>) => {
    if (touchStartX.current == null) return;
    const endX = e.changedTouches[0]?.clientX ?? touchStartX.current;
    const diff = touchStartX.current - endX;
    if (Math.abs(diff) > SWIPE_THRESHOLD_PX) {
      if (diff > 0) next();
      else prev();
    }
    touchStartX.current = null;
  };

  return (
    <section
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-[#0F172A] via-[#0A0E15] to-[#020617] text-white shadow-2xl"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
      aria-roledescription="carousel"
      aria-label="Главные предложения GM Shop 66"
    >
      {/* Декоративные слои поверх всех слайдов */}
      <div className="pointer-events-none absolute inset-0 opacity-[0.07] bg-[url('data:image/svg+xml,%3Csvg width=\'60\' height=\'60\' viewBox=\'0 0 60 60\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cg fill=\'none\' fill-rule=\'evenodd\'%3E%3Cg fill=\'%23ffffff\' fill-opacity=\'1\'%3E%3Cpath d=\'M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z\'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E')]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_85%_20%,rgba(245,158,11,0.18),transparent_55%),radial-gradient(circle_at_10%_90%,rgba(251,191,36,0.08),transparent_50%)]" />

      {/* Слайды — фиксированная высота, плавное появление */}
      <div className="relative h-[520px] sm:h-[480px] md:h-[500px] lg:h-[520px]">
        {SLIDES.map((slide, i) => {
          const isActive = i === active;
          return (
            <article
              key={slide.id}
              role="group"
              aria-roledescription="slide"
              aria-label={`Слайд ${i + 1} из ${SLIDES.length}: ${slide.eyebrow}`}
              aria-hidden={!isActive}
              className={`absolute inset-0 flex items-center p-6 transition-opacity duration-700 ease-out sm:p-10 lg:p-14 ${
                isActive ? "opacity-100" : "pointer-events-none opacity-0"
              }`}
            >
              <div className="grid w-full items-center gap-8 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,0.6fr)]">
                {/* Левая часть — контент */}
                <div className="max-w-2xl space-y-5">
                  <p className="inline-flex items-center gap-2 rounded-full border border-amber-400/30 bg-amber-400/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-amber-300">
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
                    {slide.eyebrow}
                  </p>

                  <h2 className="text-4xl font-black leading-[1.05] tracking-tight text-white sm:text-5xl md:text-6xl">
                    {slide.headline}
                  </h2>

                  <p className="max-w-xl text-base leading-relaxed text-slate-300 sm:text-lg">
                    {slide.text}
                  </p>

                  <div className="pt-2">
                    <Link
                      href={slide.primaryCta.href}
                      tabIndex={isActive ? 0 : -1}
                      className="inline-flex items-center justify-center rounded-full bg-amber-400 px-8 py-4 text-base font-semibold text-slate-950 shadow-xl shadow-black/40 transition hover:-translate-y-0.5 hover:bg-amber-300"
                    >
                      {slide.primaryCta.label}
                    </Link>
                  </div>
                </div>

                {/* Правая часть — большой декоративный акцент */}
                <div className="hidden lg:flex lg:items-center lg:justify-center">
                  <div className="relative flex aspect-square w-full max-w-[280px] items-center justify-center rounded-full border border-amber-400/20 bg-amber-400/5 backdrop-blur">
                    <div className="absolute inset-6 rounded-full border border-amber-400/15" />
                    <div className="absolute inset-12 rounded-full border border-amber-400/10" />
                    <div className="relative text-center">
                      <p className="text-6xl font-black text-amber-400 sm:text-7xl md:text-8xl">
                        {slide.accent.label}
                      </p>
                      <p className="mt-2 max-w-[200px] text-xs font-medium text-slate-300">
                        {slide.accent.caption}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Стрелки — только десктоп */}
      <button
        type="button"
        onClick={prev}
        aria-label="Предыдущий слайд"
        className="absolute left-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur transition hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:flex"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M15 6l-6 6 6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      <button
        type="button"
        onClick={next}
        aria-label="Следующий слайд"
        className="absolute right-3 top-1/2 z-20 hidden h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-slate-900/60 text-white backdrop-blur transition hover:bg-slate-900/80 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 md:flex"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden>
          <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {/* Точки-индикаторы */}
      <div
        className="absolute bottom-5 left-1/2 z-20 flex -translate-x-1/2 items-center gap-2"
        role="tablist"
        aria-label="Выбор слайда"
      >
        {SLIDES.map((slide, i) => {
          const isActive = i === active;
          return (
            <button
              key={slide.id}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-label={`Слайд ${i + 1}`}
              onClick={() => setActive(i)}
              className={`h-2 rounded-full transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 ${
                isActive ? "w-8 bg-amber-400" : "w-2 bg-white/40 hover:bg-white/60"
              }`}
            />
          );
        })}
      </div>
    </section>
  );
}
