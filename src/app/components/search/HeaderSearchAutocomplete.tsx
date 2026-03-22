"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { ProductImage } from "../ProductImage";
import type { SearchResultItem } from "../../lib/catalog-search";

const DEBOUNCE_MS = 300;
const MIN_CHARS = 2;

export function HeaderSearchAutocomplete() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const qFromCatalog = pathname === "/catalog" ? (searchParams.get("q") ?? "") : "";

  const [value, setValue] = useState(qFromCatalog);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const wrapRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setValue(qFromCatalog);
  }, [qFromCatalog]);

  const fetchSuggestions = useCallback((q: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = q.trim();
    if (trimmed.length < MIN_CHARS) {
      setLoading(false);
      setResults([]);
      return;
    }
    setLoading(true);
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `/api/catalog/search?q=${encodeURIComponent(trimmed)}&limit=10`,
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(String(res.status));
        const data = (await res.json()) as { results: SearchResultItem[] };
        setResults(data.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, DEBOUNCE_MS);
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
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

  const onSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setOpen(false);
    const q = value.trim();
    router.push(q ? `/catalog?q=${encodeURIComponent(q)}` : "/catalog");
  };

  const showSuggestions = open && value.trim().length >= MIN_CHARS;

  return (
    <div ref={wrapRef} className="relative w-full min-w-0 flex-1 lg:max-w-none">
      <form
        onSubmit={onSubmit}
        className="flex w-full min-w-0 items-stretch gap-2"
        role="search"
      >
        <label htmlFor="header-catalog-q" className="sr-only">
          Поиск по номеру или названию детали
        </label>
        <input
          id="header-catalog-q"
          type="search"
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
          className="min-w-0 flex-1 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/25"
        />
        <button
          type="submit"
          className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-black/20 transition hover:bg-amber-300"
        >
          Поиск
        </button>
      </form>

      {showSuggestions && (
        <div
          className="absolute left-0 right-0 top-full z-[100] mt-2 max-h-[min(70vh,420px)] overflow-hidden rounded-xl border border-slate-700/90 bg-[#0a1018] shadow-2xl shadow-black/50"
          role="listbox"
          aria-label="Подсказки по каталогу"
        >
          {loading ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">Ищем…</div>
          ) : results.length === 0 ? (
            <div className="px-4 py-6 text-center text-sm text-slate-400">
              Ничего не найдено. Нажмите «Поиск» для полного каталога.
            </div>
          ) : (
            <>
              <div className="border-b border-slate-800/80 px-3 py-2 text-[11px] font-medium uppercase tracking-wide text-slate-500">
                Подсказки — прокрутите вправо
              </div>
              <div className="flex snap-x gap-3 overflow-x-auto overscroll-x-contain px-3 py-3 [scrollbar-width:thin]">
                {results.map((p) => (
                  <Link
                    key={p.id}
                    href={`/product/${p.id}`}
                    role="option"
                    onClick={() => setOpen(false)}
                    className="group flex w-[9.5rem] shrink-0 snap-start flex-col overflow-hidden rounded-lg border border-slate-700/80 bg-slate-900/60 transition hover:border-amber-500/50 hover:bg-slate-900"
                  >
                    <div className="relative aspect-[4/3] w-full bg-slate-800/80">
                      <ProductImage
                        src={p.image}
                        alt={p.name}
                        fill
                        className="object-cover transition group-hover:opacity-95"
                        sizes="152px"
                      />
                    </div>
                    <div className="flex flex-1 flex-col gap-1 p-2">
                      <p className="line-clamp-2 text-[11px] font-medium leading-snug text-slate-100">
                        {p.name}
                      </p>
                      <p className="text-[10px] text-slate-500">Арт. {p.sku}</p>
                      <p className="mt-auto text-sm font-semibold tabular-nums text-amber-400">
                        {p.price.toLocaleString("ru-RU")} ₽
                      </p>
                    </div>
                  </Link>
                ))}
              </div>
              <div className="border-t border-slate-800/80 px-3 py-2">
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
    <form
      action="/catalog"
      method="get"
      className="flex w-full min-w-0 flex-1 items-stretch gap-2 lg:max-w-none"
      role="search"
    >
      <label htmlFor="header-catalog-q-fb" className="sr-only">
        Поиск по номеру или названию детали
      </label>
      <input
        id="header-catalog-q-fb"
        name="q"
        type="search"
        placeholder="Введите номер или название детали"
        autoComplete="off"
        className="min-w-0 flex-1 rounded-xl border border-slate-600/80 bg-slate-900/50 px-3 py-2.5 text-sm text-slate-100 placeholder:text-slate-500 outline-none transition focus:border-amber-400/70 focus:ring-2 focus:ring-amber-400/25"
      />
      <button
        type="submit"
        className="shrink-0 rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-slate-950 shadow-md shadow-black/20 transition hover:bg-amber-300"
      >
        Поиск
      </button>
    </form>
  );
}
