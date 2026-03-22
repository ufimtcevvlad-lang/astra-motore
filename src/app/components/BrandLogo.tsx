/**
 * Логотип Astra Motors — строгий минималистичный стиль:
 * тонкий геометрический знак + типографика без градиентов и декоративных эффектов.
 */
export function BrandLogo() {
  return (
    <div className="flex min-w-0 items-center gap-3.5 sm:gap-5">
      {/* Знак: рамка + монограмма — как печать/штамп */}
      <div
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[3px] border border-amber-400/65 bg-transparent transition-colors duration-200 group-hover:border-amber-300/90 sm:h-10 sm:w-10"
        aria-hidden
      >
        <span className="text-[0.6rem] font-semibold tracking-[0.22em] text-amber-400 sm:text-[0.65rem]">
          AM
        </span>
      </div>

      {/* Словесная часть */}
      <div className="min-w-0 select-none">
        <p className="font-medium uppercase leading-none tracking-[0.2em] text-white sm:tracking-[0.24em]">
          <span className="block text-[0.95rem] sm:text-lg lg:text-xl">
            ASTRA{" "}
            <span className="text-amber-400">MOTORS</span>
          </span>
        </p>
        {/* Разделитель — одна линия, «редакционный» акцент */}
        <div className="mt-2.5 h-px w-10 bg-amber-500/35 sm:w-12" aria-hidden />
        <p className="mt-2.5 max-w-[16rem] text-[10px] font-normal uppercase leading-relaxed tracking-[0.14em] text-slate-500 sm:max-w-none sm:text-[11px] sm:tracking-[0.16em]">
          Автозапчасти GM
          <span className="text-slate-600"> · </span>
          <span className="font-normal normal-case tracking-normal text-slate-400">Opel & Chevrolet</span>
        </p>
      </div>
    </div>
  );
}
