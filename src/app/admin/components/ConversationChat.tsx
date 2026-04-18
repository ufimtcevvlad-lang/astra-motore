"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import QuickRepliesPicker from "./QuickRepliesPicker";

interface Attachment {
  url: string;
  name: string;
  type: string;
  size: number;
}

interface Message {
  id: number;
  sender: "customer" | "admin" | "system";
  adminId?: number | null;
  text: string;
  attachments: Attachment[];
  isInternalNote: boolean;
  createdAt: string;
}

interface ConversationChatProps {
  conversationId: number;
}

function formatMsgTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  if (isToday) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }
  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }).replace(".", "");
}

function AttachmentView({ att }: { att: Attachment }) {
  const isImage = att.type.startsWith("image/");
  if (isImage) {
    return (
      <a href={att.url} target="_blank" rel="noopener noreferrer">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={att.url} alt={att.name} className="max-w-48 rounded-lg mt-1 border border-gray-200" />
      </a>
    );
  }
  return (
    <a
      href={att.url}
      download={att.name}
      className="flex items-center gap-1.5 text-sm text-indigo-600 hover:underline mt-1"
    >
      <span>📎</span>
      <span className="truncate max-w-48">{att.name}</span>
    </a>
  );
}

export default function ConversationChat({ conversationId }: ConversationChatProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const fetchMessages = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}`);
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [conversationId]);

  // Mark as read on mount
  useEffect(() => {
    fetch(`/api/admin/conversations/${conversationId}/read`, { method: "PUT" }).catch(() => {});
  }, [conversationId]);

  useEffect(() => {
    setLoading(true);
    setMessages([]);
    fetchMessages();
  }, [fetchMessages]);

  // Polling every 7s
  useEffect(() => {
    intervalRef.current = setInterval(fetchMessages, 7000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchMessages]);

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function sendMessage(attachments?: Attachment[]) {
    const trimmed = text.trim();
    if (!trimmed && !attachments?.length) return;
    setSending(true);
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}/send`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: trimmed,
          attachments: attachments ?? [],
          isInternalNote: false,
        }),
      });
      if (!res.ok) throw new Error();
      setText("");
      await fetchMessages();
    } catch {
      alert("Не удалось отправить сообщение. Проверьте соединение и попробуйте снова.");
    } finally {
      setSending(false);
    }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.append("file", file);
    formData.append("conversationId", String(conversationId));
    try {
      const res = await fetch("/api/admin/conversations/upload", {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (data.url) {
        await sendMessage([{ url: data.url, name: file.name, type: file.type, size: file.size }]);
      }
    } catch {
      alert("Не удалось загрузить файл.");
    }
    e.target.value = "";
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages area */}
      <div className="flex-1 overflow-y-auto px-4 py-4 space-y-3">
        {loading ? (
          <div className="text-center py-12 text-gray-400 text-sm">Загрузка...</div>
        ) : messages.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Нет сообщений</div>
        ) : (
          messages.map((msg) => {
            const isAdmin = msg.sender === "admin";
            const isSystem = msg.sender === "system";

            if (isSystem) {
              return (
                <div key={msg.id} className="flex justify-center">
                  <span className="text-xs text-gray-400 bg-gray-100 px-3 py-1 rounded-full">{msg.text}</span>
                </div>
              );
            }

            if (msg.isInternalNote) {
              return (
                <div key={msg.id} className="flex justify-end">
                  <div className="max-w-[70%]">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-xl px-3 py-2">
                      <div className="flex items-center gap-1 mb-1">
                        <span className="text-xs font-semibold text-yellow-700">📝 Заметка</span>
                        <span className="text-xs text-yellow-500 ml-auto">{formatMsgTime(msg.createdAt)}</span>
                      </div>
                      <p className="text-sm text-yellow-900 whitespace-pre-wrap">{msg.text}</p>
                      {msg.attachments.map((att, i) => <AttachmentView key={i} att={att} />)}
                    </div>
                  </div>
                </div>
              );
            }

            return (
              <div key={msg.id} className={`flex ${isAdmin ? "justify-end" : "justify-start"}`}>
                <div className={`max-w-[70%] ${isAdmin ? "" : ""}`}>
                  <div
                    className={`rounded-xl px-3 py-2 ${
                      isAdmin
                        ? "bg-indigo-500 text-white"
                        : "bg-white border border-gray-200 text-gray-800"
                    }`}
                  >
                    <p className="text-sm whitespace-pre-wrap">{msg.text}</p>
                    {msg.attachments.map((att, i) => <AttachmentView key={i} att={att} />)}
                  </div>
                  <div className={`text-xs text-gray-400 mt-0.5 ${isAdmin ? "text-right" : "text-left"}`}>
                    {formatMsgTime(msg.createdAt)}
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input area */}
      <div className="shrink-0 border-t border-gray-200 bg-white px-3 py-2">
        <div className="flex items-end gap-2">
          {/* Quick replies */}
          <QuickRepliesPicker onSelect={(t) => { setText((prev) => prev + t); textareaRef.current?.focus(); }} />

          {/* File attach */}
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Прикрепить файл"
            className="p-2 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors"
          >
            📎
          </button>
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={handleFileChange}
          />

          {/* Textarea */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Сообщение... (Enter — отправить, Shift+Enter — новая строка)"
            rows={1}
            className="flex-1 resize-none rounded-lg px-3 py-2 text-sm border border-gray-200 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 max-h-32"
            style={{ minHeight: "38px" }}
          />

          {/* Send */}
          <button
            type="button"
            onClick={() => sendMessage()}
            disabled={sending || !text.trim()}
            className="px-4 py-2 rounded-lg bg-indigo-500 text-white text-sm font-medium hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center gap-1.5"
          >
            {sending ? (
              <span className="inline-block w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                <span className="hidden sm:inline">Отправить</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
