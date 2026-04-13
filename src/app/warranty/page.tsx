import type { Metadata } from "next";
import Link from "next/link";
import { CatalogChrome } from "../components/catalog/CatalogChrome";
import { SimpleDoc } from "../components/legal/SimpleDoc";
import { LEGAL_EFFECTIVE_DATE, LEGAL_VERSIONS } from "../lib/legal-docs";
import { SITE_URL } from "../lib/site";

export const metadata: Metadata = {
  title: "Гарантия",
  description: "Гарантийные условия на автозапчасти GM Shop 66.",
  alternates: { canonical: "/warranty" },
};

export default function WarrantyPage() {
  const breadcrumbLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Главная", item: `${SITE_URL}/` },
      { "@type": "ListItem", position: 2, name: "Гарантия", item: `${SITE_URL}/warranty` },
    ],
  };

  return (
    <div className="space-y-6 pb-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbLd) }}
      />
      <CatalogChrome crumbs={[{ label: "Главная", href: "/" }, { label: "Гарантия" }]} title="Гарантия" />
      <SimpleDoc title="Гарантийная политика">
        <p className="text-sm text-slate-500">
          Дата вступления в силу: {LEGAL_EFFECTIVE_DATE}. Версия документа: {LEGAL_VERSIONS.warrantyPolicy}.
        </p>
        <p>
          Настоящая Гарантийная политика определяет условия и порядок предъявления гарантийных требований по товарам,
          приобретённым в интернет-магазине GM Shop 66 (gmshop66.ru). Гарантия предоставляется в соответствии с
          законодательством Российской Федерации, в первую очередь Законом о защите прав потребителей (ЗоЗПП).
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">1. Общие гарантийные условия</h2>
        <p>
          Гарантийные сроки устанавливаются в зависимости от категории товара. Если гарантийный срок производителя
          превышает срок, указанный в таблице ниже, применяется срок производителя.
        </p>
        <table className="w-full text-sm border border-slate-200 mt-4">
          <thead>
            <tr className="bg-slate-50">
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Категория товара</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Примеры</th>
              <th className="border border-slate-200 px-3 py-2 text-left font-semibold">Гарантийный срок</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td className="border border-slate-200 px-3 py-2">Расходники</td>
              <td className="border border-slate-200 px-3 py-2">
                Фильтры, колодки, свечи, ремни, прокладки, сальники
              </td>
              <td className="border border-slate-200 px-3 py-2">30 дней или 1&nbsp;000 км пробега</td>
            </tr>
            <tr className="bg-slate-50/50">
              <td className="border border-slate-200 px-3 py-2">Запчасти общего назначения</td>
              <td className="border border-slate-200 px-3 py-2">
                Рычаги, стойки, ступицы, радиаторы, помпы, амортизаторы
              </td>
              <td className="border border-slate-200 px-3 py-2">6 месяцев</td>
            </tr>
            <tr>
              <td className="border border-slate-200 px-3 py-2">Агрегаты</td>
              <td className="border border-slate-200 px-3 py-2">Двигатель, КПП, раздаточная коробка</td>
              <td className="border border-slate-200 px-3 py-2">
                6 месяцев или по гарантии производителя (применяется больший срок)
              </td>
            </tr>
            <tr className="bg-slate-50/50">
              <td className="border border-slate-200 px-3 py-2">Электрика</td>
              <td className="border border-slate-200 px-3 py-2">
                Стартеры, генераторы, блоки управления (ЭБУ)
              </td>
              <td className="border border-slate-200 px-3 py-2">6 месяцев</td>
            </tr>
          </tbody>
        </table>
        <p className="mt-2">
          Если гарантийный срок, установленный производителем для конкретного товара, превышает указанный в таблице,
          применяется срок производителя.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">2. Условие установки на СТО</h2>
        <p>
          Гарантия на запчасти, требующие профессионального монтажа, действует только при условии установки на
          лицензированной (официально зарегистрированной) станции технического обслуживания (СТО). При гарантийном
          обращении Продавец вправе запросить:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>заказ-наряд от СТО;</li>
          <li>акт выполненных работ;</li>
          <li>данные СТО (наименование, ИНН/ОГРН, адрес).</li>
        </ul>
        <p>
          Исключение составляют расходные материалы, замена которых допускается самостоятельно: фильтры, свечи
          зажигания, моторные масла, технические жидкости, щётки стеклоочистителей.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">3. Порядок обращения по гарантии</h2>
        <p>
          Для предъявления гарантийного требования необходимо связаться с менеджером GM Shop 66 любым удобным
          способом (контакты — в разделе{" "}
          <Link href="/contacts" className="text-amber-600 hover:underline">
            Контакты
          </Link>
          ) и предоставить следующие документы:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>документ, подтверждающий покупку (чек, квитанция, выписка из заказа);</li>
          <li>заказ-наряд СТО (если применимо);</li>
          <li>акт выполненных работ (если применимо);</li>
          <li>фотоматериалы, фиксирующие дефект.</li>
        </ul>
        <p>
          Рекомендуемый состав заказ-наряда: государственный регистрационный номер автомобиля, ФИО владельца,
          марка и модель автомобиля, тип и объём двигателя, VIN-номер, перечень выполненных работ, стоимость
          работ и отметка об оплате.
        </p>
        <p>
          Срок рассмотрения гарантийного обращения — до 20 календарных дней с момента получения полного комплекта
          документов.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">4. Гарантия не распространяется на</h2>
        <ul className="list-disc pl-6 space-y-1">
          <li>механические повреждения, возникшие после передачи товара Покупателю;</li>
          <li>нарушение технологии монтажа или требований производителя по установке;</li>
          <li>естественный износ в пределах нормативного ресурса;</li>
          <li>воздействие агрессивных сред, химических веществ и ненадлежащих технических жидкостей;</li>
          <li>повреждения, полученные в результате дорожно-транспортного происшествия;</li>
          <li>
            самостоятельную установку деталей, для которых настоящей политикой предусмотрено обязательное обращение
            на СТО;
          </li>
          <li>вскрытие, ремонт или модификацию товара третьими лицами;</li>
          <li>использование товара не по назначению или с нарушением правил эксплуатации;</li>
          <li>
            шумы тормозных колодок в первые дни эксплуатации при отсутствии подтверждённого производственного
            дефекта;
          </li>
          <li>естественное старение материалов (резина, пластик, уплотнители);</li>
          <li>товары, выработавшие предельный ресурс (пробег, моточасы, количество циклов).</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">5. Права при подтверждённом дефекте</h2>
        <p>
          При подтверждении производственного дефекта Покупатель вправе предъявить требования в соответствии со
          ст.&nbsp;18 Закона о защите прав потребителей:
        </p>
        <ul className="list-disc pl-6 space-y-1">
          <li>замена товара на аналогичный;</li>
          <li>соразмерное уменьшение покупной цены;</li>
          <li>безвозмездное устранение недостатков;</li>
          <li>снижение цены;</li>
          <li>возврат уплаченной суммы и отказ от договора.</li>
        </ul>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">6. Экспертиза качества</h2>
        <p>
          В случае спора о причинах возникновения недостатка Продавец организует и оплачивает независимую
          экспертизу. Если экспертиза установит, что дефект возник по вине Покупателя (нарушение условий
          эксплуатации, механическое повреждение и т.&nbsp;д.), расходы на её проведение возмещаются Покупателем.
          Результаты экспертизы могут быть оспорены в судебном порядке.
        </p>

        <h2 className="text-lg font-semibold text-slate-900 mt-6">7. Место обращения</h2>
        <p>
          Гарантийные обращения принимаются в г.&nbsp;Екатеринбурге. Актуальный адрес и режим работы указаны в
          разделе{" "}
          <Link href="/contacts" className="text-amber-600 hover:underline">
            Контакты
          </Link>
          . Иных филиалов и пунктов приёма у Продавца нет.
        </p>
      </SimpleDoc>
    </div>
  );
}
