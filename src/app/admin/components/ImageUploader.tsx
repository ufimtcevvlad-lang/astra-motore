"use client";

import { useId, useRef, useState } from "react";

interface ImageUploaderProps {
  value: string | string[];
  onChange: (value: string | string[]) => void;
  multiple?: boolean;
}

export default function ImageUploader({ value, onChange, multiple = false }: ImageUploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const inputId = useId();
  const [uploading, setUploading] = useState(false);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [uploadError, setUploadError] = useState("");

  const urls: string[] = Array.isArray(value) ? value : value ? [value] : [];

  async function handleFiles(files: FileList | null) {
    if (!files || files.length === 0) return;
    setUploading(true);
    setUploadError("");

    try {
      const uploaded: string[] = [];
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/admin/products/upload-image", {
          method: "POST",
          body: form,
        });
        if (res.ok) {
          const data = await res.json();
          uploaded.push(data.url);
        } else {
          const data = await res.json().catch(() => ({}));
          setUploadError(data.error || `Не удалось загрузить файл ${file.name}`);
        }
      }

      if (uploaded.length === 0) return;

      if (multiple) {
        onChange([...urls, ...uploaded]);
      } else {
        onChange(uploaded[0]);
      }
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function removeImage(index: number) {
    if (multiple) {
      onChange(urls.filter((_, i) => i !== index));
    } else {
      onChange("");
    }
  }

  function moveImage(from: number, to: number) {
    if (!multiple || from === to || from < 0 || to < 0) return;
    const next = [...urls];
    const [moved] = next.splice(from, 1);
    if (!moved) return;
    next.splice(to, 0, moved);
    onChange(next);
  }

  return (
    <div>
      {/* Thumbnails */}
      {urls.length > 0 && (
        <div className="flex flex-wrap gap-3 mb-3">
          {urls.map((url, i) => (
            <div
              key={`${url}-${i}`}
              draggable={multiple}
              onDragStart={(e) => {
                if (!multiple) return;
                setDragIndex(i);
                e.dataTransfer.effectAllowed = "move";
                e.dataTransfer.setData("text/plain", String(i));
              }}
              onDragOver={(e) => {
                if (!multiple) return;
                e.preventDefault();
                e.dataTransfer.dropEffect = "move";
              }}
              onDrop={(e) => {
                if (!multiple) return;
                e.preventDefault();
                const from = dragIndex ?? Number(e.dataTransfer.getData("text/plain"));
                moveImage(from, i);
                setDragIndex(null);
              }}
              onDragEnd={() => setDragIndex(null)}
              className={[
                "relative group rounded-lg",
                multiple ? "cursor-grab active:cursor-grabbing" : "",
                dragIndex === i ? "opacity-50 ring-2 ring-indigo-500" : "",
              ].join(" ")}
              title={multiple ? "Перетащите, чтобы изменить порядок" : undefined}
            >
              <img
                src={url}
                alt=""
                className="w-20 h-20 rounded-lg object-cover border border-gray-200"
              />
              {multiple && (
                <div className="absolute left-1 top-1 rounded bg-black/70 px-1.5 py-0.5 text-[10px] font-medium text-white">
                  {i === 0 ? "Главное" : i + 1}
                </div>
              )}
              {multiple && urls.length > 1 && (
                <div className="absolute bottom-1 left-1 flex gap-1 opacity-0 transition group-hover:opacity-100">
                  <button
                    type="button"
                    onClick={() => moveImage(i, i - 1)}
                    disabled={i === 0}
                    className="flex h-6 w-6 items-center justify-center rounded bg-white/95 text-xs font-semibold text-gray-700 shadow disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Переместить фото левее"
                    title="Переместить левее"
                  >
                    ←
                  </button>
                  <button
                    type="button"
                    onClick={() => moveImage(i, i + 1)}
                    disabled={i === urls.length - 1}
                    className="flex h-6 w-6 items-center justify-center rounded bg-white/95 text-xs font-semibold text-gray-700 shadow disabled:cursor-not-allowed disabled:opacity-40"
                    aria-label="Переместить фото правее"
                    title="Переместить правее"
                  >
                    →
                  </button>
                </div>
              )}
              <button
                type="button"
                onClick={() => removeImage(i)}
                className="absolute -top-2 -right-2 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition"
              >
                &times;
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Drop zone */}
      <label
        htmlFor={inputId}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
        }}
        onDrop={(e) => {
          e.preventDefault();
          e.stopPropagation();
          handleFiles(e.dataTransfer.files);
        }}
        className="block border-2 border-dashed border-gray-300 rounded-lg p-6 text-center cursor-pointer hover:border-indigo-400 hover:bg-indigo-50/50 transition"
      >
        {uploading ? (
          <div className="text-sm text-indigo-600">Загрузка...</div>
        ) : (
          <div className="space-y-2">
            <div className="text-sm text-gray-500">
              Перетащите {multiple ? "изображения" : "изображение"} сюда
            </div>
            <span className="inline-flex items-center rounded-md bg-indigo-600 px-3 py-2 text-sm font-medium text-white shadow-sm">
              Выбрать фото с компьютера
            </span>
            <div className="text-xs text-gray-400">
              JPG, PNG, WebP, HEIC до 20 МБ. Сайт сожмёт в WebP автоматически.
            </div>
          </div>
        )}
        <input
          id={inputId}
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/heic,image/heif,.jpg,.jpeg,.png,.webp,.heic,.heif"
          multiple={multiple}
          onChange={(e) => handleFiles(e.target.files)}
          className="hidden"
        />
      </label>
      {uploadError && <div className="mt-2 text-sm text-red-600">{uploadError}</div>}
      {urls.length > 0 && (
        <div className="mt-2 text-xs text-amber-700">
          Фото загружено. Чтобы оно появилось на сайте, нажмите «Сохранить изменения».
        </div>
      )}
    </div>
  );
}
