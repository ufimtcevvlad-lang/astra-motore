import type { Metadata } from "next";
import {
  AirFilterIcon,
  CabinFilterIcon,
  CoolingIcon,
  EngineIcon,
  GasketIcon,
  LightBulbIcon,
  OilFilterIcon,
  SparkPlugIcon,
  SuspensionIcon,
} from "../../components/icons/CategoryIcons";

export const metadata: Metadata = {
  title: "Превью иконок категорий",
  robots: { index: false, follow: false },
};

const ICONS = [
  { name: "Свечи и зажигание", Icon: SparkPlugIcon },
  { name: "Масляные фильтры", Icon: OilFilterIcon },
  { name: "Воздушные фильтры", Icon: AirFilterIcon },
  { name: "Салонные фильтры", Icon: CabinFilterIcon },
  { name: "Прокладки и сальники", Icon: GasketIcon },
  { name: "Охлаждение", Icon: CoolingIcon },
  { name: "Подвеска", Icon: SuspensionIcon },
  { name: "Двигатель", Icon: EngineIcon },
  { name: "Свет и электрика", Icon: LightBulbIcon },
];

export default function IconsPreviewPage() {
  return (
    <div className="space-y-10 py-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Иконки категорий — превью</h1>
        <p className="mt-2 text-sm text-slate-600">
          Временная страница для утверждения стиля иконок. Stroke-outline, 1.75 толщина, 24×24,
          цвет через currentColor.
        </p>
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Крупный размер · амбер</h2>
        <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-200 bg-white p-6 sm:grid-cols-4 lg:grid-cols-5">
          {ICONS.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4"
            >
              <Icon className="h-12 w-12 text-amber-500" />
              <span className="text-center text-xs font-medium text-slate-700">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">На тёмном фоне · белый</h2>
        <div className="grid grid-cols-3 gap-4 rounded-2xl border border-slate-800 bg-slate-950 p-6 sm:grid-cols-4 lg:grid-cols-5">
          {ICONS.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-3 rounded-xl border border-slate-800 bg-slate-900 p-4"
            >
              <Icon className="h-12 w-12 text-amber-400" />
              <span className="text-center text-xs font-medium text-slate-300">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Мелкий размер · слейт (как в меню)</h2>
        <div className="flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-6">
          {ICONS.map(({ name, Icon }) => (
            <div
              key={name}
              className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2"
            >
              <Icon className="h-5 w-5 text-slate-600" />
              <span className="text-sm font-medium text-slate-700">{name}</span>
            </div>
          ))}
        </div>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-800">Гигантский размер (для hero-плиток)</h2>
        <div className="grid grid-cols-3 gap-6 rounded-2xl border border-amber-100 bg-amber-50/40 p-8 sm:grid-cols-5">
          {ICONS.map(({ name, Icon }) => (
            <div
              key={name}
              className="flex flex-col items-center gap-4 rounded-2xl border border-amber-200/60 bg-white p-6 shadow-sm"
            >
              <Icon className="h-16 w-16 text-amber-600" />
              <span className="text-center text-xs font-semibold uppercase tracking-wide text-slate-600">
                {name}
              </span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
