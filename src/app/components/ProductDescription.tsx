import { Fragment } from "react";

/** Убирает разметку `**…**` из текста для meta, JSON-LD и превью. */
export function plainProductDescription(text: string): string {
  return text.replace(/\*\*([^*]+)\*\*/g, "$1").replace(/\s+/g, " ").trim();
}

/**
 * Описание товара: поддержка простого жирного через `**фрагмент**` (как в products.ts).
 */
export function ProductDescription({ text, className }: { text: string; className?: string }) {
  const segments = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <p className={className ?? "text-sm text-slate-600 leading-relaxed"}>
      {segments.map((seg, i) => {
        const m = /^\*\*([^*]+)\*\*$/.exec(seg);
        if (m) {
          return (
            <strong key={i} className="font-semibold text-slate-800">
              {m[1]}
            </strong>
          );
        }
        return <Fragment key={i}>{seg}</Fragment>;
      })}
    </p>
  );
}
