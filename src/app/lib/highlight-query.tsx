import type { ReactNode } from "react";

function escapeRegExp(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/**
 * Подсветка вхождений запроса (фирменный янтарь). Регистр сохраняется в тексте.
 */
export function highlightQuery(text: string, query: string): ReactNode {
  const q = query.trim();
  if (!q) return text;

  const re = new RegExp(`(${escapeRegExp(q)})`, "gi");
  const parts = text.split(re);
  if (parts.length === 1) return text;

  return parts.map((part, i) => {
    if (part.toLowerCase() === q.toLowerCase()) {
      return (
        <mark
          key={i}
          className="bg-transparent font-semibold text-amber-400"
        >
          {part}
        </mark>
      );
    }
    return part;
  });
}
