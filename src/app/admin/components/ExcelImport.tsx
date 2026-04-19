"use client";

import { useState, useRef, useCallback } from "react";
import Link from "next/link";
import { CATALOG_SECTIONS } from "@/app/data/catalog-sections";

/* ── Types matching the API ── */

interface ParsedRow {
  sku: string;
  name: string;
  rawName: string;
  brand: string;
  price: number;
  car: string;
  sectionSlug: string | null;
}

interface DuplicateRow extends ParsedRow {
  existing: { id: number; name: string; price: number; brand: string };
}

interface RejectedRow {
  sku: string;
  rawName: string;
  brand: string;
  price: number;
  reason: "non-gm";
}

interface PreviewData {
  newItems: ParsedRow[];
  duplicates: DuplicateRow[];
  rejected: RejectedRow[];
  totalParsed: number;
}

interface ConfirmResult {
  added: number;
  updated: number;
  errors: string[];
}

/* Editable row for new items */
interface EditableNewItem {
  sku: string;
  name: string;
  brand: string;
  price: number;
  car: string;
  sectionSlug: string;
}

/* Editable row for duplicates that user chooses to update */
interface EditableUpdateItem {
  id: number;
  sku: string;
  name: string;
  brand: string;
  price: number;
  car: string;
  sectionSlug: string;
}

type Step = "upload" | "preview" | "result";

const REASON_LABELS: Record<string, string> = {
  "non-gm": "Не-GM",
};

export default function ExcelImport() {
  const [step, setStep] = useState<Step>("upload");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [preview, setPreview] = useState<PreviewData | null>(null);
  const [result, setResult] = useState<ConfirmResult | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  /* Editable state for new items */
  const [editedNew, setEditedNew] = useState<EditableNewItem[]>([]);

  /* Duplicate update flags + editable overrides */
  const [updateFlags, setUpdateFlags] = useState<Record<number, boolean>>({});
  const [editedDups, setEditedDups] = useState<EditableUpdateItem[]>([]);

  const handleFile = useCallback(async (file: File) => {
    setError(null);
    setLoading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/products/import", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка загрузки");
        return;
      }
      setPreview(data as PreviewData);

      /* Initialise editable new items */
      setEditedNew(
        (data.newItems as ParsedRow[]).map((item) => ({
          sku: item.sku,
          name: item.name,
          brand: item.brand,
          price: item.price,
          car: item.car,
          sectionSlug: item.sectionSlug ?? "",
        }))
      );

      /* Initialise duplicate flags (all skip by default) and editable copies */
      const flags: Record<number, boolean> = {};
      (data.duplicates as DuplicateRow[]).forEach((_: DuplicateRow, i: number) => {
        flags[i] = false;
      });
      setUpdateFlags(flags);
      setEditedDups(
        (data.duplicates as DuplicateRow[]).map((dup) => ({
          id: dup.existing.id,
          sku: dup.sku,
          name: dup.name,
          brand: dup.brand,
          price: dup.price,
          car: dup.car,
          sectionSlug: dup.sectionSlug ?? "",
        }))
      );

      setStep("preview");
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  }, []);

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  /* Helpers to edit new items */
  const setNewField = <K extends keyof EditableNewItem>(
    idx: number,
    field: K,
    value: EditableNewItem[K]
  ) => {
    setEditedNew((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  /* Helpers to edit duplicate items */
  const toggleUpdate = (idx: number) => {
    setUpdateFlags((prev) => ({ ...prev, [idx]: !prev[idx] }));
  };

  const setDupField = <K extends keyof EditableUpdateItem>(
    idx: number,
    field: K,
    value: EditableUpdateItem[K]
  ) => {
    setEditedDups((prev) => {
      const copy = [...prev];
      copy[idx] = { ...copy[idx], [field]: value };
      return copy;
    });
  };

  const updateCount = Object.values(updateFlags).filter(Boolean).length;
  const skipCount = (preview?.duplicates.length ?? 0) - updateCount;
  const newCount = editedNew.length;

  const handleConfirm = async () => {
    if (!preview) return;
    setLoading(true);
    setError(null);
    try {
      const updateItems = editedDups
        .filter((_, i) => updateFlags[i])
        .map((d) => ({
          id: d.id,
          sku: d.sku,
          name: d.name,
          brand: d.brand,
          price: Number(d.price),
          car: d.car,
          sectionSlug: d.sectionSlug || null,
        }));

      const newItemsPayload = editedNew.map((item) => ({
        sku: item.sku,
        name: item.name,
        brand: item.brand,
        price: Number(item.price),
        car: item.car,
        sectionSlug: item.sectionSlug || null,
      }));

      const res = await fetch("/api/admin/products/import/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ newItems: newItemsPayload, updateIds: updateItems }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Ошибка импорта");
        return;
      }
      setResult(data);
      setStep("result");
    } catch {
      setError("Ошибка соединения с сервером");
    } finally {
      setLoading(false);
    }
  };

  const resetWizard = () => {
    setStep("upload");
    setPreview(null);
    setUpdateFlags({});
    setEditedNew([]);
    setEditedDups([]);
    setResult(null);
    setError(null);
    if (fileRef.current) fileRef.current.value = "";
  };

  const formatPrice = (p: number) => p.toLocaleString("ru-RU") + " \u20BD";

  /* ── Step 1: Upload ── */
  if (step === "upload") {
    return (
      <div className="max-w-2xl mx-auto mt-8">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition ${
            dragOver
              ? "border-indigo-400 bg-indigo-50/50"
              : "border-gray-300 hover:border-indigo-400 hover:bg-indigo-50/50"
          }`}
        >
          {loading ? (
            <div className="flex flex-col items-center gap-3">
              <svg
                className="animate-spin h-8 w-8 text-indigo-600"
                viewBox="0 0 24 24"
                fill="none"
              >
                <circle
                  className="opacity-25"
                  cx="12"
                  cy="12"
                  r="10"
                  stroke="currentColor"
                  strokeWidth="4"
                />
                <path
                  className="opacity-75"
                  fill="currentColor"
                  d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
                />
              </svg>
              <p className="text-sm text-gray-500">Обработка файла...</p>
            </div>
          ) : (
            <>
              <svg
                className="mx-auto h-12 w-12 text-gray-400 mb-3"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5"
                />
              </svg>
              <p className="text-sm text-gray-600">
                Перетащите файл .xlsx сюда или нажмите для выбора
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".xlsx"
            className="hidden"
            onChange={onFileChange}
          />
        </div>
        {error && (
          <div className="mt-4 rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}
      </div>
    );
  }

  /* ── Step 2: Preview ── */
  if (step === "preview" && preview) {
    return (
      <div className="space-y-6 mt-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">{error}</div>
        )}

        {/* New items — editable */}
        {editedNew.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-green-50 px-6 py-3 border-b border-green-100">
              <h3 className="text-sm font-semibold text-green-700">
                Новые товары ({editedNew.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-4 py-3">Артикул</th>
                    <th className="px-4 py-3">Наименование</th>
                    <th className="px-4 py-3">Бренд</th>
                    <th className="px-4 py-3 text-right">Цена</th>
                    <th className="px-4 py-3">Авто</th>
                    <th className="px-4 py-3">Категория</th>
                  </tr>
                </thead>
                <tbody>
                  {editedNew.map((item, i) => (
                    <tr key={i} className="border-b border-gray-100">
                      <td className="px-4 py-2 font-mono text-xs text-gray-500">{item.sku}</td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.name}
                          onChange={(e) => setNewField(i, "name", e.target.value)}
                          className="w-full min-w-[180px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.brand}
                          onChange={(e) => setNewField(i, "brand", e.target.value)}
                          className="w-full min-w-[80px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-4 py-2 text-right">
                        <input
                          type="number"
                          value={item.price}
                          onChange={(e) => setNewField(i, "price", Number(e.target.value))}
                          className="w-24 border border-gray-200 rounded px-2 py-1 text-sm text-right focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input
                          type="text"
                          value={item.car}
                          onChange={(e) => setNewField(i, "car", e.target.value)}
                          className="w-full min-w-[100px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <select
                          value={item.sectionSlug}
                          onChange={(e) => setNewField(i, "sectionSlug", e.target.value)}
                          className="w-full min-w-[160px] border border-gray-200 rounded px-2 py-1 text-sm focus:outline-none focus:ring-1 focus:ring-indigo-400 bg-white"
                        >
                          <option value="">— без категории —</option>
                          {CATALOG_SECTIONS.map((s) => (
                            <option key={s.slug} value={s.slug}>
                              {s.title}
                            </option>
                          ))}
                        </select>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Duplicates */}
        {preview.duplicates.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-amber-50 px-6 py-3 border-b border-amber-100">
              <h3 className="text-sm font-semibold text-amber-700">
                Совпадения ({preview.duplicates.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Артикул</th>
                    <th className="px-6 py-3">Текущее название / Новое</th>
                    <th className="px-6 py-3 text-right">Текущая цена / Новая</th>
                    <th className="px-6 py-3 text-center">Действие</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.duplicates.map((dup, i) => {
                    const nameChanged = dup.existing.name !== dup.name;
                    const priceChanged = dup.existing.price !== dup.price;
                    return (
                      <tr key={i} className="border-b border-gray-100">
                        <td className="px-6 py-3 font-mono text-xs">{dup.sku}</td>
                        <td className="px-6 py-3">
                          <div className="text-gray-500 text-xs line-through">
                            {dup.existing.name}
                          </div>
                          <div className={nameChanged ? "text-amber-700 font-medium" : ""}>
                            {dup.name}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-right">
                          <div className="text-gray-500 text-xs line-through">
                            {formatPrice(dup.existing.price)}
                          </div>
                          <div className={priceChanged ? "text-amber-700 font-medium" : ""}>
                            {formatPrice(dup.price)}
                          </div>
                        </td>
                        <td className="px-6 py-3 text-center">
                          <button
                            onClick={() => toggleUpdate(i)}
                            className={`text-xs font-medium px-3 py-1 rounded-full transition ${
                              updateFlags[i]
                                ? "bg-indigo-100 text-indigo-700"
                                : "bg-gray-100 text-gray-500"
                            }`}
                          >
                            {updateFlags[i] ? "Обновить" : "Пропустить"}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Rejected — read-only */}
        {preview.rejected.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <div className="bg-red-50 px-6 py-3 border-b border-red-100">
              <h3 className="text-sm font-semibold text-red-700">
                Отклонено ({preview.rejected.length})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    <th className="px-6 py-3">Артикул</th>
                    <th className="px-6 py-3">Наименование</th>
                    <th className="px-6 py-3">Бренд</th>
                    <th className="px-6 py-3 text-right">Цена</th>
                    <th className="px-6 py-3">Причина</th>
                  </tr>
                </thead>
                <tbody>
                  {preview.rejected.map((row, i) => (
                    <tr key={i} className="border-b border-gray-100 opacity-70">
                      <td className="px-6 py-3 font-mono text-xs">{row.sku}</td>
                      <td className="px-6 py-3 text-gray-500">{row.rawName}</td>
                      <td className="px-6 py-3 text-gray-500">{row.brand}</td>
                      <td className="px-6 py-3 text-right text-gray-500">
                        {formatPrice(row.price)}
                      </td>
                      <td className="px-6 py-3">
                        <span className="inline-block bg-red-100 text-red-700 text-xs font-medium px-2 py-0.5 rounded-full">
                          {REASON_LABELS[row.reason] ?? row.reason}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Summary bar */}
        <div className="bg-white rounded-xl shadow-sm p-4 flex items-center justify-between">
          <p className="text-sm text-gray-600">
            Будет добавлено:{" "}
            <span className="font-semibold text-gray-900">{newCount}</span>
            {" | "}Обновлено:{" "}
            <span className="font-semibold text-gray-900">{updateCount}</span>
            {" | "}Пропущено:{" "}
            <span className="font-semibold text-gray-900">{skipCount}</span>
            {preview.rejected.length > 0 && (
              <>
                {" | "}Отклонено:{" "}
                <span className="font-semibold text-gray-900">{preview.rejected.length}</span>
              </>
            )}
          </p>
          <div className="flex gap-3">
            <button
              onClick={resetWizard}
              className="border border-gray-300 text-gray-700 hover:bg-gray-50 px-4 py-2 rounded-lg text-sm"
            >
              Отмена
            </button>
            <button
              onClick={handleConfirm}
              disabled={loading || (newCount === 0 && updateCount === 0)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? "Импорт..." : "Импортировать"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  /* ── Step 3: Result ── */
  if (step === "result" && result) {
    const hasErrors = result.errors.length > 0;
    return (
      <div className="max-w-lg mx-auto mt-8">
        <div className="bg-white rounded-xl shadow-sm p-6 text-center">
          {hasErrors ? (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-amber-50">
              <svg
                className="h-6 w-6 text-amber-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>
          ) : (
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-green-50">
              <svg
                className="h-6 w-6 text-green-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
              </svg>
            </div>
          )}
          <p className="text-lg font-semibold text-gray-900 mb-1">Импорт завершён</p>
          <p className="text-sm text-gray-600">
            Добавлено: {result.added}, обновлено: {result.updated}, ошибок:{" "}
            {result.errors.length}
          </p>
          {hasErrors && (
            <div className="mt-4 rounded-lg bg-amber-50 p-3 text-left text-xs text-amber-700 space-y-1">
              {result.errors.map((err, i) => (
                <p key={i}>{err}</p>
              ))}
            </div>
          )}
          <Link
            href="/admin/products"
            className="mt-6 inline-block bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
          >
            К списку товаров
          </Link>
        </div>
      </div>
    );
  }

  return null;
}
