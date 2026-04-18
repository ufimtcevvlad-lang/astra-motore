"use client";

import { useRef, useState } from "react";

interface Conversation {
  id: number;
  channel: string;
  customerName: string;
  customerContact: string;
  status: string;
  lastMessage?: string;
  lastMessageSender?: string;
  lastMessageAt?: string;
  unreadCount: number;
  adminNote?: string;
}

interface ConversationListProps {
  conversations: Conversation[];
  selectedId: number | null;
  filter: "unread" | "all";
  totalUnread: number;
  onSelect: (id: number) => void;
  onFilterChange: (filter: "unread" | "all") => void;
  onSearch: (search: string) => void;
}

function formatTime(dateStr?: string): string {
  if (!dateStr) return "";
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();

  if (isToday) {
    return date.toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" });
  }

  return date.toLocaleDateString("ru-RU", { day: "numeric", month: "short" }).replace(".", "");
}

function ChannelIcon({ channel }: { channel: string }) {
  if (channel === "telegram") return <span title="Telegram">📱</span>;
  return <span title="Чат">💬</span>;
}

export default function ConversationList({
  conversations,
  selectedId,
  filter,
  totalUnread,
  onSelect,
  onFilterChange,
  onSearch,
}: ConversationListProps) {
  const [localSearch, setLocalSearch] = useState("");
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  function handleSearchChange(value: string) {
    setLocalSearch(value);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(value);
    }, 300);
  }

  return (
    <div className="flex flex-col h-full bg-white border-r border-gray-200">
      {/* Filter tabs */}
      <div className="flex border-b border-gray-200 shrink-0">
        <button
          onClick={() => onFilterChange("unread")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            filter === "unread"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Непрочитанные
          {totalUnread > 0 && (
            <span className="ml-1.5 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-xs font-bold">
              {totalUnread > 99 ? "99+" : totalUnread}
            </span>
          )}
        </button>
        <button
          onClick={() => onFilterChange("all")}
          className={`flex-1 px-4 py-3 text-sm font-medium transition-colors ${
            filter === "all"
              ? "text-indigo-600 border-b-2 border-indigo-600 bg-indigo-50"
              : "text-gray-500 hover:text-gray-700 hover:bg-gray-50"
          }`}
        >
          Все
        </button>
      </div>

      {/* Search */}
      <div className="px-3 py-2 shrink-0">
        <div className="relative">
          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input
            type="text"
            placeholder="Имя, телефон, сообщение"
            value={localSearch}
            onChange={(e) => handleSearchChange(e.target.value)}
            className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>
      </div>

      {/* List */}
      <div className="flex-1 overflow-y-auto">
        {conversations.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Нет диалогов</div>
        ) : (
          conversations.map((conv) => {
            const isSelected = conv.id === selectedId;
            const preview = conv.lastMessage
              ? conv.lastMessageSender === "admin"
                ? `Вы: ${conv.lastMessage}`
                : conv.lastMessage
              : "Нет сообщений";

            return (
              <button
                key={conv.id}
                onClick={() => onSelect(conv.id)}
                className={`w-full text-left px-3 py-3 flex items-start gap-2.5 transition-colors border-b border-gray-100 last:border-b-0 ${
                  isSelected
                    ? "bg-indigo-50 border-l-2 border-l-indigo-500"
                    : "hover:bg-gray-50"
                }`}
              >
                {/* Channel icon */}
                <span className="text-lg shrink-0 mt-0.5">
                  <ChannelIcon channel={conv.channel} />
                </span>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1 mb-0.5">
                    <span className={`text-sm font-medium truncate ${isSelected ? "text-indigo-700" : "text-gray-800"}`}>
                      {conv.customerName || conv.customerContact || `Обращение #${conv.id}`}
                    </span>
                    <span className="text-xs text-gray-400 shrink-0">
                      {formatTime(conv.lastMessageAt)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-xs text-gray-500 truncate">{preview}</span>
                    {conv.unreadCount > 0 && (
                      <span className="shrink-0 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-indigo-500 text-white text-xs font-bold">
                        {conv.unreadCount > 99 ? "99+" : conv.unreadCount}
                      </span>
                    )}
                  </div>
                  {conv.adminNote && conv.adminNote.trim() && (
                    <div
                      className="mt-1 px-2 py-1 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800 line-clamp-2"
                      title={conv.adminNote}
                    >
                      📝 {conv.adminNote}
                    </div>
                  )}
                </div>
              </button>
            );
          })
        )}
      </div>
    </div>
  );
}
