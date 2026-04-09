/** 6 плиток «Почему GM Shop 66» — преимущества магазина на главной. */

type Advantage = {
  title: string;
  text: string;
  accent: string;
};

const ADVANTAGES: Advantage[] = [
  {
    accent: "12+",
    title: "лет специализации на GM",
    text: "С 2013 года занимаемся только запчастями Opel и Chevrolet. Знаем каждый мотор, каждого поставщика и каждый подводный камень.",
  },
  {
    accent: "OEM",
    title: "Только оригинал и премиум-аналоги",
    text: "Поставки от официальных дилеров GM и проверенные европейские бренды: Bosch, Elring, INA, Delphi, Mahle, Hengst.",
  },
  {
    accent: "★",
    title: "Редкие позиции",
    text: "Находим детали, которые не могут достать крупные поставщики. Работа с редкими позициями — наша повседневная задача.",
  },
  {
    accent: "VIN",
    title: "Подбор по VIN за 15 минут",
    text: "Пришлите идентификационный номер автомобиля или артикул — менеджер подтвердит применимость и предложит варианты.",
  },
  {
    accent: "14",
    title: "дней на возврат",
    text: "Возврат по закону: 14 дней на товары надлежащего качества, гарантия производителя на каждую деталь.",
  },
  {
    accent: "🏁",
    title: "Самовывоз и доставка по Екб",
    text: "Адрес самовывоза: ул. Готвальда, 9. Курьерская доставка по Екатеринбургу и отправка по России через СДЭК.",
  },
];

export function HomeAdvantages() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Почему GM Shop 66</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Специализация на запчастях GM в Екатеринбурге с 2013 года
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ADVANTAGES.map((a) => (
          <article
            key={a.title}
            className="group relative overflow-hidden rounded-2xl border border-slate-200 bg-white p-6 shadow-sm transition-all hover:-translate-y-1 hover:border-amber-400/60 hover:shadow-lg"
          >
            <div className="mb-4 inline-flex h-14 w-14 items-center justify-center rounded-xl bg-amber-50 text-xl font-bold text-amber-700 ring-1 ring-amber-200/60">
              {a.accent}
            </div>
            <h3 className="text-base font-semibold text-slate-900">{a.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-slate-600">{a.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
