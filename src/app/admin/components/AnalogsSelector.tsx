"use client";

import { useEffect, useRef, useState } from "react";

interface Analog {
  analogId: number;
  name: string;
  sku: string;
  brand: string;
}

interface SearchResult {
  id: number;
  name: string;
  sku: string;
  brand: string | null;
}

interface AnalogsSelectorProps {
  analogs: Analog[];
  currentProductId?: number;
  onChange: (analogs: Analog[]) => void;
}

export default function AnalogsSelector({ analogs, currentProductId, onChange }: AnalogsSelectorProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [showResults, setShowResults] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      return;
    }

    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(async () => {
      try {
        const res = await fetch(`/api/admin/products?search=${encodeURIComponent(query)}&page=1`);
        const data = await res.json();
        const items: SearchResult[] = (data.items ?? []).filter(
          (item: SearchResult) =>
            item.id !== currentProductId && !analogs.some((a) => a.analogId === item.id)
        );
        setResults(items);
        setShowResults(true);
      } catch {
        setResults([]);
      }
    }, 300);
  }, [query, currentProductId, analogs]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowResults(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  function handleSelect(item: SearchResult) {
    onChange([
      ...analogs,
      { analogId: item.id, name: item.name, sku: item.sku, brand: item.brand ?? "" },
    ]);
    setQuery("");
    setResults([]);
    setShowResults(false);
  }

  function handleRemove(analogId: number) {
    onChange(analogs.filter((a) => a.analogId !== analogId));
  }

  return (
    <div>
      {/* Search */}
      <div ref={containerRef} className="relative">
        <input
          type="text"
          placeholder="Поиск товара для добавления аналога..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => results.length > 0 && setShowResults(true)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
        {showResults && results.length > 0 && (
          <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-48 overflow-y-auto">
            {results.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => handleSelect(item)}
                className="w-full text-left px-4 py-2 hover:bg-indigo-50 text-sm flex justify-between"
              >
                <span className="font-medium text-gray-900">{item.name}</span>
                <span className="text-gray-500">
                  {item.sku}{item.brand ? ` \u00b7 ${item.brand}` : ""}
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Selected analogs */}
      {analogs.length > 0 && (
        <div className="mt-3 space-y-2">
          {analogs.map((a) => (
            <div
              key={a.analogId}
              className="flex items-center justify-between px-3 py-2 bg-gray-50 rounded-lg"
            >
              <div className="text-sm">
                <span className="font-medium text-gray-900">{a.name}</span>
                <span className="text-gray-500 ml-2">
                  {a.sku}{a.brand ? ` \u00b7 ${a.brand}` : ""}
                </span>
              </div>
              <button
                type="button"
                onClick={() => handleRemove(a.analogId)}
                className="text-gray-400 hover:text-red-500 transition text-lg"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
