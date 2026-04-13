"use client";

import { useState } from "react";
import { ProductDescription } from "../../../components/ProductDescription";

export function ExpandableDescription({ text }: { text: string }) {
  const [open, setOpen] = useState(false);

  if (!text.trim()) return null;

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="text-sm font-medium text-amber-700 hover:text-amber-800 transition flex items-center gap-1"
      >
        {open ? "Скрыть" : "Подробнее"}
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          className={`transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {open ? (
        <div className="mt-2">
          <ProductDescription text={text} />
        </div>
      ) : null}
    </div>
  );
}
