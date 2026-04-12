# Фаза 3: Заказы — Спецификация

## Контекст

Фазы 1 (фундамент) и 2 (товары + категории) завершены. Фаза 3 добавляет управление заказами в админ-панель.

Текущее состояние: заказы отправляются через `/api/send-order` в NDJSON файл + Telegram-уведомление. Таблица `orders` в SQLite существует, но не используется. Заказов пока нет (сайт не запущен).

## 1. Миграция send-order на SQLite

### Изменения в `/api/send-order`
- Заменить запись в NDJSON на вставку в таблицу `orders` через Drizzle ORM
- Генерировать `orderNumber` (формат: `AM-YYYYMMDD-NNN`, где NNN — порядковый номер за день)
- Telegram-уведомление остаётся без изменений
- NDJSON-логику удалить

### Данные для вставки
Все поля из формы заказа маппятся на колонки таблицы `orders`:
- `customerName`, `customerPhone`, `customerEmail`
- `items` (JSON-строка массива товаров)
- `total` (в копейках)
- `deliveryMethod`, `deliveryCity`, `deliveryAddress`, `deliveryCost`, `deliveryQuote`, `cdekPickupPoint`
- `paymentMethod`
- `status` = "new"
- `isUrgent` = false
- `userAgent`, `ip`
- `createdAt`, `updatedAt` = текущий ISO timestamp

## 2. Список заказов — `/admin/orders`

### Таблица
Колонки:
- Номер заказа
- Имя клиента + телефон
- Сумма (₽)
- Способ доставки (самовывоз / курьер)
- Статус (цветной бейдж)
- Дата создания

Клик по строке → переход на `/admin/orders/[id]`.

### Цвета статусов
- `new` — жёлтый (amber)
- `processing` — синий (indigo)
- `shipped` — голубой (blue)
- `delivered` — зелёный (green)
- `cancelled` — красный (red)

### Фильтры (над таблицей)
- Поиск по номеру заказа или имени клиента (debounce 300ms)
- Выпадающий список статусов (все / новый / в обработке / отправлен / доставлен / отменён)
- Выпадающий список способа доставки (все / самовывоз / курьер)
- Диапазон дат (от — до) — два input[type="date"]

### Сортировка
По умолчанию: по дате создания, новые сверху. Клик по заголовку колонки меняет направление.

### Пагинация
20 заказов на страницу. Использовать существующий компонент `Pagination`.

## 3. Детали заказа — `/admin/orders/[id]`

Все блоки на одной странице, без табов.

### Шапка
- Номер заказа + дата создания
- Текущий статус (бейдж)
- Кнопка "Срочный" (toggle) — PATCH `/api/admin/orders/[id]/urgent`

### Блок "Клиент"
- Имя, телефон, email
- Редактируемые через общий PUT

### Блок "Товары"
- Таблица: название, количество, цена за шт., сумма
- Итого внизу
- Кнопка "Редактировать" → inline-редактирование:
  - Изменить количество
  - Удалить позицию
  - Добавить позицию (поиск по каталогу)
  - Пересчёт итого автоматически

### Блок "Доставка"
- Способ (самовывоз / курьер)
- Город, адрес, пункт выдачи CDEK (если есть)
- Стоимость доставки
- Кнопка "Редактировать" → изменить поля доставки

### Блок "Оплата"
- Способ оплаты (СБП / карта / наличные)

### Блок "Смена статуса"
- Выпадающий список с новым статусом
- Текстовое поле комментария
- Кнопка "Сменить статус"
- POST `/api/admin/orders/[id]/status`
- Записывает в `orderStatusHistory` (adminId, status, comment, createdAt)

### Блок "История изменений"
- Лента снизу вверх (новые сверху)
- Каждая запись: дата/время, статус, комментарий, имя админа

## 4. API маршруты

### Новые маршруты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/admin/orders` | Список с фильтрами и пагинацией |
| GET | `/api/admin/orders/[id]` | Детали заказа + история статусов |
| PUT | `/api/admin/orders/[id]` | Редактирование (товары, клиент, доставка) |
| POST | `/api/admin/orders/[id]/status` | Смена статуса с комментарием |
| PATCH | `/api/admin/orders/[id]/urgent` | Toggle пометки "срочный" |

### Изменяемый маршрут

| Метод | Путь | Описание |
|-------|------|----------|
| POST | `/api/send-order` | Переключить запись с NDJSON на SQLite |

### GET `/api/admin/orders` — параметры запроса
- `search` — поиск по orderNumber или customerName (LIKE)
- `status` — фильтр по статусу
- `deliveryMethod` — фильтр по способу доставки
- `dateFrom`, `dateTo` — диапазон дат
- `page` — номер страницы (default: 1)
- `sortBy` — колонка сортировки (default: createdAt)
- `sortOrder` — asc / desc (default: desc)

Ответ: `{ orders: Order[], total: number, page: number, totalPages: number }`

### GET `/api/admin/orders/[id]` — ответ
```
{
  order: Order,
  statusHistory: StatusHistoryEntry[]
}
```

### PUT `/api/admin/orders/[id]` — тело запроса
```
{
  customerName?, customerPhone?, customerEmail?,
  items?,
  deliveryMethod?, deliveryCity?, deliveryAddress?,
  deliveryCost?, cdekPickupPoint?,
  paymentMethod?
}
```
Пересчёт `total` при изменении `items`. Обновление `updatedAt`.

### POST `/api/admin/orders/[id]/status` — тело запроса
```
{
  status: "new" | "processing" | "shipped" | "delivered" | "cancelled",
  comment?: string
}
```
Записывает в `orderStatusHistory` с `adminId` из сессии.

## 5. Технический подход

- **Паттерны**: следовать архитектуре Фазы 2 (client-компоненты с useEffect для загрузки данных, API через Route Handlers)
- **Компоненты**: OrderFilters, OrderList, OrderDetail, OrderItemsEditor, StatusChanger, StatusHistory
- **Библиотеки**: только то, что уже есть (Drizzle, better-sqlite3, Tailwind)
- **Валидация**: на уровне API — проверка типов и допустимых значений статусов
- **Аутентификация**: все `/api/admin/*` маршруты используют существующий `requireAdmin` middleware

## Что НЕ входит в Фазу 3

- Автоматические предупреждения о задержках
- Уведомление клиента при смене статуса (email/SMS)
- Печать заказа / накладной
- Экспорт заказов в Excel
- Интеграция с платёжными системами
