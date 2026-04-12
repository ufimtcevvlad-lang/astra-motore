"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";

export default function SettingsNotificationsPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/notifications")
      .then((r) => r.json())
      .then((d) => setData(d.settings || {}));
  }, []);

  const handleChange = useCallback((key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/settings/notifications", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTestTelegram() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/test-telegram", {
        method: "POST",
      });
      const d = await res.json();
      if (d.ok) {
        setTestResult({
          ok: true,
          message: "Сообщение отправлено успешно",
        });
      } else {
        setTestResult({ ok: false, message: d.error || "Ошибка" });
      }
    } catch {
      setTestResult({ ok: false, message: "Ошибка соединения" });
    }
    setTesting(false);
  }

  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="Уведомления" />
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            Telegram-бот
          </h3>
          <p className="text-sm text-gray-500">
            Бот будет присылать уведомления о новых заказах и сообщениях в чате
          </p>
          <Field
            label="Bot Token"
            value={data.notification_telegram_bot_token ?? ""}
            onChange={(v) =>
              handleChange("notification_telegram_bot_token", v)
            }
            placeholder="123456:ABC-DEF..."
          />
          <Field
            label="Chat ID"
            value={data.notification_telegram_chat_id ?? ""}
            onChange={(v) =>
              handleChange("notification_telegram_chat_id", v)
            }
            placeholder="-1001234567890"
          />

          <button
            onClick={handleTestTelegram}
            disabled={testing}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
          >
            {testing ? "Отправка..." : "Проверить Telegram"}
          </button>

          {testResult && (
            <p
              className={`text-sm ${testResult.ok ? "text-green-600" : "text-red-600"}`}
            >
              {testResult.message}
            </p>
          )}
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
        </button>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}
