# Фаза 5: Клиенты, Контент (Баннеры), Аналитика, Настройки

## Обзор

Финальная фаза админ-панели Astra Motors. Добавляет 4 раздела: управление клиентами, баннерами на главной, аналитику (БД + Яндекс.Метрика API), настройки магазина.

Навигация в сайдбаре уже содержит ссылки на все 4 раздела — нужно создать страницы и API.

---

## 1. Клиенты

### Источник данных

Клиент = уникальная комбинация телефон/email из таблицы `orders`. Отдельной таблицы клиентов не создаём — агрегируем из заказов на лету. Для заметок и статуса создаём таблицу `customerNotes`.

### Новая таблица: `customerNotes`

```
customerNotes:
  id: integer PK autoincrement
  customerPhone: text NOT NULL (ключ привязки)
  status: text DEFAULT 'new' (new | regular | vip | wholesale)
  carModels: text (марки авто, через запятую — например "Opel Astra J, Chevrolet Cruze")
  notes: text (свободный текст заметок админа)
  adminId: integer REFERENCES admins(id)
  createdAt: text DEFAULT CURRENT_TIMESTAMP
  updatedAt: text DEFAULT CURRENT_TIMESTAMP
```

### Список клиентов: `/admin/customers`

Таблица (как в Заказах):

| Колонка | Источник |
|---------|----------|
| Клиент (имя + email) | `orders.customerName`, `orders.customerEmail` — берём из последнего заказа |
| Телефон | `orders.customerPhone` — ключ группировки |
| Заказов | `COUNT(orders)` |
| Сумма | `SUM(orders.total)` |
| Последний заказ | `MAX(orders.createdAt)` |
| Статус | `customerNotes.status` — бейдж (Новый / Постоянный / VIP / Оптовик) |

Фильтры:
- Поиск по имени, телефону, email (текстовое поле)
- Фильтр по статусу (dropdown)
- Сортировка: по дате последнего заказа (по умолчанию), по сумме, по количеству заказов

Пагинация: 20 клиентов на странице.

### Карточка клиента: `/admin/customers/[phone]`

Параметр в URL — телефон клиента (encodeURIComponent).

**Шапка:**
- Имя, статус-бейдж, телефон, email
- Марки авто (из `customerNotes.carModels`)
- Кнопка «Чаты» — ссылка на `/admin/conversations` с фильтром по контакту
- Кнопка «Редактировать» — открывает модальное окно для редактирования статуса, марок авто

**Статистика (4 карточки):**
- Количество заказов
- Общая сумма
- Средний чек
- Дата последнего заказа

**Заметки админа:**
- Блок с текстом из `customerNotes.notes`
- Кнопка «Редактировать» — inline-редактирование (textarea + сохранить)

**История заказов:**
- Таблица: № заказа (ссылка на `/admin/orders/[id]`), дата, товары (summary), сумма, статус-бейдж
- Пагинация

### API

- `GET /api/admin/customers` — список с фильтрами, поиском, пагинацией, сортировкой
- `GET /api/admin/customers/[phone]` — карточка: агрегированные данные + заметки + заказы
- `PUT /api/admin/customers/[phone]/notes` — обновление статуса, марок авто, заметок

---

## 2. Контент — Баннеры

### Существующая таблица: `banners`

Уже есть в схеме: `id`, `title`, `text`, `link`, `image`, `isActive`, `sortOrder`, `createdAt`, `updatedAt`.

### Список баннеров: `/admin/content`

Страница «Контент» = страница баннеров (единственный подраздел).

Каждый баннер в списке:
- Drag-handle (⋮⋮) для сортировки перетаскиванием
- Превью изображения (160×80)
- Заголовок + статус-бейдж (Активен / Выключен)
- Текст баннера
- Ссылка и позиция
- Кнопки: Редактировать, Вкл/Выкл (глазик), Удалить

Кнопка «+ Добавить баннер» сверху.

Неактивные баннеры отображаются полупрозрачно (opacity 0.5).

### Форма создания/редактирования

Модальное окно или отдельная страница:
- Заголовок (text input)
- Текст (text input)
- Ссылка (text input) — куда ведёт клик по баннеру
- Изображение — drag-n-drop загрузка, рекомендуемый размер 1200×400
- Статус — radio: Активен / Выключен
- Позиция — number input (автозаполняется следующим номером при создании)

Изображения сохраняются в `public/uploads/banners/`.

### На сайте

Карусель баннеров на главной странице. Показываются только активные, в порядке `sortOrder`. Автопрокрутка каждые 5 секунд, ручная навигация точками.

### API

- `GET /api/admin/banners` — список всех баннеров (отсортированных по sortOrder)
- `POST /api/admin/banners` — создание (с загрузкой изображения)
- `PUT /api/admin/banners/[id]` — обновление
- `PATCH /api/admin/banners/[id]/toggle` — вкл/выкл
- `DELETE /api/admin/banners/[id]` — удаление
- `PUT /api/admin/banners/reorder` — обновление порядка (массив id)
- `GET /api/banners` — публичный эндпоинт для сайта (только активные)

---

## 3. Аналитика

### Источники данных

1. **Яндекс.Метрика API** — посетители, визиты, просмотры страниц, источники трафика, отказы, время на сайте, просмотры товаров
2. **Своя БД (таблица `orders`)** — заказы, выручка, средний чек

### Настройка подключения

OAuth-токен и ID счётчика Метрики хранятся в таблице `settings` (ключи: `metrika_token`, `metrika_counter_id`). Настраиваются в разделе Настройки → Интеграции.

Google Analytics — только ссылка на дашборд (ID измерения хранится в `settings`, ключ: `ga_measurement_id`).

### Страница аналитики: `/admin/analytics`

**Переключатель периода:** Сегодня / 7 дней / 30 дней / 90 дней. По умолчанию — 7 дней.

**Ссылки:** Яндекс.Метрика ↗ и Google Analytics ↗ (открываются в новой вкладке).

**Сводка — 4 карточки:**

| Метрика | Источник | Сравнение |
|---------|----------|-----------|
| Посетители | Яндекс.Метрика API | % к предыдущему аналогичному периоду |
| Просмотры товаров | Яндекс.Метрика API (URL filter `/product/*`) | % к предыдущему периоду |
| Заказы | Своя БД (`orders`) | % к предыдущему периоду |
| Выручка | Своя БД (`SUM(orders.total)`) | % к предыдущему периоду |

**График заказов по дням:** Столбчатый график. Данные из таблицы `orders`, группировка по дате.

**Топ-5 товаров по просмотрам:** Из Яндекс.Метрика API (популярные URL `/product/*`). Название товара, количество просмотров.

**Состояние без Метрики:** Если токен не настроен — показываем placeholder с кнопкой «Настроить Метрику» → ведёт в Настройки → Интеграции. Карточки из БД (заказы, выручка) работают всегда.

### Яндекс.Метрика API

Эндпоинт: `https://api-metrika.yandex.net/stat/v1/data`

Заголовок: `Authorization: OAuth <token>`

Используемые метрики:
- `ym:s:visits` — визиты
- `ym:s:users` — посетители
- `ym:s:pageviews` — просмотры страниц
- `ym:s:bounceRate` — отказы
- `ym:s:avgVisitDurationSeconds` — среднее время

Dimensions для топ товаров: `ym:s:startURL` с фильтром по `/product/`.

### API

- `GET /api/admin/analytics/summary?period=7d` — сводка (Метрика + БД)
- `GET /api/admin/analytics/orders-chart?period=7d` — данные для графика заказов
- `GET /api/admin/analytics/top-products?period=7d` — топ товаров (Метрика)

Серверные API-роуты проксируют запросы к Метрике (токен не отдаётся на клиент).

---

## 4. Настройки

### Хранение

Все настройки в таблице `settings` (key-value store, уже есть в схеме).

Ключи:
- `contact_phone`, `contact_email`, `contact_address`, `contact_telegram`, `contact_whatsapp`
- `company_name`, `company_inn`, `company_ogrn`, `company_legal_address`
- `notification_telegram_bot_token`, `notification_telegram_chat_id`, `notification_vapid_public`, `notification_vapid_private`
- `schedule_monday` .. `schedule_sunday` (формат: "09:00-18:00" или "выходной")
- `metrika_token`, `metrika_counter_id`, `ga_measurement_id`

### Хаб настроек: `/admin/settings`

Сетка из 6 карточек-ссылок:
1. 📞 **Контакты** → `/admin/settings/contacts`
2. 🏢 **Реквизиты** → `/admin/settings/company`
3. 🔔 **Уведомления** → `/admin/settings/notifications`
4. 🕐 **Режим работы** → `/admin/settings/schedule`
5. 💬 **Быстрые ответы** → `/admin/settings/quick-replies` (уже есть)
6. 🔗 **Интеграции** → `/admin/settings/integrations`

### Подстраницы

Каждая подстраница — простая форма с полями ввода и кнопкой «Сохранить». Паттерн идентичен существующему Quick Replies.

**Контакты:** телефон, email, адрес, Telegram, WhatsApp.

**Реквизиты:** название ИП/ООО, ИНН, ОГРН, юридический адрес.

**Уведомления:** Telegram Bot Token, Telegram Chat ID, VAPID Public Key, VAPID Private Key. Кнопка «Проверить Telegram» — отправляет тестовое сообщение.

**Режим работы:** 7 строк (пн–вс), каждая: два time-input (с/до) или чекбокс «Выходной».

**Интеграции:** Яндекс.Метрика (ID счётчика + OAuth-токен, статус подключения), Google Analytics (ID измерения). Кнопка «Проверить подключение» для Метрики.

### Использование настроек на сайте

Контакты и реквизиты подтягиваются в шапку, подвал и страницу «Контакты» через серверный API. Режим работы — на странице контактов и в футере.

### API

- `GET /api/admin/settings/[group]` — получить группу настроек (contacts, company, notifications, schedule, integrations)
- `PUT /api/admin/settings/[group]` — обновить группу
- `POST /api/admin/settings/test-telegram` — отправить тестовое сообщение в Telegram
- `POST /api/admin/settings/test-metrika` — проверить подключение к Метрике
- `GET /api/settings/public` — публичный эндпоинт для сайта (контакты, режим работы — без секретных данных)

---

## Архитектура и паттерны

### Файловая структура (новые файлы)

```
src/app/admin/(app)/
├── customers/
│   ├── page.tsx              # Список клиентов
│   └── [phone]/page.tsx      # Карточка клиента
├── content/
│   └── page.tsx              # Баннеры
├── analytics/
│   └── page.tsx              # Дашборд аналитики
└── settings/
    ├── page.tsx              # Хаб настроек
    ├── contacts/page.tsx
    ├── company/page.tsx
    ├── notifications/page.tsx
    ├── schedule/page.tsx
    ├── integrations/page.tsx
    └── quick-replies/page.tsx  # Уже есть

src/app/api/admin/
├── customers/
│   ├── route.ts              # GET список
│   └── [phone]/
│       ├── route.ts          # GET карточка
│       └── notes/route.ts    # PUT заметки
├── banners/
│   ├── route.ts              # GET список, POST создание
│   ├── [id]/
│   │   ├── route.ts          # PUT обновление, DELETE удаление
│   │   └── toggle/route.ts   # PATCH вкл/выкл
│   └── reorder/route.ts      # PUT порядок
├── analytics/
│   ├── summary/route.ts
│   ├── orders-chart/route.ts
│   └── top-products/route.ts
└── settings/
    ├── [group]/route.ts      # GET/PUT по группам
    ├── test-telegram/route.ts
    └── test-metrika/route.ts

src/app/api/
├── banners/route.ts          # Публичный: активные баннеры
└── settings/public/route.ts  # Публичный: контакты, режим работы

src/app/admin/components/
├── CustomerFilters.tsx
├── CustomerList.tsx
├── CustomerCard.tsx
├── CustomerNotes.tsx
├── BannerList.tsx
├── BannerForm.tsx
├── BannerCarousel.tsx        # Компонент для главной
├── AnalyticsDashboard.tsx
├── AnalyticsChart.tsx
├── AnalyticsSummaryCard.tsx
├── SettingsHub.tsx
├── SettingsForm.tsx           # Универсальная форма настроек
└── ScheduleEditor.tsx
```

### Паттерны

- **Данные**: клиентская загрузка через `useState` + `useCallback` (как везде в админке)
- **Стили**: Tailwind CSS, gray/white/indigo палитра
- **Графики**: CSS-based столбчатый график (без внешних библиотек)
- **Drag-n-drop баннеров**: библиотека `@dnd-kit/core` (лучше поддержка touch + accessibility)
- **Загрузка файлов баннеров**: через `FormData`, сохранение в `public/uploads/banners/`
- **Метрика API**: серверные роуты проксируют запросы (токен не на клиенте)
- **Кеширование Метрики**: данные кешируются на 5 минут (in-memory Map с TTL)

### Миграция БД

Новая таблица `customerNotes`. Остальные таблицы (`banners`, `settings`) уже есть в схеме.
