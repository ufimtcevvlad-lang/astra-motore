"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import ImageUploader from "./ImageUploader";
import SpecsEditor from "./SpecsEditor";
import AnalogsSelector from "./AnalogsSelector";
import ConfirmModal from "./ConfirmModal";
import MarketPriceWidget from "./MarketPriceWidget";
import { CANONICAL_BRANDS, canonicalizeBrand } from "@/app/lib/brand-normalize";

interface Category {
  id: number;
  title: string;
}

interface Spec {
  label: string;
  value: string;
}

interface Analog {
  analogId: number;
  name: string;
  sku: string;
  brand: string;
}

interface Product {
  id: number;
  name: string;
  sku: string;
  brand: string | null;
  car: string | null;
  price: number;
  inStock: number;
  description: string | null;
  longDescription: string | null;
  hidden?: boolean;
  categoryId: number | null;
  image: string | null;
  images: string[];
  specs: Spec[];
  analogs: Analog[];
}

interface ProductFormProps {
  product?: Product;
  categories: Category[];
}

export default function ProductForm({ product, categories }: ProductFormProps) {
  const router = useRouter();
  const isEdit = !!product;

  const [name, setName] = useState(product?.name ?? "");
  const [sku, setSku] = useState(product?.sku ?? "");
  const [brand, setBrand] = useState(canonicalizeBrand(product?.brand ?? ""));
  const [car, setCar] = useState(product?.car ?? "");
  const [price, setPrice] = useState(product?.price?.toString() ?? "");
  const [inStock, setInStock] = useState(product?.inStock?.toString() ?? "0");
  const [description, setDescription] = useState(product?.description ?? "");
  const [longDescription, setLongDescription] = useState(product?.longDescription ?? "");
  const [hidden, setHidden] = useState(!!product?.hidden);
  const [categoryId, setCategoryId] = useState(product?.categoryId?.toString() ?? "");
  const [image, setImage] = useState<string>(product?.image ?? "");
  const [images, setImages] = useState<string[]>(product?.images ?? []);
  const [specs, setSpecs] = useState<Spec[]>(product?.specs ?? []);
  const [analogs, setAnalogs] = useState<Analog[]>(product?.analogs ?? []);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [showDelete, setShowDelete] = useState(false);
  const [confirmDeleteMessage, setConfirmDeleteMessage] = useState<string | null>(null);
  const [showDuplicateConfirm, setShowDuplicateConfirm] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const mountedRef = useRef(false);
  const syncFromServerRef = useRef(false);

  // Mark dirty on any field change. First render registers initial values (clean).
  useEffect(() => {
    if (!mountedRef.current) {
      mountedRef.current = true;
      return;
    }
    if (syncFromServerRef.current) {
      syncFromServerRef.current = false;
      setDirty(false);
      return;
    }
    setDirty(true);
  }, [
    name,
    sku,
    brand,
    car,
    price,
    inStock,
    description,
    longDescription,
    hidden,
    categoryId,
    image,
    images,
    specs,
    analogs,
  ]);

  function syncSavedProduct(saved: Record<string, unknown>) {
    syncFromServerRef.current = true;
    setName(typeof saved.name === "string" ? saved.name : "");
    setSku(typeof saved.sku === "string" ? saved.sku : "");
    setBrand(canonicalizeBrand(typeof saved.brand === "string" ? saved.brand : ""));
    setCar(typeof saved.car === "string" ? saved.car : "");
    setPrice(saved.price != null ? String(saved.price) : "");
    setInStock(saved.inStock != null ? String(saved.inStock) : "0");
    setDescription(typeof saved.description === "string" ? saved.description : "");
    setLongDescription(typeof saved.longDescription === "string" ? saved.longDescription : "");
    setHidden(saved.hidden === true);
    setCategoryId(saved.categoryId != null ? String(saved.categoryId) : "");
    setImage(typeof saved.image === "string" ? saved.image : "");
    if (Array.isArray(saved.images)) {
      setImages(saved.images.filter((url): url is string => typeof url === "string"));
    } else if (typeof saved.images === "string") {
      try {
        const parsed = JSON.parse(saved.images);
        setImages(Array.isArray(parsed) ? parsed.filter((url): url is string => typeof url === "string") : []);
      } catch {
        setImages([]);
      }
    }
    setDirty(false);
    window.setTimeout(() => {
      syncFromServerRef.current = false;
    }, 100);
  }

  // Warn before leaving if unsaved
  useEffect(() => {
    if (!dirty) return;
    function onBeforeUnload(e: BeforeUnloadEvent) {
      e.preventDefault();
      e.returnValue = "";
    }
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  // Close "⋯" menu on outside click
  useEffect(() => {
    if (!menuOpen) return;
    function onClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", onClick);
    return () => document.removeEventListener("mousedown", onClick);
  }, [menuOpen]);

  async function handleSave(stayOnPage = false) {
    if (!name.trim() || !sku.trim() || !brand.trim() || !price.trim()) {
      setError("Заполните обязательные поля: Название, Артикул, Бренд, Цена");
      return;
    }

    setSaving(true);
    setError("");
    const orderedImages = images.filter((url) => typeof url === "string" && url.trim().length > 0);
    const coverImage = orderedImages[0] ?? (image || null);

    const body = {
      name: name.trim(),
      sku: sku.trim(),
      brand: brand.trim(),
      car: car.trim() || null,
      price: Number(price),
      inStock: Number(inStock) || 0,
      description: description.trim() || null,
      longDescription: longDescription.trim() || null,
      hidden,
      categoryId: categoryId ? Number(categoryId) : null,
      image: coverImage,
      images: orderedImages,
      specs,
      analogs: analogs.map((a) => a.analogId),
    };

    try {
      const url = isEdit ? `/api/admin/products/${product.id}` : "/api/admin/products";
      const method = isEdit ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        cache: "no-store",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Ошибка сохранения");
      }

      const saved = await res.json().catch(() => null);
      if (saved && typeof saved === "object") {
        syncSavedProduct(saved);
      } else {
        setDirty(false);
      }
      if (stayOnPage) {
        if (!isEdit && saved?.id) {
          router.replace(`/admin/products/${saved.id}`);
        } else {
          router.refresh();
        }
      } else {
        router.push("/admin/products");
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }

  // Ctrl/Cmd+S
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
        e.preventDefault();
        if (!saving) handleSave(true);
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [saving, name, sku, brand, car, price, inStock, description, longDescription, hidden, categoryId, image, images, specs, analogs]);

  async function handleDuplicate() {
    if (!product) return;
    setShowDuplicateConfirm(false);
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/products/${product.id}/duplicate`, { method: "POST" });
      if (!res.ok) throw new Error("Ошибка дублирования");
      const copy = await res.json();
      router.push(`/admin/products/${copy.id}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка дублирования");
      setSaving(false);
    }
  }

  async function handleDelete(force = false) {
    if (!product) return;
    setSaving(true);
    setShowDelete(false);
    setConfirmDeleteMessage(null);
    try {
      const res = await fetch(
        `/api/admin/products/${product.id}${force ? "?force=1" : ""}`,
        { method: "DELETE" }
      );
      if (res.status === 409) {
        const data = await res.json().catch(() => ({}));
        if (data.error === "product_used_in_orders") {
          setConfirmDeleteMessage(
            `${data.message}\n\nВсё равно удалить?`
          );
          setSaving(false);
          return;
        }
      }
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Ошибка удаления");
      }
      router.push("/admin/products");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Ошибка удаления товара");
      setSaving(false);
    }
  }

  const labelClass = "block text-sm font-medium text-gray-700 mb-1";
  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

  return (
    <div className="max-w-4xl">
      {/* Sticky action bar */}
      <div className="sticky top-0 z-10 bg-gray-50/95 backdrop-blur border-b border-gray-200 px-6 py-3 flex items-center gap-3">
        <button
          onClick={() => handleSave(false)}
          disabled={saving}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-50"
          title="Сохранить и вернуться в список"
        >
          {saving ? "Сохранение..." : "Сохранить"}
        </button>
        <button
          onClick={() => handleSave(true)}
          disabled={saving}
          className="border border-gray-300 bg-white text-gray-700 hover:bg-gray-50 px-3 py-2 rounded-lg text-sm disabled:opacity-50"
          title="Сохранить и остаться (Ctrl+S)"
        >
          Сохранить и остаться
        </button>
        <button
          onClick={() => {
            if (!dirty) router.push("/admin/products");
            else setShowCancelConfirm(true);
          }}
          className="text-sm text-gray-600 hover:text-gray-900"
        >
          Отмена
        </button>

        {dirty && <span className="text-xs text-amber-600">Есть несохранённые изменения</span>}

        {isEdit && (
          <div className="ml-auto relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="w-9 h-9 rounded-lg border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 text-lg leading-none"
              aria-label="Действия"
              aria-haspopup="menu"
            >
              ⋯
            </button>
            {menuOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 w-56 bg-white border border-gray-200 rounded-lg shadow-lg py-1 text-sm"
              >
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    if (dirty) setShowDuplicateConfirm(true);
                    else handleDuplicate();
                  }}
                  className="w-full text-left px-4 py-2 hover:bg-gray-50"
                >
                  Дублировать товар
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setMenuOpen(false);
                    setShowDelete(true);
                  }}
                  className="w-full text-left px-4 py-2 text-red-600 hover:bg-red-50"
                >
                  Удалить товар…
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <div className="p-6">
      {error && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700">
          {error}
        </div>
      )}

      {/* Основные данные */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Основные данные</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>
              Название <span className="text-red-500">*</span>
            </label>
            <input type="text" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Артикул <span className="text-red-500">*</span>
              </label>
              <input type="text" value={sku} onChange={(e) => setSku(e.target.value)} className={inputClass} />
            </div>
            <div>
              <label className={labelClass}>
                Бренд <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={brand}
                onChange={(e) => setBrand(e.target.value)}
                onBlur={() => setBrand((v) => canonicalizeBrand(v))}
                className={inputClass}
                list="admin-product-brand-options"
                autoComplete="off"
              />
              <datalist id="admin-product-brand-options">
                {CANONICAL_BRANDS.map((brandName) => (
                  <option key={brandName} value={brandName} />
                ))}
              </datalist>
              <p className="mt-1 text-xs text-gray-500">
                Можно выбрать из списка или ввести новый бренд. Регистр выровняется при сохранении.
              </p>
            </div>
          </div>
          <div>
            <label className={labelClass}>Автомобиль</label>
            <input type="text" value={car} onChange={(e) => setCar(e.target.value)} className={inputClass} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className={labelClass}>
                Цена <span className="text-red-500">*</span>
              </label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className={inputClass}
                min="0"
              />
            </div>
            <div>
              <label className={labelClass}>Количество на складе</label>
              <input
                type="number"
                value={inStock}
                onChange={(e) => setInStock(e.target.value)}
                className={inputClass}
                min="0"
              />
            </div>
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hidden}
              onChange={(e) => setHidden(e.target.checked)}
              className="rounded border-gray-400"
            />
            Скрыть с сайта (товар останется в админке, но не будет виден покупателям)
          </label>
        </div>
      </div>

      {/* Рыночные цены */}
      {isEdit && sku && brand && Number(price) > 0 && (
        <div className="mb-6">
          <MarketPriceWidget
            article={sku}
            brand={brand}
            yourPrice={Number(price)}
          />
        </div>
      )}

      {/* Медиа */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Медиа</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Основное изображение</label>
            <ImageUploader value={image} onChange={(v) => setImage(v as string)} />
          </div>
          <div>
            <label className={labelClass}>Галерея товара</label>
            <p className="mb-2 text-xs text-gray-500">
              Перетащите фото мышью, чтобы изменить порядок. Первое фото станет главным на сайте после сохранения.
            </p>
            <ImageUploader value={images} onChange={(v) => setImages(v as string[])} multiple />
          </div>
        </div>
      </div>

      {/* Тексты */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Тексты</h2>
        <div className="space-y-4">
          <div>
            <label className={labelClass}>Краткое описание</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>Полное описание</label>
            <textarea
              value={longDescription}
              onChange={(e) => setLongDescription(e.target.value)}
              rows={8}
              className={inputClass}
            />
          </div>
        </div>
      </div>

      {/* Категория */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Категория</h2>
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className={inputClass}
        >
          <option value="">Без категории</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.title}
            </option>
          ))}
        </select>
      </div>

      {/* Характеристики */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Характеристики</h2>
        <SpecsEditor specs={specs} onChange={setSpecs} />
      </div>

      {/* Аналоги */}
      <div className="bg-white rounded-xl shadow-sm p-6 mb-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Аналоги</h2>
        <AnalogsSelector
          analogs={analogs}
          currentProductId={product?.id}
          onChange={setAnalogs}
        />
      </div>

      </div>

      <ConfirmModal
        open={showDelete}
        title="Удаление товара"
        message={`Вы уверены, что хотите удалить товар "${name}"? Это действие нельзя отменить.`}
        confirmText="Удалить"
        onConfirm={() => handleDelete(false)}
        onCancel={() => setShowDelete(false)}
      />

      <ConfirmModal
        open={confirmDeleteMessage !== null}
        title="Товар есть в заказах"
        message={confirmDeleteMessage ?? ""}
        confirmText="Всё равно удалить"
        onConfirm={() => handleDelete(true)}
        onCancel={() => setConfirmDeleteMessage(null)}
      />

      <ConfirmModal
        open={showDuplicateConfirm}
        title="Несохранённые изменения"
        message="В форме есть несохранённые изменения — они не попадут в копию. Продолжить?"
        confirmText="Продолжить"
        onConfirm={handleDuplicate}
        onCancel={() => setShowDuplicateConfirm(false)}
      />

      <ConfirmModal
        open={showCancelConfirm}
        title="Уйти без сохранения?"
        message="Есть несохранённые изменения. Если уйдёте — они пропадут."
        confirmText="Уйти"
        onConfirm={() => router.push("/admin/products")}
        onCancel={() => setShowCancelConfirm(false)}
      />
    </div>
  );
}
