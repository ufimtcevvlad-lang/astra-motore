/**
 * Векторный знак Astra Motors: кольцо, шестерня (12 зубцов), AM, янтарный акцент.
 * Соответствует варианту 1, но в чётком качестве и цветах сайта.
 */
const TEETH = Array.from({ length: 12 }, (_, i) => i * 30);

type Props = {
  className?: string;
};

export function AstraMarkSvg({ className }: Props) {
  return (
    <svg
      viewBox="0 0 64 64"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      aria-hidden
    >
      <defs>
        <linearGradient
          id="astraMarkGold"
          x1="6"
          y1="4"
          x2="58"
          y2="60"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#fffbeb" />
          <stop offset="0.28" stopColor="#fde047" />
          <stop offset="0.55" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
        <linearGradient id="astraMarkGoldDim" x1="32" y1="12" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fef3c7" stopOpacity="0.95" />
          <stop offset="1" stopColor="#d97706" stopOpacity="0.9" />
        </linearGradient>
      </defs>

      {/* Внешнее кольцо */}
      <circle cx="32" cy="32" r="30.5" stroke="url(#astraMarkGold)" strokeWidth="1.35" opacity={0.95} />

      {/* Зубцы шестерни */}
      <g transform="translate(32 32)" fill="url(#astraMarkGold)">
        {TEETH.map((deg) => (
          <rect
            key={deg}
            x="-1.85"
            y="-30.5"
            width="3.7"
            height="7.2"
            rx="1.1"
            transform={`rotate(${deg})`}
          />
        ))}
      </g>

      {/* Внутренний обод «втулки» */}
      <circle cx="32" cy="32" r="22.5" stroke="url(#astraMarkGoldDim)" strokeWidth="0.9" opacity={0.45} />
      <circle cx="32" cy="32" r="19.5" stroke="url(#astraMarkGold)" strokeWidth="1.5" />

      {/* Монограмма AM */}
      <g
        stroke="url(#astraMarkGold)"
        strokeWidth="2.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d="M24 46 L32 18 L40 46" />
        <path d="M27.5 34 H36.5" />
        <path d="M44 46 V26 L38 32 L32 26 V46" />
      </g>

      {/* Акцент — ромб (как на референсе, цвет ближе к amber-500 сайта) */}
      <rect
        x="31"
        y="30.5"
        width="2.6"
        height="7.2"
        rx="1.3"
        fill="#f59e0b"
        transform="rotate(45 32 34)"
      />
      <rect
        x="31.35"
        y="31.2"
        width="1.3"
        height="3"
        rx="0.65"
        fill="#fde68a"
        opacity={0.55}
        transform="rotate(45 32 34)"
      />
    </svg>
  );
}
