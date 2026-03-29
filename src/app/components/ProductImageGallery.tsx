"use client";

import { useState } from "react";
import { ProductImage } from "./ProductImage";

type Props = {
  alt: string;
  urls: string[];
};

export function ProductImageGallery({ alt, urls }: Props) {
  const list = urls.filter(Boolean);
  const [active, setActive] = useState(0);
  const current = list[active] ?? list[0];

  if (list.length === 0) {
    return (
      <div className="aspect-[4/3] rounded-lg bg-slate-100" aria-hidden />
    );
  }

  if (list.length === 1) {
    return (
      <div className="aspect-[4/3] relative overflow-hidden rounded-lg bg-slate-100">
        <ProductImage
          src={list[0]}
          alt={alt}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          quality={85}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="aspect-[4/3] relative overflow-hidden rounded-lg bg-slate-100">
        <ProductImage
          key={current}
          src={current}
          alt={`${alt} — фото ${active + 1} из ${list.length}`}
          fill
          className="object-contain"
          sizes="(max-width: 768px) 100vw, 50vw"
          quality={85}
        />
      </div>
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Фотографии товара">
        {list.map((src, idx) => (
          <button
            key={`${src}-${idx}`}
            type="button"
            role="tab"
            aria-selected={idx === active}
            aria-label={`Показать фото ${idx + 1}`}
            onClick={() => setActive(idx)}
            className={`relative h-16 w-16 shrink-0 overflow-hidden rounded-md border-2 transition focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 ${
              idx === active ? "border-amber-500 ring-1 ring-amber-400/40" : "border-slate-200 hover:border-slate-300"
            }`}
          >
            <ProductImage
              src={src}
              alt=""
              fill
              className="object-cover"
              sizes="64px"
              quality={60}
            />
          </button>
        ))}
      </div>
    </div>
  );
}
