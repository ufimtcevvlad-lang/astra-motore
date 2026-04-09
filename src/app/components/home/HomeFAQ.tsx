"use client";

import { useState } from "react";
import { HOME_FAQ_ITEMS } from "./home-faq-data";

export function HomeFAQ() {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <section className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold text-slate-900 sm:text-3xl">Частые вопросы</h2>
        <p className="mt-2 text-sm text-slate-600">
          Если вашего вопроса нет в списке — напишите в WhatsApp или Telegram
        </p>
      </div>

      <div className="mx-auto max-w-3xl space-y-3">
        {HOME_FAQ_ITEMS.map((item, i) => {
          const isOpen = openIndex === i;
          return (
            <article
              key={item.question}
              className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm"
            >
              <button
                type="button"
                onClick={() => setOpenIndex(isOpen ? null : i)}
                aria-expanded={isOpen}
                className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition hover:bg-slate-50"
              >
                <h3 className="text-sm font-semibold text-slate-900 sm:text-base">
                  {item.question}
                </h3>
                <span
                  className={`inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-amber-50 text-amber-700 transition-transform ${
                    isOpen ? "rotate-45" : ""
                  }`}
                  aria-hidden="true"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path
                      d="M8 3v10M3 8h10"
                      stroke="currentColor"
                      strokeWidth="1.8"
                      strokeLinecap="round"
                    />
                  </svg>
                </span>
              </button>
              {isOpen ? (
                <div className="border-t border-slate-100 bg-slate-50/50 px-5 py-4">
                  <p className="text-sm leading-relaxed text-slate-700">{item.answer}</p>
                </div>
              ) : null}
            </article>
          );
        })}
      </div>
    </section>
  );
}
