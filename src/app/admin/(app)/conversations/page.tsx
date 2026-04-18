"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import AdminHeader from "@/app/admin/components/AdminHeader";
import ConversationList from "@/app/admin/components/ConversationList";
import ConversationChat from "@/app/admin/components/ConversationChat";
import ConversationInfo from "@/app/admin/components/ConversationInfo";

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

export default function ConversationsPage() {
  const searchParams = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"unread" | "all">("all");
  const [search, setSearch] = useState("");
  const [totalUnread, setTotalUnread] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const initialOpenApplied = useRef(false);

  const fetchConversations = useCallback(async () => {
    const params = new URLSearchParams();
    if (filter === "unread") params.set("unread", "1");
    if (search) params.set("search", search);

    try {
      const res = await fetch(`/api/admin/conversations?${params}`);
      const data = await res.json();
      setConversations(data.conversations ?? []);
      setTotalUnread(data.totalUnread ?? 0);
    } catch {
      // ignore
    }
  }, [filter, search]);

  useEffect(() => {
    fetchConversations();
  }, [fetchConversations]);

  // Polling every 7s
  useEffect(() => {
    intervalRef.current = setInterval(fetchConversations, 7000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [fetchConversations]);

  // Auto-select from URL param ?open=ID (only once)
  useEffect(() => {
    if (initialOpenApplied.current) return;
    const openId = searchParams.get("open");
    if (openId) {
      const id = Number(openId);
      if (!isNaN(id)) {
        setSelectedId(id);
        initialOpenApplied.current = true;
      }
    }
  }, [searchParams]);

  function handleFilterChange(newFilter: "unread" | "all") {
    setFilter(newFilter);
    setSelectedId(null);
  }

  function handleSearch(newSearch: string) {
    setSearch(newSearch);
  }

  function handleSelect(id: number) {
    setSelectedId(id);
    // optimistically clear unread badge for selected conversation
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, unreadCount: 0 } : c))
    );
  }

  return (
    <div className="flex flex-col" style={{ height: "calc(100vh - 64px)" }}>
      <AdminHeader title="Чат и заявки" />

      <div className="flex flex-1 min-h-0">
        {/* Left panel — conversation list: full width on mobile (hidden when chat open), fixed 320px on md+ */}
        <div className={`${selectedId ? "hidden md:flex" : "flex"} w-full md:w-80 shrink-0 flex-col`}>
          <ConversationList
            conversations={conversations}
            selectedId={selectedId}
            filter={filter}
            totalUnread={totalUnread}
            onSelect={handleSelect}
            onFilterChange={handleFilterChange}
            onSearch={handleSearch}
          />
        </div>

        {/* Center panel — chat */}
        <div className={`${selectedId ? "flex" : "hidden md:flex"} flex-1 min-w-0 flex-col bg-gray-50`}>
          {selectedId ? (
            <>
              {/* Back button on mobile */}
              <button
                onClick={() => setSelectedId(null)}
                className="md:hidden px-3 py-2 text-sm text-indigo-600 hover:bg-gray-100 text-left border-b border-gray-200 bg-white"
              >
                ← К списку
              </button>
              <ConversationChat
                key={selectedId}
                conversationId={selectedId}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 text-sm">
              Выберите диалог
            </div>
          )}
        </div>

        {/* Right panel — info (only when conversation selected, hidden on < lg) */}
        {selectedId && (
          <div className="hidden lg:block w-72 shrink-0 border-l border-gray-200">
            <ConversationInfo key={selectedId} conversationId={selectedId} />
          </div>
        )}
      </div>
    </div>
  );
}
