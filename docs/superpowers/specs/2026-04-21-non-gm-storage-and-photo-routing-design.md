# Не-GM хранилище + роутинг фото в парсере — дизайн

**Дата:** 2026-04-21
**Статус:** черновик, ожидает review
**Цель:** Сохранять «не-GM» позиции, отбракованные при Excel-импорте, в отдельную БД. Парсер фото распознаёт их артикулы и складывает снимки в отдельную папку — для будущего второго (не-GM) сайта.

---

## Контекст

Текущий магазин `gmshop66.ru` продаёт только запчасти GM (Opel/Chevrolet/Cadillac/Buick). При Excel-импорте через admin-панель работает классификатор `src/app/lib/import/classify.ts` со словарём токенов `non-gm-markers.ts` — позиции с упоминанием `kia`, `tdi`, `vw` и т.п. возвращаются в preview как «Отклонено» и **никуда не сохраняются**.

В планах второй сайт (домена ещё нет) для не-GM запчастей. Логика та же — каталог из 1С, фото от парсера. Сейчас задача:

1. Не терять отбракованные при импорте артикулы.
2. Чтобы парсер фото видел оба «склада» SKU и складывал снимки не-GM в отдельную папку — заранее, до того как поднимется второй сайт.

Товар на складе физически перемешан: один батч съёмки `QR → товар → QR → товар → QR` может содержать любую комбинацию GM и не-GM. Парсер уже делит группы по QR, нужно только правильно роутить распознанные SKU.

---

## Архитектура

```
┌─────────────────┐                  ┌────────────────────────┐
│ Excel-импорт    │── GM-позиции ───>│ data/shop.db           │
│ (admin-панель)  │                  │   products              │
│                 │── не-GM ────────>│ data/shop-non-gm.db    │
│                 │                  │   products (отдельная)  │
└─────────────────┘                  └──────────┬─────────────┘
                                                │
                                                ▼
                       ┌──────────────────────────────────────┐
                       │ gmshop_parser (launchd демон)        │
                       │ db_sync: SCP обе БД с прода          │
                       │ whitelist.classify(sku):             │
                       │   "gm" / "non_gm" / None             │
                       └──────────┬───────────────────────────┘
                                  │
            ┌─────────────────────┼─────────────────────┐
            ▼                     ▼                     ▼
~/Pictures/сортивка/<sku>/   ~/Pictures/             ~/Desktop/
(GM, далее в                сортировка не gm/<sku>/  не-распознано/
import-sorted-photos.mjs)   (лежит до 2-го сайта)    (OCR/каталог фейл)
```

**Ключевые принципы:**

- Не-GM в **отдельной БД** с **той же схемой** что у GM (Drizzle). Завтра поднимаем второй Next.js-фронт, направляем его на `shop-non-gm.db` — работает.
- Сайт `gmshop66.ru` про не-GM-БД даже не знает (нулевой риск засветить не-GM в каталоге).
- Импортёр `scripts/import-sorted-photos.mjs` **не трогает** не-GM фото — они просто лежат в папке как HEIC. Конвертация HEIC→WebP и заливка делаются когда поднимется второй сайт.
- Парсер при `OcrResult.reason="ok"` делает **`whitelist.classify(sku)`** против обеих БД и выбирает целевую папку. Если нет нигде — group в `не-распознано` (как сейчас).

---

## Изменения на сайте (`autoparts-shop`)

### Новые файлы

```
data/shop-non-gm.db                     # SQLite, та же схема что shop.db
src/app/lib/db/non-gm.ts                # Drizzle-клиент для второй БД
                                        # (re-export schema из db/schema.ts)
drizzle/non-gm/0000_init.sql            # миграция базовой схемы products
```

### Существующая схема `products`

Переиспользуется как есть. На второй сайт там избыточно (slug, image, images, categoryId), но это безвредно — парсер их не трогает, остаются NULL/пустые. Когда будет второй сайт, поля пригодятся.

### `/api/admin/products/import/confirm` — изменения

Body расширяется одним полем:

```ts
{ newItems: ImportItem[]; updateIds: UpdateItem[]; nonGmItems: ImportItem[] }
```

Для каждого `nonGmItem`:

- `INSERT OR IGNORE INTO products` в `shop-non-gm.db` (дедуп по `sku` через `UNIQUE`-индекс).
- `external_id = "non-gm-" + sku` — детерминированно, чтобы повторный импорт того же артикула не плодил дубликаты на разных `external_id`.
- `slug = ""`, `image = ""`, `images = ""`, `category_id = NULL` — заполнятся когда поднимем второй сайт.
- `in_stock = 1`, `created_at = updated_at = now`.

Ответ дополняется: `nonGmAdded: N, nonGmSkipped: M`.

### `ExcelImport.tsx` — изменения UI

Секция «Отклонено (10)» переименовывается в **«Не-GM (10) — сохраним для парсера фото»** с подзаголовком:

> Артикулы попадут в `shop-non-gm.db`. Парсер фото будет складывать их снимки в `~/Pictures/сортировка не gm/<артикул>/`. На сайт `gmshop66.ru` они не попадут.

Кнопка `Импортировать` сохраняет всё разом — GM в `shop.db`, не-GM в `shop-non-gm.db`. Итог-сообщение:

> Добавлено GM: 36 · Обновлено: 0 · Не-GM сохранено: 10 (новых) · Дублей не-GM: 0

### Что не меняем

- Словарь токенов `non-gm-markers.ts` — оставляем как есть.
- Логика `classify(name, brand)` — оставляем как есть. Меняется только что делаем с результатом (раньше выбрасывали → теперь сохраняем).

### Чего НЕТ в админке

- Просмотра/редактирования списка не-GM (через `sqlite3` руками, если надо).
- Удаления не-GM позиций (1С перетрёт всё равно).
- Обновления цены/названия не-GM при повторном импорте (главное — артикул).

---

## Изменения в парсере (`part-photo-sorter/gmshop_parser`)

### `config.py` — дополнения

```python
SHOP_DB_NON_GM = Path(os.environ.get(
    "GM_SHOP_NON_GM_DB",
    str(HOME / "Documents" / "autoparts-shop" / "data" / "shop-non-gm.db"),
))
OUTPUT_NON_GM = Path(os.environ.get(
    "GM_SHOP_OUTPUT_NON_GM",
    str(HOME / "Pictures" / "сортировка не gm"),
))
```

В `db_sync.py` добавляем env:

```python
PROD_NON_GM_PATH = os.environ.get(
    "GM_SHOP_PROD_NON_GM_DB_PATH",
    "/var/www/astra-motors/data/shop-non-gm.db",
)
```

(Прод-путь временный — на текущей итерации файла на проде ещё нет; SCP будет валиться по 404, но `db_sync` это переживает gracefully.)

### `whitelist.py` — рефактор API

**Было:**

```python
def load() -> set[str]: ...
```

**Становится:**

```python
from typing import Literal

SkuClass = Literal["gm", "non_gm"]

def classify(sku: str) -> SkuClass | None:
    """Где живёт этот SKU. None если нет ни в одной БД."""

def load_all() -> dict[str, SkuClass]:
    """Загружает обе БД одним проходом — для прогрева кэша на старте батча.
    Если SKU в обеих БД (коллизия) — приоритет 'gm', notifier-предупреждение."""
```

Внутри `load_all()`: два `SELECT sku FROM products` (по разным БД). Коллизию определяем тривиальной проверкой `sku in gm_set and sku in non_gm_set`.

### `db_sync.py` — синк обеих БД

```python
def ensure_fresh_all() -> tuple[bool, bool]:
    """Возвращает (gm_synced, non_gm_synced). Каждая БД синкается
    независимо: если SCP non-GM упал, GM-синк не блокируется."""
```

Поведение:
- Каждая БД синкается своим SCP-вызовом (отдельный try/except).
- TTL по 60с на каждую (env `GM_SHOP_DB_SYNC_TTL`).
- Если non-GM-БД на проде нет (404) — `(True, False)`. Парсер работает с локальной копией (или пустым whitelist non-GM, если файла локально тоже нет).

### `orchestrator.py` — выбор папки по классу

В цикле `for i, g in enumerate(groups, 1):`, после успешного OCR:

```python
if r.reason != "ok":
    unknown.dump_group(g, reason=r.reason, ...)
    continue

cls = whitelist.classify(r.sku)         # "gm" | "non_gm" | None

if cls is None:
    unknown.dump_group(g, reason="not_in_catalog", ...)
    continue

if cls == "gm":
    if sku_guard.has_real_photos(r.sku):
        unknown.dump_group(g, reason=f"already_on_site:{r.sku}", ...)
        continue
    target = config.OUTPUT / r.sku
else:  # non_gm
    non_gm_dir = config.OUTPUT_NON_GM / r.sku
    if non_gm_dir.exists() and any(non_gm_dir.iterdir()):
        unknown.dump_group(g, reason=f"already_in_non_gm:{r.sku}", ...)
        continue
    target = non_gm_dir

target.mkdir(parents=True, exist_ok=True)
for j, p in enumerate(g.photos, 1):
    dst = target / f"{j:02d}_{p.name}"
    if not dst.exists():
        p.rename(dst)
ok_groups.append((cls, r.sku))
```

В финальном уведомлении notifier разносим GM и не-GM:

```
Готово за 12с
GM: 5 SKU, не-GM: 3 SKU, 24 фото. 465005, CP063, …
```

### Что не меняем

- `ocr.py` — OCR читает SKU без знания его класса. Правильное разделение ответственности.
- `sku_guard.py` — нужен только для GM (защита перезатирания фото на сайте).
- `qr_*` модули — про QR ничего не меняется.
- `importer.py` / `import-sorted-photos.mjs` — не-GM фото не идут на сайт, импортёр их просто не видит.

---

## Тестирование

```
part-photo-sorter/tests/
  test_whitelist.py                           РЕФАКТОР
    classify("123") где 123 в shop.db                 → "gm"
    classify("PE72000") где PE72000 в shop-non-gm.db  → "non_gm"
    classify("ZZZ9999") нет нигде                     → None
    classify("X") в обеих БД                          → "gm" (приоритет) + лог
    load_all() на пустых/несуществующих БД            → {} без падения

  test_db_sync.py                             ДОПОЛНЕНИЕ
    ensure_fresh_all(): обе БД свежие                 → (True, True), 0 SCP
    одна устарела                                     → 1 SCP, не трогает другую
    SCP non-gm упал, gm ок                            → (True, False)
    shop-non-gm.db на проде нет (404)                 → (True, False) без падения

  test_orchestrator.py                        ДОПОЛНЕНИЕ (e2e в tmp_path)
    GM SKU из mock-БД                                 → файлы в OUTPUT/<sku>/
    non-GM SKU из mock-non-gm-БД                      → файлы в OUTPUT_NON_GM/<sku>/
    SKU нет нигде                                     → unknown "not_in_catalog"
    non-GM папка уже есть и не пустая                 → unknown "already_in_non_gm"
    смешанный батч (GM + non-GM в одной пачке QR)     → каждый в свою папку

autoparts-shop/__tests__/admin/
  excel-import.test.ts                        ДОПОЛНЕНИЕ
    confirm с nonGmItems                              → INSERT в shop-non-gm.db
    повтор того же sku                                → INSERT OR IGNORE
    external_id детерминирован                        → "non-gm-" + sku
    non-GM не попадает в shop.db                      → gmshop66 их не видит
```

Ручная проверка после реализации: реальный батч съёмки с QR-разделителями, в котором перемешаны GM (из существующего каталога) и не-GM (только что загруженные через admin). Проверяем что обе папки `~/Pictures/сортивка/` и `~/Pictures/сортировка не gm/` получают свои файлы корректно.

---

## Что НЕ делаем (scope-фильтр, YAGNI)

1. **UI просмотра/редактирования не-GM в админке.** Делается когда появится второй сайт.
2. **Конвертация HEIC→WebP для не-GM фото.** Лежат как сняты. Конвертация бессмысленна без сайта-потребителя.
3. **`import-sorted-photos.mjs` для не-GM.** Скрипт остаётся однонаправленным (только GM).
4. **Удаление / редактирование цены / переклассификация GM ↔ не-GM.** Через 1С → новый Excel → `INSERT OR IGNORE`. Перенос между БД руками через `sqlite3` (редкий кейс).
5. **Прод-БД `shop-non-gm.db` на сервере.** На текущей итерации создаётся только локально на dev-машине. Когда поднимем второй сайт — заведём её на проде и подцепим к `db_sync`.
6. **Блокировка по коллизии.** Если SKU в обеих БД — лог-предупреждение, но не блокируем работу. Кладём в GM.

---

## Риски и защита

| Риск | Что плохо | Защита |
|---|---|---|
| Парсер не успел увидеть свежий не-GM Excel-импорт | Снял фото сразу после импорта → ушло в `не-распознано` | `db_sync` синкает с прода с TTL 60с — ждём ≤1 минуту |
| Не-GM папка занята старыми фото предыдущей съёмки | Перетёрли бы свежими | Защита `already_in_non_gm:<sku>` → группа в `не-распознано` |
| Один SKU загружен в оба Excel-импорта | Коллизия класса | Приоритет GM, лог-предупреждение |
| `shop-non-gm.db` повредилась/удалилась | Парсер «забыл» все не-GM | `db_sync` на следующем тике скачает с прода. Если прода ещё нет — пользователь видит «non-GM=0 в whitelist», делает повторный Excel-импорт |
| Excel случайно загружен дважды | Дубли в `shop-non-gm.db` | `INSERT OR IGNORE` по `sku` |
| Сетевой сбой SCP при синке прода | Парсер на старой копии не-GM-БД | Notifier «Не-GM каталог не синхронизирован» (как сейчас для GM) |

---

## Порядок работ (черновик для writing-plans)

**Шаг 0 (до этой работы — отдельная зачистка):** Закоммитить незаконченный фикс импортёра `import-sorted-photos.mjs` (полный пайплайн git push → sync prod → ssh rebuild) — он висит из прошлой сессии, без него GM-фото опять не доедут до сайта. Не смешиваем с этой работой.

**Шаги работы (детализирует writing-plans):**

1. **Site:** новая БД `shop-non-gm.db` + миграция + Drizzle-клиент.
2. **Site:** confirm endpoint принимает `nonGmItems`.
3. **Site:** UI ExcelImport — секция «Не-GM», новый текст итогов.
4. **Site:** тесты Excel-импорта зелёные, ручная проверка через admin.
5. **Parser:** `config.py` — новые env / пути.
6. **Parser:** `whitelist.py` — рефактор `load() → classify()/load_all()` + тесты.
7. **Parser:** `db_sync.ensure_fresh_all()` + тесты.
8. **Parser:** `orchestrator.py` — выбор папки по классу + тесты.
9. **Parser:** notifier-сообщение GM/non-GM в финальном уведомлении.
10. **e2e:** реальный батч (GM + non-GM вперемешку), визуальная проверка обеих папок.

---

## Открытые вопросы

Нет.

---

## Связанные документы

- [2026-04-19-catalog-and-import-design.md](2026-04-19-catalog-and-import-design.md) — текущая схема импорта Excel и classify.
- [2026-04-20-photo-parser-redesign-design.md](2026-04-20-photo-parser-redesign-design.md) — редизайн парсера (новый `gmshop_parser` пакет).
