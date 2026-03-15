export default function ContactsPage() {
  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-sky-900">Контакты</h1>
      <p className="text-slate-600">Свяжитесь с <span className="font-semibold text-sky-700">Astra Motors</span> — ответим и подберём запчасти.</p>

      <div className="rounded-xl border border-sky-100 bg-white p-6 shadow-sm space-y-4">
        <div>
          <p className="text-sm font-medium text-slate-500">Телефон</p>
          <p className="text-lg">
            <a href="tel:+79991234567" className="text-sky-600 font-medium hover:text-sky-700 hover:underline">
              +7 (999) 123-45-67
            </a>
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Адрес</p>
          <p className="text-slate-800">
            г. Москва, ул. Примерная, д. 1<br />
            (авторынок «Название», павильон А-12)
          </p>
        </div>
        <div>
          <p className="text-sm font-medium text-slate-500">Режим работы</p>
          <p className="text-slate-800">
            Пн – Пт: 9:00 – 18:00<br />
            Сб: 10:00 – 16:00<br />
            Вс: выходной
          </p>
        </div>
        <p className="text-sm text-slate-600 pt-2">
          Оставьте заявку на сайте или позвоните — подберём запчасти и уточним наличие.
        </p>
      </div>
    </div>
  );
}
