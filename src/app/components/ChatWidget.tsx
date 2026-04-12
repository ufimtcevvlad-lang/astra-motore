"use client";

import { useCallback, useEffect, useRef, useState } from "react";

interface Attachment {
  url: string;
  name: string;
  type: string;
}

interface Message {
  id: number;
  sender: "customer" | "admin";
  text: string | null;
  attachments: Attachment[];
  createdAt: string;
}

const STORAGE_KEY_OPEN = "chat_widget_open";

export default function ChatWidget() {
  const [mounted, setMounted] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [conversationId, setConversationId] = useState<number | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputText, setInputText] = useState("");
  const [sending, setSending] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [attachFile, setAttachFile] = useState<File | null>(null);
  const lastMsgId = useRef<number>(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Don't render on admin paths
  useEffect(() => {
    if (window.location.pathname.startsWith("/admin")) return;
    setMounted(true);

    // Restore open state
    try {
      const saved = localStorage.getItem(STORAGE_KEY_OPEN);
      if (saved === "1") setIsOpen(true);
    } catch {}

    // Try to resume existing conversation
    fetch("/api/chat/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({}),
    })
      .then((r) => r.json())
      .then((data) => {
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      })
      .catch(() => {});
  }, []);

  const fetchMessages = useCallback(async (convId: number) => {
    try {
      const url = `/api/chat/messages?conversationId=${convId}${
        lastMsgId.current > 0 ? `&after=${lastMsgId.current}` : ""
      }`;
      const res = await fetch(url);
      if (!res.ok) return;
      const data = await res.json();
      const newMsgs: Message[] = data.messages ?? [];
      if (newMsgs.length > 0) {
        setMessages((prev) => {
          const existingIds = new Set(prev.map((m) => m.id));
          const fresh = newMsgs.filter((m) => !existingIds.has(m.id));
          if (fresh.length === 0) return prev;
          lastMsgId.current = Math.max(...fresh.map((m) => m.id), lastMsgId.current);
          return [...prev, ...fresh];
        });
      }
    } catch {}
  }, []);

  // Initial load when conversation known
  useEffect(() => {
    if (!conversationId) return;
    lastMsgId.current = 0;
    fetch(`/api/chat/messages?conversationId=${conversationId}`)
      .then((r) => r.json())
      .then((data) => {
        const msgs: Message[] = data.messages ?? [];
        setMessages(msgs);
        if (msgs.length > 0) {
          lastMsgId.current = Math.max(...msgs.map((m) => m.id));
        }
      })
      .catch(() => {});
  }, [conversationId]);

  // Polling when open
  useEffect(() => {
    if (!isOpen || !conversationId) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      return;
    }
    pollingRef.current = setInterval(() => fetchMessages(conversationId), 3000);
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isOpen, conversationId, fetchMessages]);

  // Count unread admin messages when closed
  useEffect(() => {
    if (isOpen) {
      setUnreadCount(0);
      return;
    }
    const adminMsgs = messages.filter((m) => m.sender === "admin");
    setUnreadCount(adminMsgs.length);
  }, [messages, isOpen]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Auto-create conversation when opening chat for first time
  async function ensureConversation() {
    if (conversationId) return;
    try {
      const res = await fetch("/api/chat/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({}),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.conversationId) {
          setConversationId(data.conversationId);
        }
      }
    } catch {}
  }

  function toggleOpen() {
    setIsOpen((v) => {
      const next = !v;
      try {
        localStorage.setItem(STORAGE_KEY_OPEN, next ? "1" : "0");
      } catch {}
      if (next) {
        setUnreadCount(0);
        // Start conversation if not yet started
        ensureConversation();
      }
      return next;
    });
  }

  async function handleSend() {
    if ((!inputText.trim() && !attachFile) || !conversationId) return;
    setSending(true);
    try {
      let attachments: Attachment[] = [];

      if (attachFile) {
        const formData = new FormData();
        formData.append("file", attachFile);
        const res = await fetch("/api/chat/upload", { method: "POST", body: formData });
        if (res.ok) {
          const data = await res.json();
          attachments = [{ url: data.url, name: attachFile.name, type: attachFile.type }];
        }
        setAttachFile(null);
      }

      const res = await fetch("/api/chat/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          text: inputText.trim() || null,
          attachments,
        }),
      });
      if (res.ok) {
        setInputText("");
        await fetchMessages(conversationId);
      }
    } catch {
    } finally {
      setSending(false);
      textareaRef.current?.focus();
    }
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  if (!mounted) return null;

  return (
    <>
      {/* Chat window */}
      {isOpen && (
        <div
          className="fixed bottom-24 right-6 z-50 flex flex-col"
          style={{ width: 350, height: 500 }}
        >
          <div className="flex flex-col h-full bg-white rounded-2xl shadow-2xl overflow-hidden border border-gray-200">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 bg-indigo-600 shrink-0">
              <div>
                <p className="text-sm font-semibold text-white">Astra Motors</p>
                <p className="text-xs text-indigo-200">Онлайн</p>
              </div>
              <button
                type="button"
                onClick={toggleOpen}
                className="text-white/70 hover:text-white transition-colors"
                aria-label="Закрыть чат"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Body */}
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-4 py-3 space-y-3">
                  {messages.length === 0 && (
                    <p className="text-xs text-gray-400 text-center py-8">
                      Напишите ваш вопрос — мы ответим как можно скорее.
                    </p>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`flex ${msg.sender === "customer" ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-xl px-3 py-2 text-sm ${
                          msg.sender === "customer"
                            ? "bg-indigo-600 text-white rounded-br-sm"
                            : "bg-gray-100 text-gray-800 rounded-bl-sm"
                        }`}
                      >
                        {msg.text && <p className="whitespace-pre-wrap break-words">{msg.text}</p>}
                        {msg.attachments?.map((att, i) => (
                          <div key={i} className="mt-1">
                            {att.type.startsWith("image/") ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={att.url}
                                alt={att.name}
                                className="max-w-full rounded-lg mt-1"
                              />
                            ) : (
                              <a
                                href={att.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className={`underline text-xs ${
                                  msg.sender === "customer" ? "text-indigo-200" : "text-indigo-600"
                                }`}
                              >
                                {att.name}
                              </a>
                            )}
                          </div>
                        ))}
                        <p
                          className={`text-[10px] mt-1 ${
                            msg.sender === "customer" ? "text-indigo-200" : "text-gray-400"
                          }`}
                        >
                          {new Date(msg.createdAt).toLocaleTimeString("ru-RU", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </p>
                      </div>
                    </div>
                  ))}
                  <div ref={messagesEndRef} />
                </div>

                {/* Attach preview */}
                {attachFile && (
                  <div className="px-4 py-1.5 bg-indigo-50 border-t border-indigo-100 flex items-center gap-2 text-xs text-indigo-700 shrink-0">
                    <span className="truncate flex-1">{attachFile.name}</span>
                    <button
                      type="button"
                      onClick={() => setAttachFile(null)}
                      className="text-indigo-400 hover:text-indigo-700"
                    >
                      ✕
                    </button>
                  </div>
                )}

                {/* Input */}
                <div className="px-3 py-3 border-t border-gray-100 flex items-end gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="text-gray-400 hover:text-indigo-600 transition-colors mb-1 shrink-0"
                    aria-label="Прикрепить файл"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l9.19-9.19a4 4 0 0 1 5.66 5.66l-9.2 9.19a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                  </button>
                  <input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    onChange={(e) => setAttachFile(e.target.files?.[0] ?? null)}
                  />
                  <textarea
                    ref={textareaRef}
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Написать сообщение..."
                    rows={1}
                    className="flex-1 resize-none border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent max-h-24 overflow-y-auto"
                    style={{ lineHeight: "1.4" }}
                  />
                  <button
                    type="button"
                    onClick={handleSend}
                    disabled={sending || (!inputText.trim() && !attachFile)}
                    className="mb-1 w-8 h-8 flex items-center justify-center bg-indigo-600 text-white rounded-full hover:bg-indigo-700 disabled:opacity-40 transition-colors shrink-0"
                    aria-label="Отправить"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="22" y1="2" x2="11" y2="13" />
                      <polygon points="22 2 15 22 11 13 2 9 22 2" />
                    </svg>
                  </button>
                </div>
              </>
          </div>
        </div>
      )}

      {/* Floating bubble */}
      <button
        type="button"
        onClick={toggleOpen}
        className="fixed bottom-6 right-6 z-50 w-14 h-14 bg-indigo-600 rounded-full shadow-lg hover:bg-indigo-700 transition-colors flex items-center justify-center"
        aria-label="Открыть чат"
      >
        {isOpen ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        ) : (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
          </svg>
        )}
        {/* Unread badge */}
        {!isOpen && unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[20px] h-5 bg-red-500 text-white text-[11px] font-bold rounded-full flex items-center justify-center px-1">
            {unreadCount > 99 ? "99+" : unreadCount}
          </span>
        )}
      </button>
    </>
  );
}
