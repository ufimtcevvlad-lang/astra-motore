"use client";

import { useEffect, useRef, useState } from "react";

interface QuickReply {
  id: number;
  title: string;
  text: string;
}

interface QuickRepliesPickerProps {
  onSelect: (text: string) => void;
}

export default function QuickRepliesPicker({ onSelect }: QuickRepliesPickerProps) {
  const [replies, setReplies] = useState<QuickReply[]>([]);
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    fetch("/api/admin/quick-replies")
      .then((r) => r.json())
      .then((data) => setReplies(data.replies ?? []))
      .catch(() => {});
  }, []);

  // Close on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (replies.length === 0) return null;

  return (
    <div className="relative" ref={ref}>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        title="Быстрые ответы"
        className={`p-2 rounded-lg transition-colors ${
          open
            ? "bg-indigo-100 text-indigo-600"
            : "text-gray-400 hover:text-gray-600 hover:bg-gray-100"
        }`}
      >
        ⚡
      </button>

      {open && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 z-20 overflow-hidden">
          <div className="px-3 py-2 border-b border-gray-100 text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Быстрые ответы
          </div>
          <div className="max-h-64 overflow-y-auto">
            {replies.map((reply) => (
              <button
                key={reply.id}
                type="button"
                onClick={() => {
                  onSelect(reply.text);
                  setOpen(false);
                }}
                className="w-full text-left px-3 py-2.5 hover:bg-indigo-50 transition-colors border-b border-gray-50 last:border-b-0"
              >
                <div className="text-sm font-medium text-gray-800">{reply.title}</div>
                <div className="text-xs text-gray-500 truncate mt-0.5">{reply.text}</div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
