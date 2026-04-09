/**
 * Иконки категорий каталога GM Shop 66.
 *
 * Стиль: stroke-outline, толщина 1.75, viewBox 24×24, цвет через currentColor.
 * Это значит, что иконки окрашиваются CSS-классом родителя: `text-amber-500`,
 * `text-slate-700` и т.п. Один и тот же SVG выглядит по-разному в зависимости
 * от контекста.
 *
 * Использование:
 *   <SparkPlugIcon className="h-6 w-6 text-amber-500" />
 */

type IconProps = {
  className?: string;
  "aria-hidden"?: boolean;
};

const baseProps = {
  viewBox: "0 0 24 24",
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.75,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Свеча зажигания: контакт сверху, керамическое тело, резьба, электрод снизу. */
export function SparkPlugIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Контактный наконечник */}
      <path d="M11 2h2v3h-2z" />
      {/* Керамический изолятор */}
      <path d="M10 5h4v4h-4z" />
      {/* Шестигранник */}
      <path d="M9 9h6v2H9z" />
      <path d="M9 11h6v2H9z" />
      {/* Резьбовая часть */}
      <path d="M10 13h4v5h-4z" />
      <path d="M10 15h4" />
      <path d="M10 17h4" />
      {/* Электрод с искровым зазором */}
      <path d="M11.5 18v2" />
      <path d="M10 20h3" />
    </svg>
  );
}

/** Масляный фильтр: цилиндрический корпус с резьбой снизу. */
export function OilFilterIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Корпус фильтра */}
      <rect x="6" y="4" width="12" height="14" rx="1.5" />
      {/* Резьбовое основание */}
      <path d="M8 18v2h8v-2" />
      {/* Декоративные полосы на корпусе */}
      <path d="M6 9h12" />
      <path d="M6 13h12" />
      {/* Капля масла сбоку — намёк на функцию */}
      <path d="M19 12c.8.8.8 2 0 2.8" opacity="0.6" />
    </svg>
  );
}

/** Воздушный фильтр: панельный прямоугольник со складками. */
export function AirFilterIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Рамка фильтра */}
      <rect x="3" y="6" width="18" height="12" rx="1" />
      {/* Складки фильтрующей шторки */}
      <path d="M6 8v8" />
      <path d="M9 8v8" />
      <path d="M12 8v8" />
      <path d="M15 8v8" />
      <path d="M18 8v8" />
    </svg>
  );
}

/** Салонный фильтр / вентиляция салона: решётка с потоками воздуха. */
export function CabinFilterIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Рамка вентиляционной решётки */}
      <rect x="4" y="4" width="16" height="16" rx="2" />
      {/* Горизонтальные ламели */}
      <path d="M4 9h16" />
      <path d="M4 13h16" />
      <path d="M4 17h16" />
      {/* Потоки воздуха справа */}
      <path d="M20 7c1 .5 1 1.5 0 2" opacity="0.5" />
      <path d="M20 11c1 .5 1 1.5 0 2" opacity="0.5" />
    </svg>
  );
}

/** Прокладки и сальники: уплотнительное кольцо (O-ring) в разрезе. */
export function GasketIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Внешний контур прокладки */}
      <circle cx="12" cy="12" r="9" />
      {/* Внутренний контур (отверстие) */}
      <circle cx="12" cy="12" r="5" />
      {/* Небольшие точки по окружности — намёк на отверстия под болты */}
      <circle cx="12" cy="4.5" r="0.5" fill="currentColor" />
      <circle cx="19.5" cy="12" r="0.5" fill="currentColor" />
      <circle cx="12" cy="19.5" r="0.5" fill="currentColor" />
      <circle cx="4.5" cy="12" r="0.5" fill="currentColor" />
    </svg>
  );
}

/** Охлаждение: термометр с каплей. */
export function CoolingIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Корпус термометра */}
      <path d="M10 3a2 2 0 0 1 4 0v11" />
      <path d="M10 3v11" />
      {/* Шкала */}
      <path d="M14 6h1.5" />
      <path d="M14 9h1.5" />
      <path d="M14 12h1.5" />
      {/* Колба внизу */}
      <circle cx="12" cy="17" r="3" />
      {/* Капля справа */}
      <path d="M18 8c1 1.5 1 3 0 4s-2 0-2-1 2-3 2-3z" opacity="0.7" />
    </svg>
  );
}

/** Подвеска: амортизатор с пружиной. */
export function SuspensionIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Верхнее крепление */}
      <path d="M9 3h6" />
      <path d="M12 3v3" />
      {/* Пружина (зигзаг) */}
      <path d="M8 6h8l-7 2 7 2-7 2 7 2-7 2h8" />
      {/* Нижний шток */}
      <path d="M12 18v3" />
      <path d="M9 21h6" />
    </svg>
  );
}

/** Двигатель: блок цилиндров с клапанами сверху. */
export function EngineIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Основной блок двигателя */}
      <rect x="3" y="8" width="18" height="10" rx="1" />
      {/* Клапанная крышка / ГБЦ */}
      <rect x="5" y="5" width="14" height="3" rx="0.5" />
      {/* Маслозаливная горловина сверху */}
      <path d="M15 5V3h2v2" />
      {/* Выступ/приливы блока */}
      <path d="M3 11h-1" />
      <path d="M3 15h-1" />
      <path d="M21 11h1" />
      <path d="M21 15h1" />
      {/* Крепёжные "болты" на крышке */}
      <circle cx="7" cy="6.5" r="0.4" fill="currentColor" />
      <circle cx="12" cy="6.5" r="0.4" fill="currentColor" />
      <circle cx="17" cy="6.5" r="0.4" fill="currentColor" />
    </svg>
  );
}

/** Электрика и автосвет: лампочка с лучами. */
export function LightBulbIcon({ className, ...rest }: IconProps) {
  return (
    <svg className={className} aria-hidden={rest["aria-hidden"] ?? true} {...baseProps}>
      {/* Колба лампочки */}
      <path d="M9 16a5 5 0 1 1 6 0v2h-6v-2z" />
      {/* Цоколь */}
      <path d="M10 18h4" />
      <path d="M10 20h4" />
      {/* Лучи света */}
      <path d="M12 2v2" opacity="0.7" />
      <path d="M4.2 6.2l1.4 1.4" opacity="0.7" />
      <path d="M19.8 6.2l-1.4 1.4" opacity="0.7" />
      <path d="M2 12h2" opacity="0.7" />
      <path d="M20 12h2" opacity="0.7" />
    </svg>
  );
}
