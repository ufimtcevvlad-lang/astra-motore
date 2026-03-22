"use client";

import { useId } from "react";

/** 12 зубьев, центр 50,50 — пересчитанный силуэт под viewBox 100 */
const GEAR_PATH =
  "M41.41,17.93 L50,6.2 L58.59,17.93 L71.9,12.07 L73.48,26.52 L87.93,28.1 L82.07,41.41 L93.8,50 L82.07,58.59 L87.93,71.9 L73.48,73.48 L71.9,87.93 L58.59,82.07 L50,93.8 L41.41,82.07 L28.1,87.93 L26.52,73.48 L12.07,71.9 L17.93,58.59 L6.2,50 L17.93,41.41 L12.07,28.1 L26.52,26.52 L28.1,12.07 L41.41,17.93 Z";

type Props = { className?: string };

/**
 * Фирменный знак: только вектор, без растров и фона.
 * Палитра сайта: золото + тёмная обводка букв + красный акцент.
 */
export function AstraMarkSvg({ className }: Props) {
  const id = useId().replace(/:/g, "");
  const gFill = `amFill-${id}`;
  const gStroke = `amStroke-${id}`;

  return (
    <svg
      viewBox="0 0 100 100"
      preserveAspectRatio="xMidYMid meet"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="geometricPrecision"
      aria-hidden
    >
      <defs>
        {/* Как у Tailwind bg-amber-400 / кнопки «Найти»: #fbbf24, светлее — amber-300, тень — amber-500 */}
        <linearGradient id={gFill} x1="18" y1="10" x2="82" y2="90" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fffbeb" />
          <stop offset="0.22" stopColor="#fde047" />
          <stop offset="0.5" stopColor="#fbbf24" />
          <stop offset="0.78" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#d97706" />
        </linearGradient>
        <linearGradient id={gStroke} x1="50" y1="6" x2="50" y2="94" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fde047" />
          <stop offset="0.45" stopColor="#fbbf24" />
          <stop offset="1" stopColor="#b45309" />
        </linearGradient>
      </defs>

      <path
        d={GEAR_PATH}
        fill={`url(#${gFill})`}
        stroke={`url(#${gStroke})`}
        strokeWidth={0.55}
        strokeLinejoin="round"
      />

      <circle cx={50} cy={50} r={47.25} fill="none" stroke={`url(#${gStroke})`} strokeWidth={1.35} opacity={0.98} />

      <g strokeLinecap="round" strokeLinejoin="round" fill="none">
        <path d="M37.5 71.88 L50 29.69 L62.5 71.88" stroke="#020617" strokeWidth={8.2} />
        <path d="M37.5 71.88 L50 29.69 L62.5 71.88" stroke={`url(#${gFill})`} strokeWidth={4.85} />
        <path d="M42.5 53.44 H57.5" stroke="#020617" strokeWidth={7.9} />
        <path d="M42.5 53.44 H57.5" stroke={`url(#${gFill})`} strokeWidth={4.65} />
        <path d="M65.94 71.88 V39.84 L59.38 48.75 L50 39.84 V71.88" stroke="#020617" strokeWidth={8.2} />
        <path d="M65.94 71.88 V39.84 L59.38 48.75 L50 39.84 V71.88" stroke={`url(#${gFill})`} strokeWidth={4.85} />
      </g>

      <path
        d="M68.44 35.31 L72.42 39.3 L68.44 43.28 L64.45 39.3 Z"
        fill="#ef4444"
        stroke="#7f1d1d"
        strokeWidth={0.45}
        strokeLinejoin="round"
      />
      <path d="M68.44 36.8 L70.7 39.3 L68.44 41.8 L66.18 39.3 Z" fill="#fecaca" opacity={0.5} />
    </svg>
  );
}
