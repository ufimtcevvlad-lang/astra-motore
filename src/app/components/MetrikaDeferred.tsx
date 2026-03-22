"use client";

import dynamic from "next/dynamic";

/** Метрика грузится отдельным чанком после гидрации — не блокирует первый экран. */
const YandexMetrika = dynamic(
  () => import("./YandexMetrika").then((m) => ({ default: m.YandexMetrika })),
  { ssr: false }
);

export function MetrikaDeferred() {
  return <YandexMetrika />;
}
