import type { Metadata } from "next";
import { HomeAdvantages } from "./components/home/HomeAdvantages";
import { HomeFAQ } from "./components/home/HomeFAQ";
import { HOME_FAQ_ITEMS } from "./components/home/home-faq-data";
import { HomeFinalCTA } from "./components/home/HomeFinalCTA";
import { HomeHero } from "./components/home/HomeHero";
import { HomeHowItWorks } from "./components/home/HomeHowItWorks";
import { HomePopularCategories } from "./components/home/HomePopularCategories";
import { HomeYandexReviews } from "./components/home/HomeYandexReviews";
import { DEFAULT_META_DESCRIPTION, SEO_LOCALE, defaultOgImages } from "./lib/seo";
import { SITE_BRAND, SITE_URL } from "./lib/site";

export const metadata: Metadata = {
  title: "Главная",
  description: `${SITE_BRAND} — запчасти GM, Opel и Chevrolet в Екатеринбурге с 2013 года. Оригинал и проверенные аналоги, подбор по VIN, редкие позиции со своего склада. Работаем только с GM.`,
  alternates: { canonical: "/" },
  openGraph: {
    title: `${SITE_BRAND} — автозапчасти GM, Opel, Chevrolet`,
    description: DEFAULT_META_DESCRIPTION,
    url: SITE_URL,
    siteName: SITE_BRAND,
    locale: SEO_LOCALE,
    type: "website",
    images: defaultOgImages(),
  },
};

/**
 * Главная страница GM Shop 66.
 *
 * Структура блоков (сверху вниз):
 *  1. HomeHero — УТП «Находим то, чего нет у других»
 *  2. HomeAdvantages — 6 плиток «Почему мы»
 *  3. HomePopularCategories — карточки категорий с амбер-иконками
 *  4. HomeHowItWorks — 3 шага оформления заказа
 *  5. HomeYandexReviews — виджет отзывов с Яндекс.Карт
 *  6. HomeFAQ — 6 частых вопросов (аккордеон)
 *  7. HomeFinalCTA — «Не нашли запчасть?» + WhatsApp/Telegram/VIN
 */
export default function HomePage() {
  const faqLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: HOME_FAQ_ITEMS.map((item) => ({
      "@type": "Question",
      name: item.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: item.answer,
      },
    })),
  };

  return (
    <div className="space-y-14">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqLd) }}
      />

      <HomeHero />
      <HomeAdvantages />
      <HomePopularCategories />
      <HomeHowItWorks />
      <HomeYandexReviews />
      <HomeFAQ />
      <HomeFinalCTA />
    </div>
  );
}
