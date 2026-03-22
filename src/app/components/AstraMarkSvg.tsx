"use client";

import { useId } from "react";

/**
 * Знак как на референсе «вариант 1»:
 * — одна цельная шестерня (12 зубьев), не «лучи»;
 * — тонкое внешнее кольцо;
 * — AM жирные, со светлой заливкой и тёмной обводкой (читаемость на шестерне);
 * — ромб у верхнего правого угла буквы M;
 * цвета — янтарно-золотая палитра сайта.
 */
const GEAR_PATH =
  "M26.62,11.91 L32,4.4 L37.38,11.91 L45.8,8.1 L46.71,17.29 L55.9,18.2 L52.09,26.62 L59.6,32 L52.09,37.38 L55.9,45.8 L46.71,46.71 L45.8,55.9 L37.38,52.09 L32,59.6 L26.62,52.09 L18.2,55.9 L17.29,46.71 L8.1,45.8 L11.91,37.38 L4.4,32 L11.91,26.62 L8.1,18.2 L17.29,17.29 L18.2,8.1 L26.62,11.91 Z";

type Props = {
  className?: string;
};

export function AstraMarkSvg({ className }: Props) {
  const id = useId().replace(/:/g, "");
  const gFill = `amFill-${id}`;
  const gStroke = `amStroke-${id}`;

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
        <linearGradient id={gFill} x1="14" y1="8" x2="50" y2="56" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fffef0" />
          <stop offset="0.35" stopColor="#fef08a" />
          <stop offset="0.65" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={gStroke} x1="32" y1="4" x2="32" y2="60" gradientUnits="userSpaceOnUse">
          <stop stopColor="#facc15" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>

      {/* Сначала шестерня (как на макете — сплошной силуэт) */}
      <path d={GEAR_PATH} fill={`url(#${gFill})`} stroke={`url(#${gStroke})`} strokeWidth={0.45} strokeLinejoin="round" />

      {/* Внешнее тонкое кольцо — как у референса */}
      <circle cx={32} cy={32} r={30.35} fill="none" stroke={`url(#${gStroke})`} strokeWidth={1.15} opacity={0.95} />

      {/* AM: сначала тёмная «обводка», поверх — золотой штрих (как белый+чёрный на референсе) */}
      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        {/* Буква A */}
        <path d="M24 46 L32 19 L40 46" stroke="#020617" strokeWidth={5.2} />
        <path d="M24 46 L32 19 L40 46" stroke={`url(#${gFill})`} strokeWidth={3.05} />
        <path d="M27.2 34.2 H36.8" stroke="#020617" strokeWidth={5} />
        <path d="M27.2 34.2 H36.8" stroke={`url(#${gFill})`} strokeWidth={2.95} />

        {/* Буква M */}
        <path d="M42.2 46 V25.5 L38 31.2 L32 25.5 V46" stroke="#020617" strokeWidth={5.2} />
        <path d="M42.2 46 V25.5 L38 31.2 L32 25.5 V46" stroke={`url(#${gFill})`} strokeWidth={3.05} />
      </g>

      {/* Ромб у верхней правой части M (как на референсе), красный акцент */}
      <path
        d="M43.8 22.6 L46.35 25.15 L43.8 27.7 L41.25 25.15 Z"
        fill="#ef4444"
        stroke="#7f1d1d"
        strokeWidth={0.35}
        strokeLinejoin="round"
      />
      <path d="M43.8 23.55 L45.25 25.1 L43.8 26.65 L42.35 25.1 Z" fill="#fca5a5" opacity={0.45} />
    </svg>
  );
}
