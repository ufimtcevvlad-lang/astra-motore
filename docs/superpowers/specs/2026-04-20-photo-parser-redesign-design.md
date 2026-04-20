# Редизайн парсера фото — спек

**Дата:** 2026-04-20
**Статус:** спек, ожидает ревью владельца.
**Расположение проекта парсера:** `/Users/vladislavufimcev/Documents/part-photo-sorter/`

## 1. Мотивация

Текущий парсер (`watch_gmshop_sort.py` 845 строк + `sort_photos.py` 2406 строк) в рабочем сценарии регулярно даёт плохой UX:

- Полный проход проверки QR в 58 iPhone HEIC = 4 минуты при 100% CPU.
- Нет обратной связи в момент работы — пользователь не понимает, парсер жив или завис.
- Polling раз в 10 секунд (после правки — 3 секунды) — задержка от «дропнул фото» до «пошла обработка».
- Любое изменение кода ломает UX в неожиданных местах: всё в одном файле, границы модулей размыты.
- Ошибки группировки («SP-157 смешалась с NGK») — результат слабой валидации.

Пользователь хочет стабильную архитектуру, которая не ломается при адаптациях.

## 2. Выбранная схема съёмки

- iPhone снимает товары + печатный лист с QR между каждой парой товаров.
- QR-кадры приходят в папку как обычные HEIC без пометки в имени.
- Парсер обязан определять QR-кадры сам (через декодирование).
- QR-payload: `GMSTOP66|PRODUCT_END|v1` (уже сгенерирован, файл `delimiter-qr-print.png`).

## 3. Требования

### №1. Мгновенный запуск
- Триггер: macOS FSEvents на папку `~/Pictures/фото gmshop 66/`.
- Событие «новый файл закрыт на запись» → auto-number → обработка.
- Никакого polling'а.

### №2. Нет QR → парсер молчит
- Если в батче не обнаружено ≥2 QR-кадров — парсер не лезет в OCR, не трогает фото.
- Баннер macOS: «Нужен QR-разделитель».
- Состояние кэшируется по fingerprint'у папки — при следующем событии без изменений не дублируется.

### №3. QR-маркер — печатный лист в кадре
- QR-кадр = обычный HEIC.
- Парсер декодит QR в каждом новом файле (см. требование №4).

### №4. Быстрая проверка QR (thumbnail-first + параллельно)
- Из каждого HEIC читается встроенный preview (128-256px) через `pillow-heif`.
- Декодирование QR на превью воркером `multiprocessing.Pool` (по числу ядер CPU).
- Fallback на полный декодер (cv2 + WeChat QR) если на превью не нашлось.
- Результат кэшируется по ключу `(name, mtime_ns, size)` в `~/Library/Application Support/com.gmshop66/qr_cache.json`.
- При повторной проверке того же файла — результат из кэша, без декодирования.
- **Целевой бюджет:** ≤3 секунды на 58 фото при первом сканировании.

### №5. Вайтлист — единственный источник истины
- SKU в вайтлисте → сортируется, импортируется на сайт.
- SKU не в вайтлисте ИЛИ OCR не распознал → кладётся в `~/Pictures/сортивка/не-распознано/<batch-id>/<group-id>/`.
- Нет авто-создания черновиков товара, нет заготовок по SKU.
- Вайтлист синхронизируется с прод-БД скриптом `sync_whitelist_from_prod.sh` (уже есть), раз в 10 минут.

### №6. Полный автопилот до прода
- После группировки и OCR:
  1. HEIC → WebP (1600px, q86) в `public/images/catalog/<external_id>/NN.webp`.
  2. UPDATE products SET image, images в локальной `data/shop.db`.
  3. `git add` + `commit` + `push origin main`.
  4. SSH-синк БД на прод-сервер (`5.42.117.221`, `/var/www/astra-motors`).
- Ошибка на любом шаге → уведомление macOS + статус «🔴 ошибка» в menubar, но не эскалация (повторит в следующем тике).

### №7. Парсер трогает только пустые SKU
- Перед записью фото для SKU: SELECT image, images FROM products WHERE sku=?
- Если `image` не пусто и не `_pending` → пропустить, не перезаписывать.
- Добор фото — только через админку сайта вручную.

### №8. Откат не нужен, нужна корректность
Ошибки, которых нельзя допускать:
- Фото товара X попало в папку товара Y.
- OCR прочитал артикул соседнего товара из-за кадрирования.
- Серии склеились из-за нераспознанного QR.
- Одно фото попало в несколько SKU.

Механизмы защиты:
- **Строгие границы QR:** если пара QR не замкнулась корректно, группа целиком → «не распознано».
- **Кросс-проверка OCR:** читаем SKU с каждого не-QR кадра группы. Правила:
  - 0 не-пустых результатов → «не распознано» (причина `ocr_failed`).
  - 1+ не-пустых результатов, все совпадают → принимаем SKU.
  - 2+ разных не-пустых результата → «не распознано» (причина `conflict`), даже если большинство голосов за один SKU.
- **Валидация whitelist:** SKU проверяется против whitelist'а ДО записи в файловую систему.
- **Защита от коллизий:** если распознанный текст совпал с префиксом нескольких SKU — в «не распознано».
- **Защита от дублей в батче:** MD5 фото (текущий механизм сохраняется).

### №9. Menubar-индикатор с live-прогрессом

Значок в строке меню macOS, живое обновление.

**Заголовок значка (обновляется каждые 200-500 мс):**
- `🟢 idle` — ждёт фото
- `🔵 QR 23/58` — параллельная проверка QR, счётчик растёт
- `🔵 OCR 5/12` — распознавание SKU
- `🔵 → прод` — конвертация/импорт/push
- `🟡 нужен QR` — файлы есть, QR нет
- `🔴 ошибка` — упало, смотреть логи

**Меню по клику:**
- 📂 Открыть «Входящие» (`фото gmshop 66`)
- 📦 Открыть «Сортировка» (`сортивка`)
- ❓ Открыть «Не распознано»
- ─────────
- 📊 Статистика за сегодня (батчей / фото / артикулов)
- 🔄 Перезапустить парсер
- ─────────
- ⚙️ Настройки…
- 🚪 Выйти

**Реализация:** `rumps` (Python).
IPC: shared state через файл `~/Library/Application Support/com.gmshop66/menubar_state.json` (atomic write-then-rename). Модули парсера пишут статус в этот файл на каждом этапе, menubar-тред читает.

## 4. Архитектура

Пакет `gmshop_parser/` в `/Users/vladislavufimcev/Documents/part-photo-sorter/`:

```
gmshop_parser/
├── __init__.py
├── __main__.py        # entry-point для launchd и ручного запуска
├── state.py           # shared state для menubar (read/write atomic JSON)
├── watcher.py         # FSEvents → очередь событий
├── qr_scanner.py      # thumbnail-first, parallel, cached
├── grouper.py         # границы товаров по QR
├── ocr.py             # обёртка над sort_photos.py для OCR одной группы
├── importer.py        # обёртка над import-sorted-photos.mjs
├── notifier.py        # osascript display notification
├── menubar.py         # rumps-приложение с live-прогрессом
└── config.py          # пути, env vars, константы
```

### 4.1 Модульные интерфейсы

**`watcher.py`**
```python
def watch(folder: Path, on_new_file: Callable[[Path], None]) -> None: ...
# FSEvents callback вызывает on_new_file(path) для каждого нового файла.
```

**`qr_scanner.py`**
```python
def scan(paths: list[Path], workers: int = cpu_count()) -> dict[Path, str | None]: ...
# Возвращает для каждого пути: payload QR (если есть) или None.
# Использует кэш qr_cache.json по (name, mtime_ns, size).
# Внутри обновляет state.py (счётчик QR X/Y).
```

**`grouper.py`**
```python
@dataclass
class Group:
    photos: list[Path]           # фото товара (без QR-кадров)
    qr_open: Path                # открывающий QR
    qr_close: Path               # закрывающий QR
    is_valid: bool               # прошла ли строгие проверки границ

def group(paths: list[Path], qr_results: dict[Path, str | None]) -> list[Group]: ...
```

**`ocr.py`**
```python
@dataclass
class OcrResult:
    sku: str | None              # распознанный SKU, или None если провал
    confidence: float            # 0-1
    reason: str                  # "ok" / "conflict" / "not_in_whitelist" / "ocr_failed"

def recognize(group: Group, whitelist: set[str]) -> OcrResult: ...
# Делает OCR с кросс-проверкой (≥2 кадра должны совпасть),
# проверяет вайтлист, возвращает решение.
```

**`importer.py`**
```python
def import_group(sku: str, photos: list[Path], external_id: str) -> ImportResult: ...
# HEIC→WebP, UPDATE БД, git commit+push, SSH синк.
# Обновляет state.py (этап "→ прод").
```

**`notifier.py`**
```python
def notify(title: str, message: str, sound: str = "") -> None: ...
```

**`menubar.py`**
```python
# rumps.App, запускается в main-thread.
# Отдельный тред следит за state.py файлом и обновляет заголовок.
```

**`state.py`**
```python
def read() -> dict: ...
def write(patch: dict) -> None: ...  # atomic write-then-rename
# Поля: {"phase": "idle|qr|ocr|import|error", "current": int, "total": int,
#        "last_batch": {...}, "last_error": str | None}
```

### 4.2 Data flow

```
FSEvents (watcher)
  → auto-number new files
  → state.write({"phase":"qr","current":0,"total":N})
  → qr_scanner.scan (обновляет current по мере готовности)
  → grouper.group
  → если len(groups) == 0: state.write({"phase":"qr_missing"}); notify("нужен QR"); return
  → state.write({"phase":"ocr","current":0,"total":len(groups)})
  → for each group:
      ocr.recognize → ok | fail
      если ok и sku в whitelist и нет существующих фото → importer.import_group
      если fail → move group to "не распознано"
  → state.write({"phase":"import","current":0,"total":N})
  → importer runs git push + SSH sync
  → state.write({"phase":"idle","last_batch":{"skus":8,"photos":15,"duration":"1m 42s"}})
  → notify("Готово: 8 SKU, 15 фото за 1м 42с")
```

## 5. Миграция

Старый код (`sort_photos.py`, `watch_gmshop_sort.py`) **не удаляется** до полной валидации нового. Новый код живёт рядом.

**Порядок:**

1. **state + menubar + notifier** — ставим новый menubar-значок. Он читает state.json, но state.json пока заполняет старый `watch_gmshop_sort.py` (добавим туда вызовы `state.write`). Если новый menubar глючит — его можно выключить, старая логика работает.
2. **qr_scanner** с thumbnail-first, parallel, cache — тестируем отдельным скриптом на реальной папке, сравниваем результаты со старой проверкой. Потом подключаем в `watch_gmshop_sort.py` вместо `_resolve_delimiter_payload_paths`.
3. **watcher** (FSEvents) — заменяет цикл `while True: time.sleep(3); one_tick()`. На этом шаге старый `one_tick` вызывается уже из FSEvents-триггера.
4. **grouper + ocr** — обёртки над существующими функциями из `sort_photos.py` с добавленной кросс-проверкой. Старый `sort_photos.py` остаётся, новый модуль просто вызывает нужные куски.
5. **importer** — обёртка над `import-sorted-photos.mjs`.
6. Когда все 6 модулей работают стабильно неделю — старый `watch_gmshop_sort.py` переименовывается в `.old` и удаляется следующим коммитом.

## 6. Конфигурация

Все настройки в `config.py`, переопределяются env vars:

```
GM_SHOP_INBOX          = ~/Pictures/фото gmshop 66
GM_SHOP_OUTPUT         = ~/Pictures/сортивка
GM_SHOP_UNKNOWN        = ~/Pictures/сортивка/не-распознано
GM_SHOP_CATALOG        = autoparts-shop/public/images/catalog
GM_SHOP_DB             = autoparts-shop/data/shop.db
GM_SHOP_WHITELIST      = part-photo-sorter/whitelist.txt
GM_SHOP_QR_WORKERS     = cpu_count()  # параллельность QR-сканирования
GM_SHOP_QR_THUMB_PX    = 256          # размер превью для QR
GM_SHOP_MAX_EDGE       = 512          # для OCR
GM_SHOP_NOTIFY         = 1            # macOS уведомления
GM_SHOP_AUTOPUSH       = 1            # git push + SSH-синк на прод
```

## 7. Логирование

- Файл лога: `~/Library/Logs/gmshop-parser.log` (новый, не смешиваем со старым `gmshop-sort.log`).
- Формат: `2026-04-20 18:07:50 [qr_scanner] OK IMG_5502.HEIC → qr (23/58, 0.12s)`.
- Ротация: raw rotation ежедневно, хранится 30 дней. Хук: модуль `config.py` на старте процесса ротирует если размер > 10 МБ.
- stdout/stderr launchd идут в `~/Library/Logs/gmshop-parser-daemon.out|err` (как сейчас).

## 8. Тесты

- `qr_scanner`: на фиксированной папке `tests/fixtures/qr-samples/` (10 HEIC с известными результатами) → прогон должен уложиться в ≤1с, кэш срабатывает.
- `grouper`: на синтетических списках `[qr, p1, p2, qr, p3, qr]` → проверка границ.
- `ocr.recognize`: моки на `sort_photos.py`, проверяем кросс-проверку и whitelist.
- `importer`: integration-тест с тестовой БД `shop.db.test`.
- Ручной smoke-тест: дроп 58 HEIC → ожидание уведомления «Готово за N» с корректными SKU.

## 9. Вне scope

Эти идеи рассматривались, но **не делаем** в этом редизайне:

- Свой GUI / веб-дашборд.
- История батчей и undo.
- Автоматическое создание черновиков товаров для не-whitelist SKU.
- Замена схемы съёмки (штрихкод-приложение) — оставляем текущий QR-лист.
- Retry OCR с тяжёлыми настройками (CLAHE + 4 поворота) — оставляем текущее поведение (вся группа в «не распознано»).

## 10. Открытые вопросы для ревью

- Размер превью для QR (256px в спеке — возможно, для маленьких QR на фото нужно 384px; определим на первом замере).
- Частота обновления menubar (200-500мс — настраивается `GM_SHOP_MENUBAR_HZ`).
- Формат батч-ID для «не распознано» (сейчас `<timestamp>`, возможно добавить счётчик `2026-04-20_01`).

Эти вопросы не блокируют старт работы — решаются на этапе реализации.
