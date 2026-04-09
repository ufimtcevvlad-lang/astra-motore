/** Блок «Как мы работаем» — 3 шага оформления заказа. */

type Step = {
  num: string;
  title: string;
  text: string;
};

const STEPS: Step[] = [
  {
    num: "01",
    title: "Заявка",
    text: "Оформите заказ через каталог, корзину или пришлите VIN и артикул в WhatsApp. Ответим за 15 минут в рабочее время.",
  },
  {
    num: "02",
    title: "Подбор и подтверждение",
    text: "Менеджер проверит применимость по VIN, подтвердит наличие, окончательную цену и срок поставки. Согласуем способ получения.",
  },
  {
    num: "03",
    title: "Получение",
    text: "Самовывоз с ул. Готвальда, 9 или курьерская доставка по Екатеринбургу. По России — отправка через СДЭК.",
  },
];

export function HomeHowItWorks() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Как мы работаем</h2>
        <p className="mt-2 text-sm text-slate-600">Три шага от заявки до получения запчасти</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {STEPS.map((step, i) => (
          <article
            key={step.num}
            className="relative rounded-2xl border border-slate-200 bg-white p-6 shadow-sm"
          >
            <div className="flex items-baseline gap-3">
              <span className="text-3xl font-black text-amber-400">{step.num}</span>
              <h3 className="text-lg font-semibold text-slate-900">{step.title}</h3>
            </div>
            <p className="mt-3 text-sm leading-relaxed text-slate-600">{step.text}</p>
            {i < STEPS.length - 1 ? (
              <div className="absolute -right-2 top-1/2 hidden h-6 w-6 -translate-y-1/2 items-center justify-center text-amber-400 md:flex">
                <svg viewBox="0 0 24 24" width="20" height="20" fill="none" aria-hidden>
                  <path
                    d="M9 6l6 6-6 6"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}
