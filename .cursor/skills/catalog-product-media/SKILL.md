---
name: catalog-product-media
description: >-
  Product photo workflow for autoparts-shop: consistent 1:1 catalog tiles with
  object-fit contain on #fff, white photobox alignment, paths under
  public/images/catalog/{id}/, SKU match to products.ts, mandatory Sharp
  normalization (including PNG recompress) after any new upload, performance
  at scale (~10k+ SKUs, many images). Use when adding or changing catalog
  images, product cards, galleries, Next/Image sizing, thumbnails, batch
  assets, or when the user mentions фото каталога, карточка товара, галерея,
  превью, оптимизация картинок, photobox, артикул на фото, opel-*, images in
  products.ts.
---

# Каталог: медиа товаров (Astra Motors / autoparts-shop)

## Когда применять

- Новые или заменённые фото в `public/images/catalog/`.
- Правки `image` / `images` в `src/app/data/products.ts`.
- Вёрстка карточки товара, сетки каталога, галереи на `/product/[id]`, корзина, поиск в шапке.
- Оптимизация загрузки, `sizes`, lazy, форматы.

## Визуальные правила (обязательно)

1. **Плитка каталога и миниатюры:** контейнер **1:1** (`aspect-square`), фон **`#ffffff`**, изображение **`object-fit: contain`**, **`object-position: center`**. Деталь **не обрезать** (не `cover` в этих местах).
2. **Внутренний отступ** в блоке фото (например `p-3` / `inset-3`), чтобы деталь не касалась рамки.
3. **Страница товара (галерея):** тот же принцип — **белый фон**, **contain**, квадратная сцена для единообразия; миниатюры — квадрат, contain, белый фон.
4. **Тёмные дропдауны** (поиск, превью корзины): область превью товара — **белый квадрат** под фото, чтобы совпадать с фотобоксом.
5. **Исходники:** фотобокс; не удалять обязательные маркировки OE без запроса.

## Сжатие при загрузке (обязательно)

После **каждого** добавления или замены файлов в `public/images/catalog/` агент **обязан** прогнать нормализацию, чтобы в репозиторий не попадали «сырые» снимки с телефона/сканера без пережатия.

1. Выполнить из корня репозитория:

   `npm run catalog:normalize-images:recompress-png`

   (это `node scripts/normalize-catalog-images.mjs --recompress-png`: EXIF-поворот, даунскейл стороны **>1600px**, пережатие **PNG** в том числе для кадров уже меньше 1600px; JPEG проходит через пайплайн; WebP без уменьшения по-прежнему можно не трогать — см. `reference.md`).

2. Скрипт сам не подменяет файл, если после перекодирования он стал **больше** исходника более чем на **5%** (тогда кадр пропускается).

3. Без этого шага задача по новым фото **не считается завершённой** (вместе с проверкой путей и `npm run typecheck`).

## Производительность

- Список: не отдавать гигантские оригиналы; целиться в миниатюры (длинная сторона **~300–480px** в идеале на этапе пайплайна); `sizes` под колонку; `lazy` по умолчанию.
- Галерея: не подгружать лишние кадры без смены слайда (текущая реализация — один активный URL).
- Массовый импорт: пайплайн Sharp/Pillow или CDN; не коммитить десятки тысяч тяжёлых оригиналов без плана.

## Файлы и данные

- `public/images/catalog/{productId}/`, имена `01-...`, `02-...`.
- `image` = обложка; `images[]` в порядке показа.
- **SKU на фото = `sku` в данных.**

## Доступность

- `alt` у главного кадра: название + артикул кратко (где уместно).

## Алгоритм

1. Положить файлы в `public/images/catalog/{productId}/`, имена `01-…`, `02-…`.
2. **`npm run catalog:normalize-images:recompress-png`** — обязательно после новых/заменённых фото.
3. В `products.ts` проставить `image` / `images` по **`sku` с этикетки**; наименования карточки не менять без явной просьбы пользователя.
4. Найти все `ProductImage` / `Image` для товаров при правках UI и выставить **square + white + contain** согласно этому скиллу.
5. `npm run typecheck`.

## Ограничения

- Без несвязанного рефакторинга; без подделки номеров на фото.

Подробности: `reference.md` в этой папке.
