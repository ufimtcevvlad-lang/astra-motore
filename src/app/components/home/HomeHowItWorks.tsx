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
    text: "Выбираете в каталоге, пишете в Telegram / WhatsApp или отправляете VIN запрос через форму на сайте.",
  },
  {
    num: "02",
    title: "Подтверждение",
    text: "Менеджер сверит деталь по VIN, назовёт точную цену и срок. Если нужно — предложит альтернативу.",
  },
  {
    num: "03",
    title: "Получение",
    text: "Забираете на ул. Готвальда, 9 или получаете курьером по Екатеринбургу. Из других городов — через СДЭК.",
  },
];

export function HomeHowItWorks() {
  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Как заказать запчасть</h2>
        <p className="mt-2 text-sm text-slate-600">Три шага — от запроса до получения</p>
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
