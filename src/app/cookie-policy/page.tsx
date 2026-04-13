import type { Metadata } from "next";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSIONS } from "../lib/legal-docs";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Политика cookies",
  description:
    "Политика использования файлов cookies на сайте GM Shop 66 (gmshop66.ru).",
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
          Дата вступления в силу: {LEGAL_EFFECTIVE_DATE}. Версия документа:{" "}
          {LEGAL_VERSIONS.cookiePolicy}.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">1. Что такое cookies</h2>
        <p>
          Cookies — это небольшие текстовые файлы, которые веб-сайт сохраняет в браузере
          пользователя во время посещения страниц. Они позволяют сайту запоминать действия и
          предпочтения пользователя (например, содержимое корзины или факт принятия
          cookie-баннера) в течение определённого времени, чтобы не вводить эти данные повторно
          при каждом посещении или переходе между страницами.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">2. Какие cookies мы используем</h2>
        <div className="overflow-x-auto">
          <table className="w-full text-sm border border-slate-200">
            <thead>
              <tr className="bg-slate-50">
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Категория</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Название</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Назначение</th>
                <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Срок хранения</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Необходимые</td>
                <td className="border border-slate-200 px-3 py-2">Сессия сайта</td>
                <td className="border border-slate-200 px-3 py-2">Корзина, авторизация</td>
                <td className="border border-slate-200 px-3 py-2">До закрытия браузера</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="border border-slate-200 px-3 py-2">Необходимые</td>
                <td className="border border-slate-200 px-3 py-2">Согласие на cookie</td>
                <td className="border border-slate-200 px-3 py-2">Запоминание выбора в баннере</td>
                <td className="border border-slate-200 px-3 py-2">1 год</td>
              </tr>
              <tr>
                <td className="border border-slate-200 px-3 py-2">Функциональные</td>
                <td className="border border-slate-200 px-3 py-2">Избранное</td>
                <td className="border border-slate-200 px-3 py-2">Список избранных товаров</td>
                <td className="border border-slate-200 px-3 py-2">1 год</td>
              </tr>
              <tr className="bg-slate-50/50">
                <td className="border border-slate-200 px-3 py-2">Аналитические</td>
                <td className="border border-slate-200 px-3 py-2">Яндекс.Метрика</td>
                <td className="border border-slate-200 px-3 py-2">Обезличенная статистика посещений</td>
                <td className="border border-slate-200 px-3 py-2">До 1 года</td>
              </tr>
            </tbody>
          </table>
        </div>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">3. Управление cookies</h2>
        <p>
          Вы можете настроить или отключить cookies в настройках своего браузера. Ниже приведены
          ссылки на инструкции для наиболее распространённых браузеров:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>
            <strong>Google Chrome:</strong> Настройки → Конфиденциальность и безопасность → Файлы
            cookie и другие данные сайтов.
          </li>
          <li>
            <strong>Safari:</strong> Настройки → Конфиденциальность → Управление данными веб-сайтов.
          </li>
          <li>
            <strong>Mozilla Firefox:</strong> Настройки → Приватность и защита → Куки и данные
            сайтов.
          </li>
          <li>
            <strong>Microsoft Edge:</strong> Настройки → Файлы cookie и разрешения сайта →
            Управление файлами cookie.
          </li>
        </ul>
        <p>
          Обратите внимание: отключение <strong>необходимых</strong> cookies может привести к
          некорректной работе корзины, форм и авторизации на сайте.{" "}
          <strong>Аналитические</strong> cookies можно заблокировать без ущерба для основных
          функций сайта.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">4. Изменения политики</h2>
        <p>
          Мы вправе обновлять настоящую Политику в связи с изменениями законодательства или
          функциональности сайта. Актуальная версия документа с датой вступления в силу всегда
          доступна на данной странице.
        </p>
      </SimpleDoc>
    </div>
  );
}
