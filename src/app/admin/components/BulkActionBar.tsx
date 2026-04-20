"use client";

import { useState } from "react";
import ConfirmModal from "./ConfirmModal";

interface Category {
  id: number;
  title: string;
}

interface BulkActionBarProps {
  selectedCount: number;
  categories: Category[];
  onClear: () => void;
  onDelete: (force?: boolean) => Promise<void>;
  onSetInStock: (value: number) => Promise<void>;
  onSetCategory: (categoryId: number | null) => Promise<void>;
  onPriceDelta: (percent: number) => Promise<void>;
  onSetHidden?: (value: boolean) => Promise<void>;
}

export default function BulkActionBar({
  selectedCount,
  categories,
  onClear,
  onDelete,
  onSetInStock,
  onSetCategory,
  onPriceDelta,
  onSetHidden,
}: BulkActionBarProps) {
  const [busy, setBusy] = useState(false);
  const [menu, setMenu] = useState<"price" | "category" | null>(null);
  const [priceInput, setPriceInput] = useState("");
  const [categoryInput, setCategoryInput] = useState("");
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showForceDeleteConfirm, setShowForceDeleteConfirm] = useState<string | null>(null);
  const [showPriceConfirm, setShowPriceConfirm] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (selectedCount === 0) return null;

  async function run(fn: () => Promise<void>) {
    setBusy(true);
    setError(null);
    try {
      await fn();
      setMenu(null);
      setPriceInput("");
      setCategoryInput("");
    } catch (err) {
      const e = err as Error & { warning?: string };
      if (e.warning) {
        setShowForceDeleteConfirm(e.warning);
      } else {
        setError(e.message || "Не удалось выполнить действие");
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="sticky bottom-2 z-20 flex flex-wrap items-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 bg-gray-900 text-white rounded-lg shadow-lg mx-auto max-w-3xl">
      <span className="text-sm font-medium">Выбрано: {selectedCount}</span>
      <div className="h-5 w-px bg-gray-700 hidden sm:block" />

      <button
        disabled={busy}
        onClick={() => run(() => onSetInStock(1))}
        className="text-sm px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
        title="Поставить остаток = 1"
      >
        В наличии
      </button>
      <button
        disabled={busy}
        onClick={() => run(() => onSetInStock(0))}
        className="text-sm px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
      >
        Нет в наличии
      </button>

      <div className="relative">
        <button
          disabled={busy}
          onClick={() => setMenu(menu === "price" ? null : "price")}
          className="text-sm px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          Цена ±%
        </button>
        {menu === "price" && (
          <div className="absolute bottom-full left-0 mb-2 bg-white text-gray-900 rounded-lg shadow-xl p-3 w-56">
            <div className="text-xs text-gray-600 mb-2">Изменить на % (например +10 или −5)</div>
            <div className="flex gap-2">
              <input
                type="number"
                value={priceInput}
                onChange={(e) => setPriceInput(e.target.value)}
                className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm"
                placeholder="%"
                autoFocus
              />
              <button
                onClick={() => {
                  const n = Number(priceInput);
                  if (!Number.isFinite(n) || n === 0) return;
                  if (n < -90 || n > 500) {
                    setError("Допустимый диапазон: от −90 до +500 %");
                    return;
                  }
                  setMenu(null);
                  setShowPriceConfirm(n);
                }}
                className="px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
              >
                OK
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="relative">
        <button
          disabled={busy}
          onClick={() => setMenu(menu === "category" ? null : "category")}
          className="text-sm px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
        >
          Категория
        </button>
        {menu === "category" && (
          <div className="absolute bottom-full left-0 mb-2 bg-white text-gray-900 rounded-lg shadow-xl p-3 w-64">
            <select
              value={categoryInput}
              onChange={(e) => setCategoryInput(e.target.value)}
              className="w-full px-2 py-1 border border-gray-300 rounded text-sm mb-2"
              autoFocus
            >
              <option value="">— Без категории —</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.title}
                </option>
              ))}
            </select>
            <button
              onClick={() =>
                run(() => onSetCategory(categoryInput ? Number(categoryInput) : null))
              }
              className="w-full px-3 py-1 bg-indigo-600 text-white rounded text-sm hover:bg-indigo-700"
            >
              Применить
            </button>
          </div>
        )}
      </div>

      {onSetHidden && (
        <>
          <div className="h-5 w-px bg-gray-700 hidden sm:block" />
          <button
            disabled={busy}
            onClick={() => run(() => onSetHidden(true))}
            className="text-sm px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
            title="Скрыть с сайта"
          >
            Скрыть
          </button>
          <button
            disabled={busy}
            onClick={() => run(() => onSetHidden(false))}
            className="text-sm px-3 py-1.5 rounded hover:bg-gray-800 disabled:opacity-50"
            title="Показать на сайте"
          >
            Показать
          </button>
        </>
      )}

      <div className="h-5 w-px bg-gray-700 hidden sm:block" />
      <button
        disabled={busy}
        onClick={() => setShowDeleteConfirm(true)}
        className="text-sm px-3 py-1.5 rounded text-red-300 hover:bg-red-900/40 disabled:opacity-50"
      >
        Удалить
      </button>

      <button
        onClick={onClear}
        className="ml-auto text-sm text-gray-400 hover:text-white"
      >
        Отмена
      </button>

      {error && (
        <div
          role="alert"
          className="basis-full text-xs bg-red-900/50 border border-red-700 text-red-100 rounded px-3 py-2 mt-1"
        >
          {error}
        </div>
      )}

      <ConfirmModal
        open={showDeleteConfirm}
        title="Удалить выбранные товары?"
        message={`Будет удалено ${selectedCount} товар(ов). Действие необратимо.`}
        confirmText="Удалить"
        onConfirm={() => {
          setShowDeleteConfirm(false);
          run(() => onDelete(false));
        }}
        onCancel={() => setShowDeleteConfirm(false)}
      />
      <ConfirmModal
        open={showForceDeleteConfirm !== null}
        title="Товары есть в заказах"
        message={showForceDeleteConfirm ?? ""}
        confirmText="Всё равно удалить"
        onConfirm={() => {
          setShowForceDeleteConfirm(null);
          run(() => onDelete(true));
        }}
        onCancel={() => setShowForceDeleteConfirm(null)}
      />
      <ConfirmModal
        open={showPriceConfirm !== null}
        title="Изменить цены?"
        message={
          showPriceConfirm !== null
            ? `Будет изменена цена у ${selectedCount} товар(ов) на ${
                showPriceConfirm > 0 ? "+" : ""
              }${showPriceConfirm}%. Продолжить?`
            : ""
        }
        confirmText="Применить"
        onConfirm={() => {
          const n = showPriceConfirm;
          setShowPriceConfirm(null);
          if (n !== null) run(() => onPriceDelta(n));
        }}
        onCancel={() => setShowPriceConfirm(null)}
      />
    </div>
  );
}
