"use client";

import { useState, type ReactNode } from "react";

export type ProductTab = {
  key: string;
  title: string;
  content: ReactNode;
};

type Props = {
  tabs: ProductTab[];
};

/**
 * Табы карточки товара. Все панели рендерятся в HTML сразу,
 * переключается только видимость через `hidden`/`block` — это
 * важно для SEO: поисковики видят весь контент при первом рендере.
 */
export function ProductTabs({ tabs }: Props) {
  const [activeKey, setActiveKey] = useState<string>(tabs[0]?.key ?? "");

  if (tabs.length === 0) return null;

  return (
    <section className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
      <div
        role="tablist"
        aria-label="Информация о товаре"
        className="flex gap-1 border-b border-slate-200 bg-slate-50/60 px-3 pt-3 overflow-x-auto"
      >
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <button
              key={tab.key}
              type="button"
              role="tab"
              aria-selected={isActive}
              aria-controls={`tab-panel-${tab.key}`}
              id={`tab-${tab.key}`}
              onClick={() => setActiveKey(tab.key)}
              className={`shrink-0 rounded-t-lg px-4 py-2.5 text-sm font-medium transition border-b-2 -mb-px focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400/35 ${
                isActive
                  ? "border-amber-500 bg-white text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:bg-white/60"
              }`}
            >
              {tab.title}
            </button>
          );
        })}
      </div>

      <div className="p-5">
        {tabs.map((tab) => {
          const isActive = tab.key === activeKey;
          return (
            <div
              key={tab.key}
              role="tabpanel"
              id={`tab-panel-${tab.key}`}
              aria-labelledby={`tab-${tab.key}`}
              hidden={!isActive}
            >
              {tab.content}
            </div>
          );
        })}
      </div>
    </section>
  );
}
