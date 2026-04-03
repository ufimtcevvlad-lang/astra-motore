import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSIONS } from "../lib/legal-docs";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Политика cookies",
  description: "Условия использования файлов cookies на сайте GM Shop 66.",
  alternates: { canonical: "/cookie-policy" },
};

export default function CookiePolicyPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Политика cookies", item: `${SITE_URL}/cookie-policy` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome
        crumbs={[{ label: "Главная", href: "/" }, { label: "Политика cookies" }]}
        title="Политика cookies"
      />
      <SimpleDoc title="Политика использования файлов cookies">
        <p className="text-sm text-slate-500">
          Дата вступления в силу: {LEGAL_EFFECTIVE_DATE}. Версия документа: {LEGAL_VERSIONS.cookiePolicy}.
        </p>
        <p>
          Настоящая Политика описывает, как сайт GM Shop 66 использует файлы cookies и аналогичные технологии.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">1. Что такое cookies</h2>
        <p>
          Cookies — это небольшие текстовые файлы, которые сохраняются в браузере пользователя и помогают сайту
          корректно работать, запоминать настройки и собирать статистику посещений.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">2. Какие cookies мы используем</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>технические (обязательные) — для базовой работы сайта;</li>
          <li>функциональные — для сохранения пользовательских настроек;</li>
          <li>аналитические — для оценки использования сайта и улучшения сервиса.</li>
        </ul>
        <h2 className="text-lg font-semibold text-slate-900">3. Цели использования cookies</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>обеспечение корректной работы страниц и форм;</li>
          <li>анализ посещаемости и поведения пользователей;</li>
          <li>улучшение удобства и качества сервиса.</li>
        </ul>
        <h2 className="text-lg font-semibold text-slate-900">4. Управление cookies</h2>
        <p>
          Пользователь может изменить настройки cookies в своем браузере, включая блокировку или удаление файлов.
          Отключение обязательных cookies может привести к некорректной работе отдельных функций сайта.
        </p>
        <h2 className="text-lg font-semibold text-slate-900">5. Изменения политики</h2>
        <p>
          Мы вправе обновлять настоящую Политику. Актуальная версия всегда доступна на данной странице.
        </p>
      </SimpleDoc>
    </div>
  );
}
