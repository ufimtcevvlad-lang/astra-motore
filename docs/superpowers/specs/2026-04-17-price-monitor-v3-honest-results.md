# Дизайн: Парсер цен v3 — честные результаты по 5 источникам

**Дата:** 2026-04-17
**Ветка:** `claude/heuristic-galileo-8fff2c`
**Предыдущие спеки:**
- `2026-04-13-price-monitor-design.md` — первая версия
- `2026-04-16-price-monitor-v2-design.md` — расширение на 6 источников

## Главный принцип v3

**Не ломать то, что уже работает.** У парсера на VPS уже есть: 5 рабочих скраперов (exist, emex, part-kom, vdopel, plentycar), ночной cron в 03:00, уведомления, cookie-авторизация exist/emex, хардкод-словарь `BRAND_ALIASES` в `scrapers/base.py`.

v3 **добавляет сверху**, а не переписывает:

- Новый метод `get_site_result()` на `BaseScraper` — тонкая обёртка над существующим `get_offers()`. Ловит исключения, категоризирует, возвращает статус. Старый `get_offers()` остаётся как есть.
- Таблица `brand_aliases` в SQLite — редактируемая из админки. Хардкод-словарь `BRAND_ALIASES` остаётся как fallback.
- Таблица `site_results` — кеш статусов по каждому сайту для ночного прогона. Существующая `offers` остаётся.
- Новый эндпоинт `/site-results?article=X&brand=Y` — возвращает 5 строк со статусами из кеша.
- Эндпоинты `/aliases*` — CRUD словаря.

Старые эндпоинты (`/parse`, `/parse-all`, `/offers`, `/status`, `/notifications`) и схема `offers` не трогаем. Если v3 сломается — откат = убрать новое, старое работает.

## Проблема

В текущем `MarketPriceWidget` под товаром показываются только сайты, где что-то нашлось. Остальные отсутствуют в таблице. Владелец не может отличить:

- «сайт не нашёл артикул»
- «сайт упал / таймаут»
- «сайт не настроен (нет кредов)»
- «артикул нашли, но в наличии 0 штук»

Вторая проблема — **бренды**. В каталоге `Bosch`, на exist.ru `BOSCH`, на emex `Robert Bosch`, на part-kom `Бош`. Парсер сравнивает буква-в-букву и возвращает «не найдено», хотя товар есть. Это системная проблема всех товаров, не единичный случай.

Существующий `BRAND_ALIASES` в коде покрывает 5 случаев (`gmoe`, `generalmotors`, `psaoe`, `ks`, `kolbenschmidt`). Этого мало и редактируется только через деплой.

## Цель

По каждому из 5 источников — честный статус. Плюс словарь алиасов, редактируемый из админки одной кнопкой.

## Пять статусов

| Статус | Значение |
|---|---|
| `OFFERS` | Нашли офферы в наличии. Возвращаем список (цена, срок доставки). |
| `OUT_OF_STOCK` | Артикул+бренд найден, но ни одного оффера в наличии. |
| `NOT_FOUND` | Сайт не знает артикул или бренд. Возвращаем `found_brands`. |
| `ERROR` | Скрапер упал. Категория + текст. |
| `NOT_CONFIGURED` | Требуются креды, их нет. Имя переменной окружения. |

## Запрет на тихое проглатывание ошибок

`except Exception: return []` без категоризации запрещён в новом коде `get_site_result()`. Существующий `get_offers()` остаётся как есть — обёртка над ним ловит все исключения и категоризирует сама.

## `found_brands` — дебаг-данные для NOT_FOUND

Ключевое для диагностики. При `NOT_FOUND` скрапер ищет **все бренды, которые сайт знает по этому артикулу** (без фильтра по бренду). Пример:

```json
{
  "site": "part-kom.ru",
  "status": "NOT_FOUND",
  "found_brands": ["Robert Bosch", "Бош"]
}
```

В UI:
```
part-kom.ru | НЕ НАЙДЕН | сайт знает: Robert Bosch [+ алиас] · Бош [+ алиас]
```

**Соглашение:**
- `found_brands = null` — скрапер не поддерживает поиск без бренда (для начала — все, кроме exist)
- `found_brands = []` — скрапер искал, сайт ничего не знает
- `found_brands = [...]` — сайт знает эти бренды, но не искомый

**На старте v3:** поддержка `found_brands` только у exist.ru (у него `_data` массив с `CatalogName` сразу в ответе). Остальные возвращают `null`. Это не блокирует релиз — таблица всё равно показывает честный статус. Дополним позже по мере надобности.

## Словарь алиасов

### Два источника, приоритет у БД

1. **Таблица `brand_aliases` (SQLite)** — редактируется из админки, загружается в память при старте сервиса + по `/reload-aliases`.
2. **Хардкод `BRAND_ALIASES` в `scrapers/base.py`** — fallback, пять существующих записей (`gmoe`, `generalmotors` и т.д.).

При матчинге бренда — сначала БД, потом хардкод.

### Схема

```sql
CREATE TABLE brand_aliases (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    canonical TEXT NOT NULL,        -- каноничное имя (как в каталоге)
    alias TEXT NOT NULL,             -- альтернативное написание
    site TEXT,                       -- NULL = для всех сайтов
    created_at TEXT NOT NULL DEFAULT (datetime('now')),
    UNIQUE(canonical, alias, site)
);

CREATE INDEX idx_brand_aliases_alias ON brand_aliases(alias);
```

Алиас привязывается к сайту (`site IS NOT NULL`) — потому что "GM" на одном сайте может значить Opel, на другом General Motors. Глобальные алиасы (site=NULL) возможны, но по умолчанию из админки кнопка добавляет site-specific.

### Изменения в `scrapers/base.py`

Существующая функция `brand_matches(site_brand, catalog_brand)` расширяется — принимает опциональный `site` и `db_aliases`:

```python
def brand_matches(site_brand, catalog_brand, site=None, db_aliases=None):
    # existing logic: normalize + BRAND_ALIASES hardcode
    # + new: check db_aliases for (canonical=catalog_brand, alias=site_brand, site in (None, site))
```

Существующие вызовы `brand_matches(a, b)` продолжают работать (новые аргументы опциональные).

## BaseScraper.get_site_result — обёртка

Добавляется метод на `BaseScraper`:

```python
async def get_site_result(self, article, brand, db_aliases=None) -> SiteResult:
    if not self.is_configured():
        return SiteResult(site=self.SITE_NAME, status="NOT_CONFIGURED",
                          error_text=f"{self.REQUIRED_ENV} not set")

    start = time.monotonic()
    try:
        offers = await self.get_offers(article, brand)  # существующий метод
        duration_ms = int((time.monotonic() - start) * 1000)

        if offers:
            in_stock = [o for o in offers if o.in_stock is not False]
            if in_stock:
                return SiteResult(status="OFFERS", offers=in_stock, duration_ms=duration_ms, ...)
            return SiteResult(status="OUT_OF_STOCK", duration_ms=duration_ms, ...)

        found_brands = await self._find_all_brands_safe(article)  # null для не поддерживающих
        return SiteResult(status="NOT_FOUND", found_brands=found_brands, duration_ms=duration_ms, ...)

    except httpx.TimeoutException as e:
        return SiteResult(status="ERROR", error_category="timeout", error_text=str(e), ...)
    except httpx.HTTPStatusError as e:
        cat = "auth_failed" if e.response.status_code in (401, 403) else "http_error"
        return SiteResult(status="ERROR", error_category=cat, error_text=f"HTTP {e.response.status_code}", ...)
    except (json.JSONDecodeError, ValueError) as e:
        return SiteResult(status="ERROR", error_category="parse_error", error_text=str(e), ...)
    except Exception as e:
        log.exception(f"{self.SITE_NAME}: unexpected")
        return SiteResult(status="ERROR", error_category="unknown", error_text=str(e), ...)
```

Метод `is_configured()` — по умолчанию `return True`, переопределяется в exist/emex/part-kom (проверяют наличие cookies).

Метод `_find_all_brands_safe()` — на `BaseScraper` возвращает `None`. Скрапер переопределяет, если может. На старте — только exist.

**Существующий `get_offers()` не меняется.** Ночной cron и старый `/parse` продолжают работать.

## API — добавленные эндпоинты

### `GET /site-results?article=X&brand=Y`

Возвращает 5 строк со статусами из кеша (обновляется ночным прогоном или по кнопке «Обновить»):

```json
{
  "article": "GN1023412B1",
  "brand": "Delphi",
  "scraped_at": "2026-04-17T03:14:22Z",
  "sites": [
    {"site": "exist.ru", "status": "OFFERS", "offers": [{"price": 9800, "delivery_days": 2, "in_stock": true}], "found_brands": null, "error_category": null, "error_text": null, "duration_ms": 1240},
    {"site": "emex.ru", "status": "OFFERS", "offers": [{"price": 10500, "delivery_days": 5, "in_stock": true}], ...},
    {"site": "part-kom.ru", "status": "NOT_FOUND", "offers": [], "found_brands": null, ...},
    {"site": "vdopel.ru", "status": "OFFERS", "offers": [{"price": 10500, "delivery_days": 1, "in_stock": true}], ...},
    {"site": "plentycar.ru", "status": "ERROR", "error_category": "timeout", "error_text": "CSV download timeout", ...}
  ]
}
```

Порядок `sites[]` фиксированный: `exist.ru, emex.ru, part-kom.ru, vdopel.ru, plentycar.ru`.

### `POST /parse-v3?article=X&brand=Y`

Новая версия `/parse` — прогоняет **в реальном времени** один товар по 5 скраперам через `get_site_result`, сохраняет в `site_results`, возвращает тот же формат, что `GET /site-results`. Используется кнопкой «Обновить» в админке.

Старый `POST /parse` остаётся — используется ночным cron. Позже мигрируем cron на v3, но не в этом релизе.

### `GET /aliases`

Список алиасов (для отладки).

### `POST /aliases`

```json
{ "canonical": "Delphi", "alias": "DELPHI USA", "site": "vdopel.ru" }
→ { "ok": true, "id": 42 }
```

### `DELETE /aliases/{id}`

### `POST /reload-aliases`

Перечитать БД в память после добавления. Вызывается автоматически после `POST /aliases`.

## Ночной cron

На старте v3 **ничего не меняем**. Существующий `runner.py` продолжает писать в `offers`. Админка читает `site_results` — если пусто по товару, fallback на `offers` (старый формат, UI показывает только найденные сайты).

После первой проверки v3 в бою — добавим вызов `get_site_result` в runner и переключим админку полностью на `site_results`. Это отдельный PR.

### Таблица `site_results`

```sql
CREATE TABLE site_results (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    article TEXT NOT NULL,
    brand TEXT NOT NULL,
    site TEXT NOT NULL,
    status TEXT NOT NULL,
    offers_json TEXT,
    found_brands_json TEXT,
    error_category TEXT,
    error_text TEXT,
    duration_ms INTEGER,
    scraped_at TEXT NOT NULL,
    UNIQUE(article, brand, site)
);

CREATE INDEX idx_site_results_lookup ON site_results(article, brand);
```

`UPSERT` при записи — одна запись на (артикул, бренд, сайт).

## UI: MarketPriceWidget v3

```
┌─────────────────────────────────────────────────────────┐
│ Рыночные цены                     [В рынке] [Обновить]  │
│                                                          │
│ Мин: 9800₽  Медиана: 10500₽  Макс: 10500₽  (3/5 нашли) │
│                                                          │
│ ┌─────────────┬──────────────┬────────┬──────────────┐ │
│ │ exist.ru    │ 🟢 В наличии │ 9800₽  │ 2 дн.        │ │
│ │ emex.ru     │ 🟢 В наличии │ 10500₽ │ 5 дн.        │ │
│ │ part-kom.ru │ 🟠 Не нашёл  │ —      │ [+ алиас]    │ │
│ │ vdopel.ru   │ 🟢 В наличии │ 10500₽ │ 1 дн.        │ │
│ │ plentycar   │ 🔴 Ошибка    │ —      │ timeout      │ │
│ └─────────────┴──────────────┴────────┴──────────────┘ │
└─────────────────────────────────────────────────────────┘
```

### Цвета

- 🟢 OFFERS — зелёный
- 🟡 OUT_OF_STOCK — жёлтый
- 🟠 NOT_FOUND — оранжевый
- 🔴 ERROR — красный
- ⚪ NOT_CONFIGURED — серый

### Без имён продавцов

Ни "Уфа-склад", ни "Магазин Петрова" — только статус + цена + срок доставки. Аггрегаторы показывают мусор в этих полях.

### Кнопка «+ алиас»

Только в строках `NOT_FOUND` с непустым `found_brands`. Каждый из `found_brands` — отдельная кнопка. Клик:

1. `POST /aliases { canonical: <brand товара>, alias: <found_brand>, site: <этот сайт> }`
2. `POST /parse-v3?...` — перепарсим этот товар сразу
3. Таблица перерисовывается

Если `found_brands = null` — кнопки нет, просто статус «Не нашёл» без подробностей.

### Показатели

- **Мин/Медиана/Макс** — по офферам из `OFFERS`-строк
- **«N из 5 нашли»** — количество сайтов со статусом `OFFERS` или `OUT_OF_STOCK`
- **Бейдж зоны** — красный/зелёный/жёлтый относительно Мин-Макс

## Синхронизация VPS

Перед работой:

1. SSH на `5.42.103.41`
2. `diff -r /opt/price-monitor/scrapers ~/Documents/price-monitor/scrapers`
3. Залить локальную версию: `rsync -av ~/Documents/price-monitor/ root@5.42.103.41:/opt/price-monitor/`
4. Применить миграции (таблицы `brand_aliases`, `site_results`)
5. `systemctl restart price-monitor`
6. Smoke-тест: `curl ...:8080/parse-v3?article=GN1023412B1&brand=Delphi` — должен вернуть 5 строк

## Тестирование

### Unit-тесты — критичное

1. **`brand_matches` с БД-алиасами** — покрыть все варианты: только хардкод, только БД, БД+site=NULL, БД+конкретный сайт, конфликт хардкод/БД (БД побеждает).
2. **`get_site_result` обёртка** — по одному тесту на каждую категорию ошибок (mock `get_offers` выбрасывает соответствующее исключение).
3. **`is_configured` exist/emex** — возвращает False если переменной окружения нет.

Скрапер-специфичные тесты существующих `get_offers` трогать не нужно — они уже работают в бою.

### Smoke-тест на VPS

Один артикул (владелец выберет живой пример), прогон через `/parse-v3`. Проверка:

- 5 строк в ответе
- Каждая имеет валидный статус
- Добавление алиаса меняет результат следующего прогона

## Что система НЕ делает

- Не решает автоматически `BOSCH = Bosch` — ждёт кнопки владельца
- Не парсит cross-references
- Не хранит историю цен
- Не использует Playwright
- Не обновляет cookies автоматически (ручной процесс, уже решён)

## Что НЕ делаем в v3

- Не добавляем 6-й сайт (armtek выкинут, zzap — лишний риск, 5 источников достаточно)
- Не переписываем существующие скраперы
- Не меняем ночной cron (добавим `get_site_result` позже)
- Не поддерживаем `found_brands` везде — только у exist.ru на старте

## Порядок реализации

Ниже — в плане `2026-04-17-price-monitor-v3.md`. Фазы:

1. **БД** — миграции `brand_aliases`, `site_results`
2. **Модели** — `SiteResult`, `ErrorCategory`
3. **BaseScraper** — `get_site_result` обёртка, `is_configured`, `_find_all_brands_safe`, расширение `brand_matches`
4. **exist.ru** — единственный скрапер с реализацией `_find_all_brands_safe`
5. **API** — `/parse-v3`, `/site-results`, `/aliases*`, `/reload-aliases`
6. **Деплой на VPS** — rsync, миграции, restart, smoke
7. **TypeScript клиент + прокси-роуты** — новые типы, эндпоинты
8. **MarketPriceWidget v3** — таблица на 5 строк, кнопка алиаса

Старый `/parse` и ночной cron не трогаем до отдельного PR.
