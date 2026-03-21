This is a [Next.js](https://nextjs.org) project bootstrapped with [`create-next-app`](https://nextjs.org/docs/app/api-reference/cli/create-next-app).

## Getting Started

First, run the development server:

```bash
npm run dev
# or
yarn dev
# or
pnpm dev
# or
bun dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result.

You can start editing the page by modifying `app/page.tsx`. The page auto-updates as you edit the file.

This project uses [`next/font`](https://nextjs.org/docs/app/building-your-application/optimizing/fonts) to automatically optimize and load [Geist](https://vercel.com/font), a new font family for Vercel.

## Learn More

To learn more about Next.js, take a look at the following resources:

- [Next.js Documentation](https://nextjs.org/docs) - learn about Next.js features and API.
- [Learn Next.js](https://nextjs.org/learn) - an interactive Next.js tutorial.

You can check out [the Next.js GitHub repository](https://github.com/vercel/next.js) - your feedback and contributions are welcome!

## Deploy on Vercel

The easiest way to deploy your Next.js app is to use the [Vercel Platform](https://vercel.com/new?utm_medium=default-template&filter=next.js&utm_source=create-next-app&utm_campaign=create-next-app-readme) from the creators of Next.js.

Check out our [Next.js deployment documentation](https://nextjs.org/docs/app/building-your-application/deploying) for more details.
# astra-motore

## Telegram: ежедневная статистика из Яндекс.Метрики

В проекте есть скрипт, который берёт сводку из Яндекс.Метрики за **вчера (по МСК)** и отправляет в Telegram.

### Переменные окружения

Смотри `.env.example`. На сервере в `/var/www/astra-motors/.env.local` должны быть:

- `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID`
- `YANDEX_METRIKA_OAUTH_TOKEN`
- `YANDEX_METRIKA_COUNTER_ID` (по умолчанию `107737371`)

### Получить OAuth-токен Яндекс.Метрики

Нужен OAuth-токен с доступом к Метрике. Его можно получить в кабинете Яндекса (раздел OAuth / токены) и выдать доступ к Метрике.

### Ручной запуск (проверка)

На сервере:

```bash
cd /var/www/astra-motors
npm run metrika:daily
```

### Автоматически каждый день (cron)

Пример: отправка каждый день в 10:00 по серверному времени:

```bash
crontab -e
```

Добавь строку:

```cron
0 10 * * * cd /var/www/astra-motors && /usr/bin/npm run -s metrika:daily >> /var/log/metrika-daily.log 2>&1
```

Логи:

```bash
tail -n 100 /var/log/metrika-daily.log
```

## Индексация через IndexNow (ускорение для Яндекса)
После деплоя можно “пнуть” Яндекс об изменениях через IndexNow:

```bash
npm run indexnow:send
```

Скрипт:
- использует ключ `public/astramotors-indexnow-20260319.txt`
- отправляет в `https://yandex.com/indexnow` список главных страниц + `/product/:id`

## Каталог и аналоги запчастей

- Товары и **аналоги** задаются **только из вашего файла/каталога** (например Excel «топ продаж»): связи между строками или явные колонки с артикулами аналогов.
- **Из интернета аналоги не подтягиваются** (ни парсинг, ни внешние API) — на карточке показываются только позиции, которые есть в том же наборе данных.

### Пилот Opel (строки 1–20 Excel)

- Данные в `src/app/data/products.ts` (массив `OPEL_PILOT_RAW`): название, артикул, количество и цена из файла; расчёт витринной цены — в коде (`src/app/lib/price.ts`, не выводится на сайте).
- Каталог на отдельной странице: `/catalog` (`src/app/catalog/page.tsx` + `ProductCatalog`). Главная — лендинг с превью позиций.
- Разделы: `src/app/data/catalog-sections.ts` — группы `CATALOG_GROUPS` и подразделы `CATALOG_SECTIONS`; у товара поле `category` совпадает с `title` раздела.
- Сверка с Excel на своей машине: положите файл на рабочий стол как `топ 100 продаж опель.xlsx` и выполните `npm run opel:excel-preview` (или `node scripts/opel-excel-to-ts.mjs "/путь/к/файлу.xlsx" 10`).
- Фото пилота: `public/images/catalog/` (источники — Wikimedia Commons, см. `public/images/catalog/ATTRIBUTION.md`). Повторная загрузка: `npm run catalog:images`. Это **тип детали**, не гарантия 1:1 с вашим артикулом; для точного вида по OEM — свои фото.

## Telegram-бот: меню «Статистика / Заказы»

Чтобы по кнопкам в Telegram получать актуальную статистику и сводку заказов, есть отдельный бот-скрипт:

```bash
npm run bot:telegram
```

### Требования

- В `.env.local` на сервере должны быть:
  - `TELEGRAM_BOT_TOKEN`
  - `TELEGRAM_CHAT_ID` (используется как админ-чат по умолчанию)
  - `YANDEX_METRIKA_OAUTH_TOKEN`
  - `YANDEX_METRIKA_COUNTER_ID`
  - `REPORT_TIMEZONE` (например `Asia/Yekaterinburg`)
- Заказы сохраняются в `data/orders.ndjson` при вызове `/api/send-order`.

### Запуск через PM2 (рекомендуется)

```bash
cd /var/www/astra-motors
pm2 start "npm run -s bot:telegram" --name astra-telegram-bot
pm2 save
```
