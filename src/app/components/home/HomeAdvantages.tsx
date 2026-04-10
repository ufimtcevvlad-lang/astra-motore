/** 6 плиток «Почему GM Shop 66» — преимущества магазина на главной. */

type Advantage = {
  title: string;
  text: string;
  accent: string;
};

const ADVANTAGES: Advantage[] = [
  {
    accent: "12+",
    title: "Знаем GM до винтика",
    text: "На моторах Z16XER, F16D4, A14NET и десятках других работаем 12 лет. Если деталь ставит в тупик другой магазин — это к нам.",
  },
  {
    accent: "OEM",
    title: "Только проверенные бренды",
    text: "Bosch, Elring, INA, Delphi, Mahle, Hengst, Filtron, Lemförder. Работаем с брендами, которым доверяем сами.",
  },
  {
    accent: "24ч",
    title: "Ответ в течение часа",
    text: "На связи каждый рабочий день в Telegram и WhatsApp. Подбор по VIN — 15 минут, ответ на запрос — в течение часа.",
  },
  {
    accent: "✓",
    title: "Отвечаем за подбор",
    text: "Подобрали по VIN — значит подойдёт. Если нет — поменяем или вернём деньги.",
  },
  {
    accent: "7000+",
    title: "Большой склад в Екб",
    text: "Расходники в наличии на ул. Готвальда, 9. Самовывоз сегодня или доставка курьером по городу.",
  },
  {
    accent: "RU",
    title: "Доставка по России",
    text: "Отправляем СДЭК в любой город. Стоимость рассчитаете прямо в корзине.",
  },
];

export function HomeAdvantages() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Почему GM Shop 66</h2>
        <p className="mt-2 text-sm text-slate-600 sm:text-base">
          Что вы получаете, заказывая у нас
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
