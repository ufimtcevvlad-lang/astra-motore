"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { highlightQuery } from "../../lib/highlight-query";
import { ProductImage } from "../ProductImage";
import { watermarkedImageUrl } from "../../lib/watermark-images";
import type { SearchResultItem } from "../../lib/catalog-search";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

function SearchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <path
        d="M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
      <path
        d="M16.5 16.5 21 21"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function HeaderSearchAutocomplete() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromCatalog = pathname === "/catalog" ? (searchParams.get("q") ?? "") : "";

  const [value, setValue] = useState(qFromCatalog);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const requestSeqRef = useRef(0);

  useEffect(() => {
    setValue(qFromCatalog);
  }, [qFromCatalog]);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (trimmed.length < MIN_CHARS) {
      abortRef.current?.abort();
      setLoading(false);
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort();
      const controller = new AbortController();
      abortRef.current = controller;
      const requestSeq = ++requestSeqRef.current;
      try {
        const res = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(trimmed)}&limit=10`,
          { cache: "no-store", signal: controller.signal }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: SearchResultItem[] };
        if (requestSeq === requestSeqRef.current) {
          setResults(data.results ?? []);
        }
      } catch (error) {
        if ((error as Error).name !== "AbortError" && requestSeq === requestSeqRef.current) {
          setResults([]);
        }
      } finally {
        if (requestSeq === requestSeqRef.current) {
          setLoading(false);
        }
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      abortRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    function onDocDown(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", onDocDown);
    return () => document.removeEventListener("mousedown", onDocDown);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const onSubmit = () => {
    setOpen(false);
  };

  const clearInput = () => {
    setValue("");
    setResults([]);
    setOpen(false);
    setLoading(false);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    abortRef.current?.abort();
  };

  const showSuggestions = open && value.trim().length >= MIN_CHARS;
  const qHighlight = value.trim();

  return (
    <div ref={wrapRef} className="relative w-full min-w-0 flex-1 lg:max-w-none">
      <form action="/catalog" method="get" onSubmit={onSubmit} className="flex w-full min-w-0 items-stretch gap-1.5 sm:gap-2" role="search">
        <label htmlFor="header-catalog-q" className="sr-only">
          Поиск по номеру или названию детали
        </label>
        <div className="relative flex min-w-0 flex-1 items-center rounded-xl border border-slate-600/80 bg-slate-900/50 transition focus-within:border-amber-400/70 focus-within:ring-2 focus-within:ring-amber-400/25">
          <span className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-500 sm:left-3">
            <SearchIcon className="h-[18px] w-[18px]" />
          </span>
          <input
            id="header-catalog-q"
            name="q"
            type="text"
            value={value}
            onChange={(e) => {
              const v = e.target.value;
              setValue(v);
              setOpen(true);
              fetchSuggestions(v);
            }}
            onFocus={() => {
              setOpen(true);
              fetchSuggestions(value);
            }}
            placeholder="Введите номер или название детали"
            autoComplete="off"
            aria-autocomplete="list"
            className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-9 pr-8 text-xs text-slate-100 placeholder:text-slate-500 outline-none ring-0 sm:pl-10 sm:pr-9 sm:text-sm"
          />
          {value ? (
            <button
              type="button"
              onClick={clearInput}
              className="absolute right-1 top-1/2 flex h-7 w-7 -translate-y-1/2 items-center justify-center rounded-md text-slate-400 transition hover:bg-slate-800 hover:text-slate-200 sm:right-2"
              aria-label="Очистить поле"
            >
              <span className="text-lg leading-none" aria-hidden>
                ×
              </span>
            </button>
          ) : null}
        </div>
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-black/20 transition hover:bg-amber-300 sm:px-4 sm:text-sm"
        >
          Найти
        </button>
      </form>

      {showSuggestions && (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-2 flex max-h-[min(65vh,400px)] flex-col overflow-hidden rounded-xl border border-slate-700/90 bg-[#0a1018] shadow-2xl shadow-black/50"
          role="listbox"
          aria-label="Подсказки по каталогу"
        >
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">Ищем…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              Ничего не найдено. Нажмите «Найти» для перехода в каталог.
            </div>
          ) : (
            <>
              <div className="shrink-0 border-b border-slate-800/80 px-3 py-2 text-xs font-medium text-slate-500">
                Товары
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain [scrollbar-width:thin]">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.slug}`}
                    role="option"
                    onClick={() => setOpen(false)}
                    className="flex items-center gap-3 border-b border-slate-800/60 px-3 py-2.5 transition last:border-b-0 hover:bg-slate-800/40"
                  >
                    <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-lg border border-slate-600 bg-white ring-1 ring-slate-700/80">
                      <div className="absolute inset-0.5">
                        <ProductImage
                          src={watermarkedImageUrl(p.image, "card")}
                          alt={`${p.name}, арт. ${p.sku}`}
                          fill
                          className="object-contain object-center"
                          sizes="56px"
                        />
                      </div>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-[13px] leading-snug text-slate-200">
                        {highlightQuery(p.sku, qHighlight)}
                        <span className="text-slate-500"> · </span>
                        {highlightQuery(p.brand, qHighlight)}
                        <span className="text-slate-500"> · </span>
                        {highlightQuery(p.name, qHighlight)}
                      </p>
                      <p className="mt-1 text-xs font-semibold tabular-nums text-amber-400/95">
                        {p.price.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="shrink-0 border-t border-slate-800/80 px-3 py-2">
                <Link
                  href={`/catalog?q=${encodeURIComponent(value.trim())}`}
                  onClick={() => setOpen(false)}
                  className="block text-center text-xs font-medium text-amber-300/90 hover:text-amber-200"
                >
                  Все совпадения в каталоге →
                </Link>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function HeaderSearchAutocompleteFallback() {
  return (
    <form action="/catalog" method="get" className="flex w-full min-w-0 flex-1 items-stretch gap-1.5 sm:gap-2 lg:max-w-none" role="search">
      <label htmlFor="header-catalog-q-fb" className="sr-only">
        Поиск по номеру или названию детали
      </label>
      <div className="relative flex min-w-0 flex-1 items-center rounded-xl border border-slate-600/80 bg-slate-900/50">
        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-500">
          <SearchIcon className="h-[18px] w-[18px]" />
        </span>
        <input
          id="header-catalog-q-fb"
          name="q"
          type="search"
          placeholder="Введите номер или название детали"
          autoComplete="off"
          className="min-w-0 flex-1 border-0 bg-transparent py-2 pl-10 pr-3 text-xs text-slate-100 placeholder:text-slate-500 outline-none ring-0 sm:text-sm"
        />
      </div>
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-amber-400 px-3 py-2 text-xs font-semibold text-slate-950 shadow-md shadow-black/20 transition hover:bg-amber-300 sm:px-4 sm:text-sm"
      >
        Найти
      </button>
    </form>
  );
}
