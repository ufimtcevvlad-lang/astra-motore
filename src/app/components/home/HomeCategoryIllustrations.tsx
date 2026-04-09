/**
 * Цветные flat-иллюстрации категорий для карточек на главной странице.
 *
 * Отличаются от CategoryIcons.tsx (которые stroke-outline для меню/чипов):
 *  - Заливка + градиенты, не только линии
 *  - Больший viewBox (120×120) для детализации
 *  - Фиксированная палитра — амбер, слейт, синий, белый
 *  - Круглый фон с мягкой заливкой у каждой иллюстрации
 *  - Подходит для крупного отображения (96–160px)
 *
 * Использование:
 *   <SparkPlugArt className="h-28 w-28" />
 */

type IllustrationProps = {
  className?: string;
};

const BG_CIRCLE_GRADIENT_ID = "home-bg-amber";

/**
 * Общий компонент-обёртка с градиентным круглым фоном.
 * Иллюстрации вписываются в круг, занимающий центр квадратного viewBox 120×120.
 */
function IllustrationFrame({
  className,
  bgGradient = "amber",
  children,
}: {
  className?: string;
  bgGradient?: "amber" | "slate" | "blue";
  children: React.ReactNode;
}) {
  const gradients = {
    amber: { from: "#FEF3C7", to: "#FCD34D" }, // amber-100 → amber-300
    slate: { from: "#F1F5F9", to: "#CBD5E1" }, // slate-100 → slate-300
    blue: { from: "#DBEAFE", to: "#93C5FD" }, // blue-100 → blue-300
  };
  const g = gradients[bgGradient];
  const gradId = `${BG_CIRCLE_GRADIENT_ID}-${bgGradient}`;

  return (
    <svg
      viewBox="0 0 120 120"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <defs>
        <radialGradient id={gradId} cx="0.5" cy="0.4" r="0.7">
          <stop offset="0%" stopColor={g.from} />
          <stop offset="100%" stopColor={g.to} />
        </radialGradient>
      </defs>
      {/* Мягкий круглый фон */}
      <circle cx="60" cy="60" r="56" fill={`url(#${gradId})`} />
      {children}
    </svg>
  );
}

/** 1. Свечи зажигания — вертикальная свеча: металл сверху, керамика, шестигранник, резьба. */
export function SparkPlugArt({ className }: IllustrationProps) {
  return (
    <IllustrationFrame className={className} bgGradient="amber">
      <defs>
        <linearGradient id="spark-metal" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#94A3B8" />
          <stop offset="50%" stopColor="#E2E8F0" />
          <stop offset="100%" stopColor="#64748B" />
        </linearGradient>
        <linearGradient id="spark-ceramic" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="50%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#CBD5E1" />
        </linearGradient>
        <linearGradient id="spark-nut" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="50%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#334155" />
        </linearGradient>
      </defs>
      {/* Контактный наконечник */}
      <rect x="54" y="20" width="12" height="8" rx="1" fill="url(#spark-metal)" />
      {/* Керамический изолятор (основное белое тело) */}
      <path
        d="M51 28 Q51 26 53 26 L67 26 Q69 26 69 28 L68 50 L52 50 Z"
        fill="url(#spark-ceramic)"
        stroke="#94A3B8"
        strokeWidth="0.8"
      />
      {/* Ребра на керамике (характерные кольца) */}
      <ellipse cx="60" cy="34" rx="9" ry="1.5" fill="#CBD5E1" opacity="0.6" />
      <ellipse cx="60" cy="40" rx="9" ry="1.5" fill="#CBD5E1" opacity="0.6" />
      <ellipse cx="60" cy="46" rx="9" ry="1.5" fill="#CBD5E1" opacity="0.6" />
      {/* Шестигранная гайка */}
      <path
        d="M49 50 L71 50 L72 58 L71 66 L49 66 L48 58 Z"
        fill="url(#spark-nut)"
        stroke="#1E293B"
        strokeWidth="0.8"
      />
      {/* Резьба — полосками */}
      <rect x="52" y="67" width="16" height="18" rx="0.5" fill="url(#spark-metal)" />
      <line x1="52" y1="70" x2="68" y2="70" stroke="#475569" strokeWidth="0.8" />
      <line x1="52" y1="73" x2="68" y2="73" stroke="#475569" strokeWidth="0.8" />
      <line x1="52" y1="76" x2="68" y2="76" stroke="#475569" strokeWidth="0.8" />
      <line x1="52" y1="79" x2="68" y2="79" stroke="#475569" strokeWidth="0.8" />
      <line x1="52" y1="82" x2="68" y2="82" stroke="#475569" strokeWidth="0.8" />
      {/* Электрод с искрой */}
      <rect x="58" y="85" width="4" height="6" fill="#475569" />
      <path d="M56 91 L64 91" stroke="#334155" strokeWidth="1.5" strokeLinecap="round" />
      <circle cx="60" cy="93" r="1" fill="#F59E0B" />
      {/* Искра */}
      <path
        d="M58 94 L60 96 L62 94"
        stroke="#F59E0B"
        strokeWidth="1.2"
        fill="none"
        strokeLinecap="round"
      />
    </IllustrationFrame>
  );
}

/** 2. Масляный фильтр — цилиндрический корпус в амбере с резьбой снизу. */
export function OilFilterArt({ className }: IllustrationProps) {
  return (
    <IllustrationFrame className={className} bgGradient="amber">
      <defs>
        <linearGradient id="oil-body" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="40%" stopColor="#F59E0B" />
          <stop offset="60%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <linearGradient id="oil-top" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#78350F" />
          <stop offset="100%" stopColor="#B45309" />
        </linearGradient>
      </defs>
      {/* Верхняя шляпка (шестигранник) */}
      <ellipse cx="60" cy="28" rx="22" ry="5" fill="url(#oil-top)" />
      <rect x="38" y="28" width="44" height="4" fill="#78350F" />
      {/* Основной корпус цилиндра */}
      <rect x="38" y="32" width="44" height="48" fill="url(#oil-body)" />
      {/* Горизонтальные полосы (для объёма) */}
      <rect x="38" y="42" width="44" height="2" fill="#78350F" opacity="0.4" />
      <rect x="38" y="54" width="44" height="2" fill="#78350F" opacity="0.4" />
      <rect x="38" y="66" width="44" height="2" fill="#78350F" opacity="0.4" />
      {/* Лейбл на корпусе */}
      <rect x="44" y="47" width="32" height="14" rx="1" fill="#FEF3C7" stroke="#92400E" strokeWidth="0.5" />
      <rect x="47" y="50" width="26" height="2" rx="0.5" fill="#92400E" />
      <rect x="47" y="54" width="20" height="1.5" rx="0.5" fill="#92400E" opacity="0.6" />
      <rect x="47" y="57" width="24" height="1.5" rx="0.5" fill="#92400E" opacity="0.6" />
      {/* Нижняя часть (резьба) */}
      <rect x="40" y="80" width="40" height="8" fill="#475569" />
      <line x1="40" y1="83" x2="80" y2="83" stroke="#1E293B" strokeWidth="0.6" />
      <line x1="40" y1="86" x2="80" y2="86" stroke="#1E293B" strokeWidth="0.6" />
      {/* Резиновая прокладка внизу */}
      <ellipse cx="60" cy="88" rx="20" ry="3" fill="#1E293B" />
    </IllustrationFrame>
  );
}

/** 3. Воздушный фильтр — прямоугольная панель со складками шторки. */
export function AirFilterArt({ className }: IllustrationProps) {
  return (
    <IllustrationFrame className={className} bgGradient="blue">
      <defs>
        <linearGradient id="air-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#334155" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <linearGradient id="air-pleats" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#E2E8F0" />
        </linearGradient>
      </defs>
      {/* Рамка фильтра */}
      <rect x="22" y="36" width="76" height="48" rx="3" fill="url(#air-frame)" />
      {/* Внутренняя область для шторки */}
      <rect x="28" y="42" width="64" height="36" fill="url(#air-pleats)" />
      {/* Складки шторки — вертикальные линии-тени */}
      {Array.from({ length: 15 }).map((_, i) => {
        const x = 30 + i * 4;
        return (
          <g key={i}>
            <line x1={x} y1="42" x2={x} y2="78" stroke="#94A3B8" strokeWidth="0.8" />
            <line x1={x + 2} y1="42" x2={x + 2} y2="78" stroke="#CBD5E1" strokeWidth="0.5" />
          </g>
        );
      })}
      {/* Верхняя и нижняя резинки */}
      <rect x="22" y="36" width="76" height="4" fill="#1E293B" />
      <rect x="22" y="80" width="76" height="4" fill="#1E293B" />
      {/* Блик */}
      <rect x="30" y="42" width="8" height="36" fill="#FFFFFF" opacity="0.3" />
    </IllustrationFrame>
  );
}

/** 4. Салонный фильтр — складчатый прямоугольник с воздушным потоком. */
export function CabinFilterArt({ className }: IllustrationProps) {
  return (
    <IllustrationFrame className={className} bgGradient="blue">
      <defs>
        <linearGradient id="cabin-frame" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#475569" />
          <stop offset="100%" stopColor="#1E293B" />
        </linearGradient>
        <linearGradient id="cabin-pleats" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#FED7AA" />
          <stop offset="100%" stopColor="#F59E0B" />
        </linearGradient>
      </defs>
      {/* Рамка */}
      <rect x="24" y="38" width="72" height="48" rx="2" fill="url(#cabin-frame)" />
      {/* Складки (пиковые) — зигзаг */}
      <path
        d="M28 42 L32 82 L36 42 L40 82 L44 42 L48 82 L52 42 L56 82 L60 42 L64 82 L68 42 L72 82 L76 42 L80 82 L84 42 L88 82 L92 42"
        fill="url(#cabin-pleats)"
        stroke="#B45309"
        strokeWidth="0.5"
        strokeLinejoin="round"
      />
      {/* Боковые резинки */}
      <rect x="24" y="38" width="4" height="48" fill="#0F172A" />
      <rect x="92" y="38" width="4" height="48" fill="#0F172A" />
      {/* Потоки воздуха (стрелки справа сверху) */}
      <path
        d="M100 30 Q106 30 106 36"
        stroke="#3B82F6"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.7"
      />
      <path d="M104 34 L106 36 L108 34" stroke="#3B82F6" strokeWidth="2" fill="none" opacity="0.7" />
      <path
        d="M102 24 Q110 24 110 30"
        stroke="#3B82F6"
        strokeWidth="2"
        fill="none"
        strokeLinecap="round"
        opacity="0.5"
      />
    </IllustrationFrame>
  );
}

/** 5. Прокладки и сальники — металлическая прокладка с отверстиями под болты. */
export function GasketArt({ className }: IllustrationProps) {
  return (
    <IllustrationFrame className={className} bgGradient="slate">
      <defs>
        <radialGradient id="gasket-metal" cx="0.5" cy="0.5" r="0.7">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="50%" stopColor="#CBD5E1" />
          <stop offset="100%" stopColor="#475569" />
        </radialGradient>
      </defs>
      {/* Внешний контур прокладки (неправильной формы) */}
      <path
        d="M30 42 Q30 34 38 34 L82 34 Q90 34 90 42 L90 78 Q90 86 82 86 L38 86 Q30 86 30 78 Z"
        fill="url(#gasket-metal)"
        stroke="#334155"
        strokeWidth="1.5"
      />
      {/* Центральное отверстие (цилиндр) */}
      <circle cx="60" cy="60" r="14" fill="#FCD34D" stroke="#92400E" strokeWidth="1" />
      <circle cx="60" cy="60" r="11" fill="none" stroke="#B45309" strokeWidth="0.8" opacity="0.5" />
      {/* Отверстия под болты по углам */}
      <circle cx="36" cy="40" r="2.5" fill="#1E293B" />
      <circle cx="84" cy="40" r="2.5" fill="#1E293B" />
      <circle cx="36" cy="80" r="2.5" fill="#1E293B" />
      <circle cx="84" cy="80" r="2.5" fill="#1E293B" />
      <circle cx="36" cy="60" r="2" fill="#1E293B" />
      <circle cx="84" cy="60" r="2" fill="#1E293B" />
      {/* Блик сверху */}
      <path
        d="M34 38 Q34 36 36 36 L50 36"
        stroke="#FFFFFF"
        strokeWidth="2"
        fill="none"
        opacity="0.8"
      />
    </IllustrationFrame>
  );
}

/** 6. Комплект ГРМ — зубчатый ремень с роликами. */
export function TimingBeltArt({ className }: IllustrationProps) {
  return (
    <IllustrationFrame className={className} bgGradient="slate">
      <defs>
        <linearGradient id="belt-body" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1E293B" />
          <stop offset="50%" stopColor="#475569" />
          <stop offset="100%" stopColor="#0F172A" />
        </linearGradient>
        <radialGradient id="pulley" cx="0.5" cy="0.5" r="0.5">
          <stop offset="0%" stopColor="#F8FAFC" />
          <stop offset="70%" stopColor="#94A3B8" />
          <stop offset="100%" stopColor="#334155" />
        </radialGradient>
      </defs>
      {/* Внешний контур ремня (замкнутая петля овальной формы) */}
      <path
        d="M36 48 Q36 38 46 38 L74 38 Q84 38 84 48 L84 72 Q84 82 74 82 L46 82 Q36 82 36 72 Z"
        fill="none"
        stroke="url(#belt-body)"
        strokeWidth="8"
      />
      {/* Зубцы на ремне — чёрточки по внутренней стороне */}
      {Array.from({ length: 18 }).map((_, i) => {
        const angle = (i / 18) * Math.PI * 2;
        const cx = 60 + Math.cos(angle) * 22;
        const cy = 60 + Math.sin(angle) * 16;
        return <circle key={i} cx={cx} cy={cy} r="1.2" fill="#F59E0B" />;
      })}
      {/* Левый шкив */}
      <circle cx="46" cy="60" r="8" fill="url(#pulley)" stroke="#1E293B" strokeWidth="1" />
      <circle cx="46" cy="60" r="2" fill="#F59E0B" />
      {/* Правый шкив */}
      <circle cx="74" cy="60" r="8" fill="url(#pulley)" stroke="#1E293B" strokeWidth="1" />
      <circle cx="74" cy="60" r="2" fill="#F59E0B" />
      {/* Подпись-индикатор в центре */}
      <rect x="56" y="56" width="8" height="8" rx="1" fill="#F59E0B" opacity="0.9" />
      <text x="60" y="62" textAnchor="middle" fontSize="6" fontWeight="bold" fill="#1E293B">
        ГРМ
      </text>
    </IllustrationFrame>
  );
}
