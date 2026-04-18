"use client";

import { useCallback, useEffect, useState } from "react";

interface Admin {
  id: number;
  name: string;
}

interface ConversationDetail {
  id: number;
  channel: string;
  customerName: string;
  customerContact: string;
  status: string;
  createdAt: string;
  assignedAdminId?: number | null;
  adminNote?: string;
}

interface ConversationInfoProps {
  conversationId: number;
}

function channelLabel(channel: string): string {
  if (channel === "telegram") return "Telegram";
  return "Чат на сайте";
}

export default function ConversationInfo({ conversationId }: ConversationInfoProps) {
  const [conversation, setConversation] = useState<ConversationDetail | null>(null);
  const [admins, setAdmins] = useState<Admin[]>([]);
  const [assignedId, setAssignedId] = useState<number | null>(null);
  const [assigning, setAssigning] = useState(false);
  const [note, setNote] = useState("");
  const [noteInitial, setNoteInitial] = useState("");
  const [savingNote, setSavingNote] = useState(false);
  const [noteSaved, setNoteSaved] = useState(false);

  const fetchDetail = useCallback(async () => {
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}`);
      const data = await res.json();
      setConversation(data.conversation ?? null);
      setAdmins(data.admins ?? []);
      setAssignedId(data.assignedAdmin?.id ?? null);
      const n = data.conversation?.adminNote ?? "";
      setNote(n);
      setNoteInitial(n);
    } catch {
      // ignore
    }
  }, [conversationId]);

  useEffect(() => {
    fetchDetail();
  }, [fetchDetail]);

  async function handleSaveNote() {
    if (note === noteInitial) return;
    setSavingNote(true);
    setNoteSaved(false);
    try {
      const res = await fetch(`/api/admin/conversations/${conversationId}/note`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note }),
      });
      if (res.ok) {
        setNoteInitial(note);
        setNoteSaved(true);
        setTimeout(() => setNoteSaved(false), 1500);
      } else {
        alert("Не удалось сохранить заметку");
      }
    } catch {
      alert("Не удалось сохранить заметку");
    } finally {
      setSavingNote(false);
    }
  }

  async function handleAssign(adminId: number | null) {
    setAssigning(true);
    try {
      await fetch(`/api/admin/conversations/${conversationId}/assign`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminId }),
      });
      setAssignedId(adminId);
    } catch {
      // ignore
    } finally {
      setAssigning(false);
    }
  }

  if (!conversation) {
    return (
      <div className="h-full bg-white flex items-center justify-center">
        <span className="text-sm text-gray-400">Загрузка...</span>
      </div>
    );
  }

  const createdDate = new Date(conversation.createdAt).toLocaleDateString("ru-RU", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });

  return (
    <div className="h-full bg-white overflow-y-auto">
      <div className="px-4 py-4 border-b border-gray-200">
        <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Информация</h3>
      </div>

      <div className="px-4 py-4 space-y-4">
        {/* Customer info */}
        <div>
          <div className="text-xs text-gray-400 mb-1">Клиент</div>
          <div className="text-sm font-medium text-gray-800">{conversation.customerName || conversation.customerContact || `Обращение #${conversation.id}`}</div>
        </div>

        {conversation.customerContact && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Контакт</div>
            <div className="text-sm text-gray-700 break-all">{conversation.customerContact}</div>
          </div>
        )}

        <div>
          <div className="text-xs text-gray-400 mb-1">Канал</div>
          <div className="flex items-center gap-1.5 text-sm text-gray-700">
            <span>{conversation.channel === "telegram" ? "📱" : "💬"}</span>
            <span>{channelLabel(conversation.channel)}</span>
          </div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1">Создан</div>
          <div className="text-sm text-gray-700">{createdDate}</div>
        </div>

        <div>
          <div className="text-xs text-gray-400 mb-1">Статус</div>
          <div className="text-sm text-gray-700 capitalize">{conversation.status}</div>
        </div>

        {/* Admin note */}
        <div>
          <div className="text-xs text-gray-400 mb-1 flex items-center justify-between">
            <span>Заметка (видно только админам)</span>
            {noteSaved && <span className="text-green-600">Сохранено</span>}
          </div>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onBlur={handleSaveNote}
            placeholder="Напишите заметку о клиенте, машине или пожеланиях..."
            rows={4}
            className="w-full border border-yellow-200 bg-yellow-50 rounded-lg px-2 py-1.5 text-sm text-gray-800 focus:outline-none focus:ring-2 focus:ring-yellow-400 resize-none"
          />
          <div className="flex justify-end mt-1">
            <button
              type="button"
              onClick={handleSaveNote}
              disabled={savingNote || note === noteInitial}
              className="text-xs text-indigo-600 hover:text-indigo-800 disabled:text-gray-300 disabled:cursor-not-allowed"
            >
              {savingNote ? "Сохранение..." : "Сохранить"}
            </button>
          </div>
        </div>

        {/* Assignment */}
        {admins.length > 0 && (
          <div>
            <div className="text-xs text-gray-400 mb-1">Назначен</div>
            <select
              value={assignedId ?? ""}
              onChange={(e) => handleAssign(e.target.value ? Number(e.target.value) : null)}
              disabled={assigning}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:opacity-60"
            >
              <option value="">— Не назначен —</option>
              {admins.map((admin) => (
                <option key={admin.id} value={admin.id}>
                  {admin.name}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>
    </div>
  );
}
