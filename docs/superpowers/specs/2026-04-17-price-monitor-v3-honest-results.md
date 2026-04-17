# Дизайн: Парсер цен v3 — честные результаты по всем 6 источникам

**Дата:** 2026-04-17
**Ветка:** `claude/heuristic-galileo-8fff2c`
**Предыдущие спеки:**
- `2026-04-13-price-monitor-design.md` — первая версия
- `2026-04-16-price-monitor-v2-design.md` — расширение на 6 источников

## Проблема

В текущей реализации `MarketPriceWidget` под товаром показывает только сайты, где что-то нашлось. Остальные — просто отсутствуют в таблице. Владелец не может отличить:

- «сайт не нашёл этот артикул»
- «сайт упал / таймаут»
- «сайт не настроен (нет кредов)»
- «артикул нашли, но в наличии 0 штук»

Вторая большая проблема — **бренды**. У товара в каталоге стоит, например, `Bosch`. На exist.ru тот же товар числится как `BOSCH`, на emex — `Robert Bosch`, на part-kom — `Бош`. Парсер сравнивает строки буква-в-букву и возвращает «не найдено», хотя товар на сайте есть. Проблема системная — затрагивает все товары и все бренды, не единичный случай.

## Цель

По каждому из 6 источников — **честный, проверяемый статус**. Никаких тихо проглоченных ошибок. Владелец видит:

- найдены ли офферы и по какой цене
- если нет — то почему конкретно (не нашли артикул / нашли, но не в наличии / сайт упал / не настроены креды)
- какие бренды сайт реально знает по этому артикулу (чтобы диагностировать проблему брендов)

Плюс — словарь алиасов брендов, который растёт по мере работы, и кнопка «добавить алиас» прямо из админки.

## Принцип: запрет на тихое проглатывание ошибок

Текущий код содержит конструкции вида:

```python
try:
    ...
except Exception:
    return []
```

Это ложь — возвращая пустой список, мы говорим «не найдено», хотя реально произошла ошибка. **В v3 такие конструкции запрещены.** Каждая ошибка должна быть категоризирована и возвращена как `ERROR` со статусом и текстом.

## Пять статусов

Каждый скрапер возвращает результат с одним из пяти статусов:

| Статус | Значение |
|---|---|
| `OFFERS` | Нашли один или несколько офферов в наличии. Возвращаем список (цена, срок доставки). |
| `OUT_OF_STOCK` | Артикул+бренд найден, но ни одного оффера в наличии. |
| `NOT_FOUND` | Сайт не знает такой артикул или бренд. Возвращаем `found_brands` — какие бренды вообще нашли по этому артикулу. |
| `ERROR` | Скрапер упал. Возвращаем категорию (`timeout`/`http_error`/`auth_failed`/`parse_error`/`unknown`) и текст. |
| `NOT_CONFIGURED` | Скрапер требует кредов, их нет. Возвращаем имя недостающей переменной окружения. |

## Дебаг-данные: `found_brands`

Ключевое для диагностики проблемы брендов. При `NOT_FOUND` каждый скрапер пытается найти **все бренды, которые сайт знает по этому артикулу** (без фильтра по бренду) и возвращает их списком:

```json
{
  "site": "part-kom.ru",
  "status": "NOT_FOUND",
  "found_brands": ["Robert Bosch", "Бош", "BOSCH"]
}
```

В UI это видно как:
```
part-kom.ru | НЕ НАЙДЕН | сайт знает: Robert Bosch, Бош, BOSCH [+ добавить как алиас]
```

Цена реализации — второй запрос без `brand`-фильтра для тех скраперов, где это применимо (exist, emex, vdopel, part-kom). Для plentycar — сканировать CSV без brand-проверки. Для armtek — API требует BRAND в запросе, при пустом вернёт ошибку; там `found_brands = null` (не пустой список — именно null, чтобы UI мог отличить «не поддерживается» от «ничего не нашли»).

**Соглашение:** `found_brands = []` означает «скрапер искал, но сайт ничего не знает об этом артикуле ни под одним брендом». `found_brands = null` означает «скрапер не поддерживает сбор списка брендов».

## Словарь алиасов брендов

### Таблица SQLite на VPS

```sql
CREATE TABLE brand_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical TEXT NOT NULL,        -- каноничное имя (как в каталоге)
    alias TEXT NOT NULL,            -- альтернативное написание
    site TEXT,                      -- NULL = для всех сайтов
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(canonical, alias, site)
);

CREATE INDEX idx_brand_aliases_alias ON brand_aliases(alias);
```

Хранение, а не JSON — потому что:
- легко править через SQL, видно когда/что добавили
- меньше риск сломать ручной правкой (синтаксис)
- атомарные апдейты из админки

### Нормализация

Функция `normalize_brand(s)` в `scrapers/base.py`:

```python
def normalize_brand(s: str) -> str:
    return re.sub(r'[\s\-.,_]+', '', s.lower())
```

Сравнение брендов происходит по нормализованной форме + расширяется через алиасы.

### Функция `brand_matches`

```python
def brand_matches(site_brand: str, query_brand: str, aliases: dict[str, set[str]]) -> bool:
    n_site = normalize_brand(site_brand)
    n_query = normalize_brand(query_brand)
    if n_site == n_query:
        return True
    # query_brand = "Bosch", aliases["bosch"] = {"robertbosch", "бош", "bo"}
    return n_site in aliases.get(n_query, set())
```

Словарь алиасов загружается раз при старте сервиса, перечитывается по сигналу SIGHUP или через админский endpoint `POST /reload-aliases`.

## API

### `POST /parse?article=X&brand=Y`

Прогоняет один артикул по всем 6 источникам, возвращает структурированный результат:

```json
{
  "article": "0242229699",
  "brand": "Bosch",
  "parsed_at": "2026-04-17T14:23:01Z",
  "sites": [
    {
      "site": "exist.ru",
      "status": "OFFERS",
      "offers": [
        {"price": 311, "delivery_days": 2, "in_stock": true}
      ],
      "found_brands": null,
      "error_category": null,
      "error_text": null,
      "duration_ms": 1240
    },
    {
      "site": "part-kom.ru",
      "status": "NOT_FOUND",
      "offers": [],
      "found_brands": ["Robert Bosch", "Бош", "BOSCH"],
      "error_category": null,
      "error_text": null,
      "duration_ms": 890
    },
    {
      "site": "armtek.ru",
      "status": "NOT_CONFIGURED",
      "offers": [],
      "found_brands": null,
      "error_category": null,
      "error_text": "ARMTEK_LOGIN / ARMTEK_PASSWORD не настроены",
      "duration_ms": 0
    },
    {
      "site": "emex.ru",
      "status": "ERROR",
      "offers": [],
      "found_brands": null,
      "error_category": "timeout",
      "error_text": "timeout after 30s",
      "duration_ms": 30000
    }
  ]
}
```

Всегда 6 элементов в `sites[]`, порядок фиксированный: `exist.ru, emex.ru, armtek.ru, part-kom.ru, vdopel.ru, plentycar.ru`.

### `POST /aliases`

Добавить алиас (из админки):

```json
POST /aliases
{ "canonical": "Bosch", "alias": "Robert Bosch", "site": null }
→ { "ok": true, "id": 42 }
```

### `GET /aliases`

Список всех алиасов (для отладки).

### `DELETE /aliases/{id}`

Удалить алиас.

### `POST /reload-aliases`

Перечитать словарь алиасов из БД (после добавления нового).

## Обработка ошибок — детальные правила

Каждый скрапер **обязан** категоризировать ошибки. Образец:

```python
async def get_result(self, article: str, brand: str, aliases: dict) -> SiteResult:
    if not self.is_configured():
        return SiteResult(
            site=self.SITE_NAME,
            status="NOT_CONFIGURED",
            error_text=f"{self.REQUIRED_ENV} не настроена",
        )

    start = time.monotonic()
    try:
        offers, found_brands = await self._scrape(article, brand, aliases)
        duration_ms = int((time.monotonic() - start) * 1000)

        if offers:
            return SiteResult(site=..., status="OFFERS", offers=offers, duration_ms=duration_ms)
        if found_brands and brand_in_found(brand, found_brands, aliases):
            return SiteResult(site=..., status="OUT_OF_STOCK", found_brands=found_brands, duration_ms=duration_ms)
        return SiteResult(site=..., status="NOT_FOUND", found_brands=found_brands, duration_ms=duration_ms)

    except httpx.TimeoutException as e:
        return SiteResult(site=..., status="ERROR", error_category="timeout", error_text=str(e), duration_ms=...)
    except httpx.HTTPStatusError as e:
        category = "auth_failed" if e.response.status_code in (401, 403) else "http_error"
        return SiteResult(site=..., status="ERROR", error_category=category, error_text=f"HTTP {e.response.status_code}", duration_ms=...)
    except (json.JSONDecodeError, ValueError) as e:
        return SiteResult(site=..., status="ERROR", error_category="parse_error", error_text=str(e), duration_ms=...)
    except Exception as e:
        log.exception(f"{self.SITE_NAME}: unexpected error")
        return SiteResult(site=..., status="ERROR", error_category="unknown", error_text=str(e), duration_ms=...)
```

**Запрещено:**
- `except Exception: return []` без категоризации
- Возврат пустого списка при реальной ошибке
- Логирование ошибки с `log.debug` — только `log.warning` или `log.exception`

## UI: `MarketPriceWidget` v3

### Макет

```
┌──────────────────────────────────────────────────────────────┐
│ Рыночные цены                   [В рынке]  [Обновить]        │
│                                                               │
│ Мин: 309₽  Медиана: 395₽  Макс: 509₽  (3 из 6 нашли товар)  │
│                                                               │
│ ┌──────────────┬──────────────┬────────┬─────────────────┐  │
│ │ Сайт         │ Статус       │ Цена   │ Доставка        │  │
│ ├──────────────┼──────────────┼────────┼─────────────────┤  │
│ │ exist.ru     │ 🟢 В наличии │ 311₽   │ 2 дн.           │  │
│ │              │              │ 332₽   │ 5 дн.           │  │
│ │ emex.ru      │ 🔴 Ошибка    │ —      │ timeout 30s     │  │
│ │ armtek.ru    │ ⚪ Нет кред.  │ —      │ ARMTEK_LOGIN    │  │
│ │ part-kom.ru  │ 🟠 Не нашёл  │ —      │ сайт знает:     │  │
│ │              │              │        │ Robert Bosch,   │  │
│ │              │              │        │ Бош, BOSCH      │  │
│ │              │              │        │ [+ алиас]       │  │
│ │ vdopel.ru    │ 🟡 Нет в нал.│ —      │ —               │  │
│ │ plentycar.ru │ 🟢 В наличии │ 410₽   │ 3 дн.           │  │
│ └──────────────┴──────────────┴────────┴─────────────────┘  │
└──────────────────────────────────────────────────────────────┘
```

### Цвета статусов

- 🟢 `OFFERS` — зелёный
- 🟡 `OUT_OF_STOCK` — жёлтый
- 🟠 `NOT_FOUND` — оранжевый
- 🔴 `ERROR` — красный
- ⚪ `NOT_CONFIGURED` — серый

### Кнопка «+ алиас»

Появляется только в строке `NOT_FOUND` рядом с списком `found_brands`. Каждый бренд — отдельная кликабельная ссылка-кнопка. По клику:

1. `POST /aliases { canonical: <brand товара>, alias: <выбранный found_brand>, site: <этот сайт> }`
2. `POST /reload-aliases` — сервер перечитывает словарь
3. `POST /parse?...` — повторный парсинг, таблица обновляется

Алиас привязан к сайту (`site` не `NULL`) — чтобы избежать коллизий (например, «GM» на одном сайте = Opel, на другом = General Motors).

### Показатели над таблицей

- **Мин/Медиана/Макс** — считаются только по офферам из `OFFERS`-строк (в наличии, с ценой > 0)
- **«N из 6 сайтов нашли товар»** — количество сайтов со статусом `OFFERS` или `OUT_OF_STOCK`
- **Бейдж зоны** (выше/в/ниже рынка) — как в v2, относительно `Мин` и `Макс`

## Схема работы: ночной прогон + кеширование

Парсер **не дёргает сайты при открытии товара в админке**. Работает по расписанию:

1. **Ночью в 03:00** (cron на VPS) — парсер обходит весь каталог (121 товар на 2026-04-17) по всем 6 источникам. Результат сохраняется в таблицу `site_results` (заменяет прошлый срез: `DELETE` + `INSERT`).
2. **Днём** — админка при открытии товара берёт данные из БД (`GET /offers?article=X&brand=Y`). Мгновенно, без запросов к внешним сайтам.
3. **Кнопка «Обновить»** в карточке товара — триггерит немедленный `POST /parse?article=X&brand=Y` только по одному товару. Используется редко — когда владелец хочет свежие данные по конкретной позиции прямо сейчас.

### Таблица `site_results`

```sql
CREATE TABLE site_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article TEXT NOT NULL,
    brand TEXT NOT NULL,
    site TEXT NOT NULL,
    status TEXT NOT NULL,           -- OFFERS / OUT_OF_STOCK / NOT_FOUND / ERROR / NOT_CONFIGURED
    offers_json TEXT,                -- JSON-массив офферов, если status=OFFERS
    found_brands_json TEXT,          -- JSON-массив брендов, если status=NOT_FOUND
    error_category TEXT,             -- timeout / http_error / auth_failed / parse_error / unknown
    error_text TEXT,
    duration_ms INTEGER,
    scraped_at TEXT NOT NULL,
    UNIQUE(article, brand, site)
);

CREATE INDEX idx_site_results_lookup ON site_results(article, brand);
```

Перед ночным прогоном: `DELETE FROM site_results;` — свежие данные полностью заменяют прошлые. История не хранится.

## Синхронизация VPS

Перед работой — обязательный шаг:

1. SSH на `5.42.103.41`
2. `diff -r /opt/price-monitor/scrapers ~/Documents/price-monitor/scrapers` — посмотреть, что расходится
3. Залить локальную версию: `rsync -av ~/Documents/price-monitor/ root@5.42.103.41:/opt/price-monitor/`
4. Применить миграцию БД (таблица `brand_aliases`)
5. `systemctl restart price-monitor`
6. `systemctl status price-monitor` — проверить, что поднялся

Причина: локальный код содержит все 6 скраперов, на VPS (по памяти) — только exist+emex актуальны.

## Тестирование

### Smoke-тест после деплоя

Один конкретный артикул, по которому владелец помнит реальную ситуацию, прогоняется через `POST /parse`. Проверка:

- 6 строк в ответе
- Каждая строка имеет валидный статус
- Нет скрытых `except` — если упало, видно категорию
- Для `NOT_FOUND` заполнен `found_brands` (где скрапер поддерживает)

### Unit-тесты

Для каждого скрапера — пара тест-кейсов:
- Мок HTTP-ответа с офферами → статус `OFFERS`, офферы распарсены
- Мок HTTP-ответа без искомого бренда → статус `NOT_FOUND`, `found_brands` заполнен
- Мок таймаута → статус `ERROR`, `error_category="timeout"`
- Мок 401 → статус `ERROR`, `error_category="auth_failed"`
- Мок битого JSON → статус `ERROR`, `error_category="parse_error"`

Хранение фикстур: `tests/fixtures/{site}/{case}.html` или `.json`.

### Интеграционный прогон

После деплоя на VPS — прогон всех товаров каталога (121 шт на 2026-04-15) через `/parse-all`. В логах не должно быть категории `unknown` — значит какая-то ошибка не отловлена.

## Известные ограничения

Фиксируем в ТЗ явно:

1. **armtek.ru** без дилерского логина/пароля всегда вернёт `NOT_CONFIGURED`. Нужны реальные креды от пользователя (не тестовые).
2. **plentycar.ru** — первый прогон медленный из-за скачивания 4 CSV-архивов (~100 МБ суммарно). Кеш живёт 12 часов.
3. **emex.ru / exist.ru** — cookie-сессии истекают. Мониторинг есть (колокольчик в админке), но обновлять cookies владельцу вручную.
4. **Сроки доставки** — у armtek возвращается как `DLVDT` (может быть дата, не число дней). В v3 берём только int-значения, остальное `null`.
5. **Cross-references (разные бренды на одном артикуле)** — не решаем. Парсер ищет конкретную пару артикул+бренд, остальные варианты показывает в `found_brands` для ручного разбирательства.

## Порядок реализации

1. **БД + миграция** — таблица `brand_aliases`, загрузка словаря при старте
2. **Модели** — `SiteResult`, `ErrorCategory` enum, обновлённый `Offer`
3. **`scrapers/base.py`** — обновлённый `BaseScraper.get_result()` с обязательной категоризацией ошибок, `brand_matches` с алиасами, метод `_find_all_brands()` для `NOT_FOUND`
4. **6 скраперов** — переписать по новому контракту, добавить `_find_all_brands`
5. **API** — новый формат ответа `/parse`, эндпоинты `/aliases*`, `/reload-aliases`
6. **Деплой на VPS** — синхронизация, миграция, рестарт
7. **TypeScript-клиент** — обновить типы `SiteResult`, `MarketData` в `src/app/lib/price-monitor.ts`
8. **Прокси-роут** — обновить `src/app/api/price-monitor/*` под новый формат
9. **UI** — переписать `MarketPriceWidget.tsx`: 6 строк всегда, кнопка алиасов, бейджи статусов
10. **Smoke-тест** — прогон одного реального артикула через всю цепочку, проверка всех 5 статусов в реальности
11. **Unit-тесты** — 5 кейсов на скрапер × 6 скраперов = 30 тестов
12. **Документация** — README парсера обновить: как добавлять алиасы, какие статусы бывают, как диагностировать

## Что система НЕ делает

- Не решает автоматически, что `BOSCH` = `Bosch` — ждёт подтверждения владельца через кнопку алиаса (первое подтверждение, дальше само)
- Не парсит cross-references (аналоги артикулов разных брендов)
- Не хранит историю цен — только актуальный срез
- Не использует Playwright / headless — только HTTP
- Не переустанавливает cookies exist/emex автоматически — это ручной процесс (уже решено в отдельной ветке)
