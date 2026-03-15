import Link from "next/link";

export default function HowToOrderPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-sky-900">Как заказать в Astra Motors</h1>
      <p className="text-slate-600">Несколько простых шагов — и заказ у вас.</p>

      <div className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm space-y-6">
        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">1. Выберите товар</h2>
          <p className="text-sm text-slate-600">
            Посмотрите каталог на главной странице, откройте карточку товара и нажмите «В корзину».
            Можно добавить несколько позиций и оформить один заказ.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">2. Оформите заказ</h2>
          <p className="text-sm text-slate-600">
            Перейдите в корзину, проверьте состав заказа и нажмите «Оформить заказ».
            Укажите имя, телефон и при необходимости комментарий (марка авто, удобное время для звонка).
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">3. Подтверждение</h2>
          <p className="text-sm text-slate-600">
            Менеджер свяжется с вами по телефону в течение рабочего дня, уточнит наличие,
            подберёт аналоги при необходимости и согласует способ получения заказа.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-medium text-slate-800 mb-2">Оплата и получение</h2>
          <p className="text-sm text-slate-600">
            Оплата при получении (наличными или картой) или по счёту для юр. лиц.
            Самовывоз со склада или доставка по городу — условия уточняйте у менеджера.
          </p>
        </section>

        <p className="text-sm text-slate-600 pt-2">
          <Link href="/contacts" className="text-sky-600 hover:text-sky-700 hover:underline font-medium">
            Контакты
          </Link>
          {" "}— адрес, телефон и режим работы.
        </p>
      </div>
    </div>
  );
}
