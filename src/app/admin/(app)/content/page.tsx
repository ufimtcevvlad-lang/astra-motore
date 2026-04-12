"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";

interface Banner {
  id: number;
  title: string;
  text: string;
  link: string;
  image: string;
  isActive: boolean;
  sortOrder: number;
  createdAt: string;
}

export default function ContentBannersPage() {
  const [banners, setBanners] = useState<Banner[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editBanner, setEditBanner] = useState<Banner | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<number | null>(null);

  // Form state
  const [formTitle, setFormTitle] = useState("");
  const [formText, setFormText] = useState("");
  const [formLink, setFormLink] = useState("");
  const [formActive, setFormActive] = useState(true);
  const [formImage, setFormImage] = useState<File | null>(null);
  const [formImagePreview, setFormImagePreview] = useState<string | null>(null);

  // Drag state
  const dragItem = useRef<number | null>(null);
  const dragOverItem = useRef<number | null>(null);

  const fetchBanners = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/banners");
      const data = await res.json();
      setBanners(data.banners || []);
    } catch {
      console.error("Ошибка загрузки баннеров");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBanners();
  }, [fetchBanners]);

  const openCreate = useCallback(() => {
    setEditBanner(null);
    setFormTitle("");
    setFormText("");
    setFormLink("");
    setFormActive(true);
    setFormImage(null);
    setFormImagePreview(null);
    setModalOpen(true);
  }, []);

  const openEdit = useCallback((banner: Banner) => {
    setEditBanner(banner);
    setFormTitle(banner.title);
    setFormText(banner.text);
    setFormLink(banner.link);
    setFormActive(banner.isActive);
    setFormImage(null);
    setFormImagePreview(banner.image || null);
    setModalOpen(true);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!formTitle.trim()) return;
    setSaving(true);

    const fd = new FormData();
    fd.append("title", formTitle);
    fd.append("text", formText);
    fd.append("link", formLink);
    fd.append("isActive", String(formActive));
    if (formImage) fd.append("image", formImage);

    try {
      const url = editBanner
        ? `/api/admin/banners/${editBanner.id}`
        : "/api/admin/banners";
      const method = editBanner ? "PUT" : "POST";

      await fetch(url, { method, body: fd });
      setModalOpen(false);
      fetchBanners();
    } catch {
      console.error("Ошибка сохранения");
    } finally {
      setSaving(false);
    }
  }, [formTitle, formText, formLink, formActive, formImage, editBanner, fetchBanners]);

  const handleToggle = useCallback(async (id: number) => {
    await fetch(`/api/admin/banners/${id}/toggle`, { method: "PATCH" });
    fetchBanners();
  }, [fetchBanners]);

  const handleDelete = useCallback(async (id: number) => {
    await fetch(`/api/admin/banners/${id}`, { method: "DELETE" });
    setDeleteConfirm(null);
    fetchBanners();
  }, [fetchBanners]);

  const handleImageSelect = useCallback((file: File) => {
    setFormImage(file);
    const reader = new FileReader();
    reader.onload = (e) => setFormImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }, []);

  // Drag & Drop handlers
  const handleDragStart = useCallback((index: number) => {
    dragItem.current = index;
  }, []);

  const handleDragEnter = useCallback((index: number) => {
    dragOverItem.current = index;
  }, []);

  const handleDragEnd = useCallback(async () => {
    if (dragItem.current === null || dragOverItem.current === null) return;
    if (dragItem.current === dragOverItem.current) return;

    const items = [...banners];
    const draggedItem = items[dragItem.current];
    items.splice(dragItem.current, 1);
    items.splice(dragOverItem.current, 0, draggedItem);

    setBanners(items);
    dragItem.current = null;
    dragOverItem.current = null;

    const ids = items.map((b) => b.id);
    await fetch("/api/admin/banners/reorder", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids }),
    });
  }, [banners]);

  return (
    <>
      <AdminHeader title="Контент — Баннеры">
        <button
          onClick={openCreate}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg text-sm transition-colors"
        >
          + Добавить баннер
        </button>
      </AdminHeader>

      <div className="p-6">
        {loading ? (
          <div className="text-center text-gray-400 py-12">Загрузка...</div>
        ) : banners.length === 0 ? (
          <div className="text-center py-16">
            <div className="text-5xl mb-4">🖼</div>
            <h3 className="text-lg font-medium text-gray-700 mb-2">Баннеров пока нет</h3>
            <p className="text-sm text-gray-400 mb-6 max-w-sm mx-auto">
              Баннеры показываются на главной странице сайта. Добавьте первый баннер с акцией или новинками.
            </p>
            <button
              onClick={openCreate}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-lg text-sm font-medium transition-colors"
            >
              + Добавить первый баннер
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {banners.map((banner, index) => (
              <div
                key={banner.id}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragEnter={() => handleDragEnter(index)}
                onDragEnd={handleDragEnd}
                onDragOver={(e) => e.preventDefault()}
                className={`bg-white rounded-xl shadow-sm border border-gray-200 p-4 flex items-center gap-4 transition-opacity ${
                  !banner.isActive ? "opacity-50" : ""
                }`}
              >
                {/* Drag handle */}
                <div className="cursor-grab text-gray-400 hover:text-gray-600 select-none text-lg leading-none">
                  ⋮⋮
                </div>

                {/* Image preview */}
                <div className="w-40 h-20 rounded-lg overflow-hidden bg-gray-100 flex-shrink-0">
                  {banner.image ? (
                    <img
                      src={banner.image}
                      alt={banner.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-300 text-xs">
                      Нет фото
                    </div>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-gray-900 text-sm truncate">
                      {banner.title}
                    </span>
                    <span
                      className={`text-xs px-2 py-0.5 rounded-full ${
                        banner.isActive
                          ? "bg-green-100 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {banner.isActive ? "Активен" : "Выключен"}
                    </span>
                  </div>
                  {banner.text && (
                    <p className="text-xs text-gray-500 truncate">{banner.text}</p>
                  )}
                  {banner.link && (
                    <p className="text-xs text-indigo-500 truncate">{banner.link}</p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  <button
                    onClick={() => openEdit(banner)}
                    className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                    title="Редактировать"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                  </button>
                  <button
                    onClick={() => handleToggle(banner.id)}
                    className="p-2 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition-colors"
                    title={banner.isActive ? "Выключить" : "Включить"}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      {banner.isActive ? (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                      ) : (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                      )}
                      {banner.isActive && (
                        <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      )}
                    </svg>
                  </button>
                  {deleteConfirm === banner.id ? (
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleDelete(banner.id)}
                        className="px-2 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700 transition-colors"
                      >
                        Да
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(null)}
                        className="px-2 py-1 text-xs bg-gray-200 text-gray-700 rounded hover:bg-gray-300 transition-colors"
                      >
                        Нет
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setDeleteConfirm(banner.id)}
                      className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Удалить"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setModalOpen(false)}
          />
          <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-lg mx-4 p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              {editBanner ? "Редактировать баннер" : "Новый баннер"}
            </h2>

            <div className="space-y-4">
              {/* Title */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Заголовок *
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="Название баннера"
                />
              </div>

              {/* Text */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Текст
                </label>
                <textarea
                  value={formText}
                  onChange={(e) => setFormText(e.target.value)}
                  rows={2}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
                  placeholder="Описание или подзаголовок"
                />
              </div>

              {/* Link */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Ссылка
                </label>
                <input
                  type="text"
                  value={formLink}
                  onChange={(e) => setFormLink(e.target.value)}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  placeholder="/catalog или https://..."
                />
              </div>

              {/* Image upload */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Изображение
                </label>
                <div
                  className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center cursor-pointer hover:border-indigo-400 transition-colors relative"
                  onClick={() =>
                    document.getElementById("banner-image-input")?.click()
                  }
                  onDragOver={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                  }}
                  onDrop={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    const file = e.dataTransfer.files[0];
                    if (file) handleImageSelect(file);
                  }}
                >
                  {formImagePreview ? (
                    <div className="relative">
                      <img
                        src={formImagePreview}
                        alt="Preview"
                        className="max-h-32 mx-auto rounded-lg object-contain"
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setFormImage(null);
                          setFormImagePreview(null);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-xs hover:bg-red-600"
                      >
                        &times;
                      </button>
                    </div>
                  ) : (
                    <div className="py-4">
                      <svg
                        className="w-8 h-8 mx-auto text-gray-300 mb-2"
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                        strokeWidth={1.5}
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                      </svg>
                      <p className="text-sm text-gray-500">
                        Перетащите изображение или нажмите для загрузки
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        Рекомендуемый размер: 1200&times;400 px
                      </p>
                    </div>
                  )}
                  <input
                    id="banner-image-input"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) handleImageSelect(file);
                    }}
                  />
                </div>
              </div>

              {/* Active toggle */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-gray-700">Активен</span>
                <button
                  type="button"
                  onClick={() => setFormActive(!formActive)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    formActive ? "bg-indigo-600" : "bg-gray-300"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      formActive ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Modal actions */}
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setModalOpen(false)}
                className="px-4 py-2 text-sm text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
              >
                Отмена
              </button>
              <button
                onClick={handleSubmit}
                disabled={saving || !formTitle.trim()}
                className="px-4 py-2 text-sm text-white bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg transition-colors"
              >
                {saving ? "Сохранение..." : editBanner ? "Сохранить" : "Создать"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
