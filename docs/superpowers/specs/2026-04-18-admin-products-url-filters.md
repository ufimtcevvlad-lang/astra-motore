# Админка → Товары: URL-фильтры + возврат в позицию

**Дата:** 2026-04-18
**Статус:** approved

## Проблема

В `/admin/products` текущие фильтры и страница хранятся только в локальном `useState`. Из этого следует:

1. Переход в карточку товара и возврат «Назад» сбрасывает фильтры — приходится настраивать заново.
2. Скролл не восстанавливается — после правки 10-го товара на странице снова листаешь с начала.
3. Ссылкой с отфильтрованным списком нельзя поделиться.
4. После перезагрузки вкладки всё забывается.

При росте каталога (сейчас 76 товаров → плановые 7000+) это превращается в главный тормоз рабочего процесса.

## Цель

Сделать так, чтобы возврат из карточки и перезагрузка страницы сохраняли полный контекст списка: фильтры, страницу, позицию скролла.

## Архитектура

Три слоя памяти, у каждого чёткая роль:

- **URL (`?search=&brand=&page=2`)** — основной источник правды. Это делает «Назад» браузера рабочей из коробки, даёт shareable-ссылки и переживает reload.
- **sessionStorage (`admin.products.scroll.<url>`)** — `scrollY` под ключ текущего URL. Живёт в пределах вкладки, не засоряет localStorage.
- **localStorage (`admin.products.filters.last`)** — последние применённые фильтры. Применяются как fallback при «голом» заходе на `/admin/products` без query-параметров.

## Поведение

1. Первый заход на `/admin/products` (URL чистый, localStorage пуст) → показывается весь список, фильтры пустые.
2. Первый заход на `/admin/products` (URL чистый, в localStorage есть фильтры) → фильтры применяются, URL обновляется через `router.replace` на `/admin/products?brand=ACDelco`.
3. Пользователь меняет фильтр или переключает страницу → `router.replace` с новыми параметрами, localStorage обновляется.
4. Пользователь жмёт «Сбросить» → URL становится `/admin/products`, localStorage-ключ очищается.
5. Пользователь кликает на товар → перед навигацией сохраняется `scrollY` в sessionStorage по ключу текущего URL.
6. Пользователь жмёт «Назад» браузера → страница рендерится с параметрами из URL → после `loading=false` и непустого `items` восстанавливается `scrollY`.
7. Если `scrollY > document.documentElement.scrollHeight` — браузер просто обрежет (это ОК).

## Компоненты

### `useProductFilters()` — новый хук

**Файл:** `src/app/admin/components/useProductFilters.ts`

**Интерфейс:**
```ts
export function useProductFilters(): {
  filters: ProductFiltersState;
  page: number;
  setFilters: (f: ProductFiltersState) => void;
  setPage: (p: number) => void;
  reset: () => void;
};
```

**Логика:**
- При монтировании: читает `useSearchParams()`. Если все query-параметры пусты И в localStorage есть сохранённые фильтры — применяет их через `router.replace`.
- `setFilters` / `setPage` → собирает query-строку, вызывает `router.replace(`/admin/products?${params}`, { scroll: false })`, пишет в localStorage.
- `reset` → `router.replace('/admin/products', { scroll: false })`, удаляет ключ из localStorage, сбрасывает page в 1.
- Ключ localStorage: `admin.products.filters.last`.
- Формат в localStorage: тот же объект `{search, categoryId, brand, inStock, priceFrom, priceTo}` (page **не** храним — всегда 1 при применении fallback).

### `useScrollRestore(key: string, ready: boolean)` — новый хук

**Файл:** `src/app/admin/components/useScrollRestore.ts`

**Что делает:**
- Подписывается на `beforeunload`, `visibilitychange` и событие клика по ссылке внутри страницы: перед уходом сохраняет `window.scrollY` в `sessionStorage.setItem('admin.products.scroll.' + key, String(y))`.
- Когда `ready === true` (то есть список загружен и непустой) — читает значение из sessionStorage по тому же ключу и вызывает `window.scrollTo(0, y)`. Один раз на монтирование при каждом новом key.

**Почему отдельный хук:** переиспользуем в других админ-списках (заказы, клиенты) в будущем.

### `ProductsPage` — правки

**Файл:** `src/app/admin/(app)/products/page.tsx`

- Убираем локальные `useState<ProductFiltersState>` и `useState<number>(1)` для `filters`/`page`.
- Вместо них: `const { filters, page, setFilters, setPage } = useProductFilters();`.
- Вычисляем `scrollKey = pathname + '?' + searchParams.toString()` и зовём `useScrollRestore(scrollKey, !loading && items.length > 0)`.
- `handleFilterChange` просто делегирует в `setFilters` + `setPage(1)`.

### `ProductList` — минорная правка

**Файл:** `src/app/admin/components/ProductList.tsx`

- Перед переходом по `Link href={/admin/products/${item.id}}` сохранять scroll. Самый простой способ: добавить `onClick` на обёртке строки, который вручную пишет scrollY в sessionStorage. Это покрывает кейс «клик по строке → сразу навигация», так как `beforeunload` в SPA не сработает.

## Данные и формат URL

Query-параметры маппятся 1-в-1 на поля `ProductFiltersState`:

- `?search=фильтр` ↔ `filters.search`
- `?categoryId=12` ↔ `filters.categoryId`
- `?brand=ACDelco` ↔ `filters.brand`
- `?inStock=yes` / `?inStock=no` ↔ `filters.inStock`
- `?priceFrom=1000` ↔ `filters.priceFrom`
- `?priceTo=5000` ↔ `filters.priceTo`
- `?page=3` ↔ `page` (если отсутствует — page=1)

Пустые значения в URL не пишем.

## Риски и крайние случаи

- **Гонка рендера и скролла:** скролл восстанавливаем только когда `loading === false && items.length > 0`. Эффект с условием в deps `[ready, scrollKey]`.
- **Список пустой после фильтра:** скролл не восстанавливаем — логично, верх страницы.
- **Быстрая смена фильтров подряд:** каждый `setFilters` вызывает `router.replace` — Next не делает полный rerender, только обновляет URL. Гонка невозможна.
- **SSR hydration:** страница уже `"use client"`, `useSearchParams` работает после монтирования. Начальные фильтры до первого эффекта — пустые (как сейчас), затем эффект синхронизирует с URL. Визуально не заметно.
- **Коллизия scroll-ключей:** ключ — полный URL, включая `?page=N`. Разные страницы списка имеют независимые позиции.
- **Старые scroll-записи в sessionStorage:** sessionStorage сам чистится при закрытии вкладки. Не заморачиваемся.

## Приёмка

- [ ] Открыл список → выставил фильтр «ACDelco» → URL `/admin/products?brand=ACDelco`.
- [ ] Перезагрузил страницу → фильтр остался, поле селекта показывает «ACDelco».
- [ ] Пролистал до 3-й страницы → URL `?brand=ACDelco&page=3`.
- [ ] Проскроллил до 5-го товара → кликнул → открылась карточка.
- [ ] Нажал «Назад» → вернулся на `?brand=ACDelco&page=3`, список подгружен, скролл на 5-м товаре.
- [ ] Открыл новую вкладку `/admin/products` (без параметров) → применился последний фильтр «ACDelco» из localStorage, URL обновился.
- [ ] Нажал «Сбросить фильтры» → URL чистый, список полный, localStorage-ключ удалён.

## Что НЕ входит

- Сохранение сортировки (её пока нет — см. P2 #6 из аудита).
- Анимация перехода между списком и карточкой.
- Префетч следующей страницы.
- Применение той же схемы к другим админ-спискам (орудует `useScrollRestore`, но подключать не будем).
