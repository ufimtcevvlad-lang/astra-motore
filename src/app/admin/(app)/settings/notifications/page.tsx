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
          message: "\u0421\u043E\u043E\u0431\u0449\u0435\u043D\u0438\u0435 \u043E\u0442\u043F\u0440\u0430\u0432\u043B\u0435\u043D\u043E \u0443\u0441\u043F\u0435\u0448\u043D\u043E",
        });
      } else {
        setTestResult({ ok: false, message: d.error || "\u041E\u0448\u0438\u0431\u043A\u0430" });
      }
    } catch {
      setTestResult({ ok: false, message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F" });
    }
    setTesting(false);
  }

  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="\u0423\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F" />
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            Telegram
          </h3>
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
            {testing
              ? "\u041E\u0442\u043F\u0440\u0430\u0432\u043A\u0430..."
              : "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C Telegram"}
          </button>

          {testResult && (
            <p
              className={`text-sm ${testResult.ok ? "text-green-600" : "text-red-600"}`}
            >
              {testResult.message}
            </p>
          )}
        </div>

        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            VAPID-\u043A\u043B\u044E\u0447\u0438 (Push-\u0443\u0432\u0435\u0434\u043E\u043C\u043B\u0435\u043D\u0438\u044F)
          </h3>
          <Field
            label="Public Key"
            value={data.notification_vapid_public ?? ""}
            onChange={(v) => handleChange("notification_vapid_public", v)}
            placeholder="BPnJ..."
          />
          <Field
            label="Private Key"
            value={data.notification_vapid_private ?? ""}
            onChange={(v) => handleChange("notification_vapid_private", v)}
            placeholder="..."
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
        >
          {saving
            ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u0438\u0435..."
            : saved
              ? "\u0421\u043E\u0445\u0440\u0430\u043D\u0435\u043D\u043E \u2713"
              : "\u0421\u043E\u0445\u0440\u0430\u043D\u0438\u0442\u044C"}
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
