import { SITE_REGION_CODE } from "../lib/site";

type Props = {
  /** Шапка сайта или крупный блок на главной */
  variant?: "header" | "hero";
  className?: string;
};

/**
 * Фирменный локап: GM SHOP + бейдж региона (66), без «склеивания» кода с названием.
 */
export function BrandWordmark({ variant = "header", className = "" }: Props) {
  const hero = variant === "hero";

  return (
    <span className={`inline-flex flex-wrap items-center gap-2.5 sm:gap-3 ${className}`}>
      <span
        className={
          hero
            ? "font-semibold uppercase leading-[1.05] tracking-[0.14em] text-[clamp(1.85rem,5.2vw,3.15rem)] sm:tracking-[0.18em]"
            : "text-[0.88rem] font-semibold uppercase leading-tight tracking-[0.13em] sm:text-[1.05rem] md:text-[1.28rem] md:tracking-[0.17em]"
        }
      >
        <span className="text-amber-400 drop-shadow-[0_0_24px_rgba(251,191,36,0.2)]">GM</span>
        <span className="text-slate-50"> SHOP</span>
      </span>
      <span
        className={
          hero
            ? "inline-flex items-center rounded-lg border border-amber-400/45 bg-gradient-to-b from-amber-400/[0.18] to-amber-950/30 px-2.5 py-1 text-sm font-bold tabular-nums tracking-wide text-amber-200 shadow-[inset_0_1px_0_rgba(255,255,255,0.08)]"
            : "inline-flex items-center rounded-md border border-amber-400/40 bg-amber-500/[0.12] px-1.5 py-0.5 text-[0.62rem] font-bold tabular-nums text-amber-300 sm:px-2 sm:text-[0.68rem]"
        }
        title="Свердловская область, Екатеринбург"
        aria-label={`Код региона ${SITE_REGION_CODE}`}
      >
        {SITE_REGION_CODE}
      </span>
    </span>
  );
}
