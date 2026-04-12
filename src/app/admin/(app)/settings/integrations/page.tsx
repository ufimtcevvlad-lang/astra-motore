"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";

export default function SettingsIntegrationsPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<{
    ok: boolean;
    message: string;
  } | null>(null);

  useEffect(() => {
    fetch("/api/admin/settings/integrations")
      .then((r) => r.json())
      .then((d) => setData(d.settings || {}));
  }, []);

  const handleChange = useCallback((key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/settings/integrations", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  async function handleTestMetrika() {
    setTesting(true);
    setTestResult(null);
    try {
      const res = await fetch("/api/admin/settings/test-metrika", {
        method: "POST",
      });
      const d = await res.json();
      if (d.ok) {
        setTestResult({
          ok: true,
          message: `\u041F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u043E. \u0412\u0438\u0437\u0438\u0442\u044B \u0441\u0435\u0433\u043E\u0434\u043D\u044F: ${d.visits ?? 0}`,
        });
      } else {
        setTestResult({ ok: false, message: d.error || "\u041E\u0448\u0438\u0431\u043A\u0430" });
      }
    } catch {
      setTestResult({ ok: false, message: "\u041E\u0448\u0438\u0431\u043A\u0430 \u0441\u043E\u0435\u0434\u0438\u043D\u0435\u043D\u0438\u044F" });
    }
    setTesting(false);
  }

  const hasMetrika = data.metrika_counter_id && data.metrika_token;

  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="\u0418\u043D\u0442\u0435\u0433\u0440\u0430\u0446\u0438\u0438" />
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        {/* Yandex Metrika */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-gray-900">
              {"\u042F\u043D\u0434\u0435\u043A\u0441.\u041C\u0435\u0442\u0440\u0438\u043A\u0430"}
            </h3>
            <span
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full ${
                hasMetrika
                  ? "bg-green-50 text-green-700"
                  : "bg-gray-100 text-gray-500"
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${hasMetrika ? "bg-green-500" : "bg-gray-400"}`}
              />
              {hasMetrika ? "\u041D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E" : "\u041D\u0435 \u043D\u0430\u0441\u0442\u0440\u043E\u0435\u043D\u043E"}
            </span>
          </div>

          <Field
            label="ID \u0441\u0447\u0451\u0442\u0447\u0438\u043A\u0430"
            value={data.metrika_counter_id ?? ""}
            onChange={(v) => handleChange("metrika_counter_id", v)}
            placeholder="12345678"
          />
          <Field
            label="OAuth-\u0442\u043E\u043A\u0435\u043D"
            value={data.metrika_token ?? ""}
            onChange={(v) => handleChange("metrika_token", v)}
            placeholder="y0_AgAAAA..."
          />

          <button
            onClick={handleTestMetrika}
            disabled={testing || !hasMetrika}
            className="text-sm text-indigo-600 hover:text-indigo-800 font-medium disabled:opacity-50"
          >
            {testing
              ? "\u041F\u0440\u043E\u0432\u0435\u0440\u043A\u0430..."
              : "\u041F\u0440\u043E\u0432\u0435\u0440\u0438\u0442\u044C \u043F\u043E\u0434\u043A\u043B\u044E\u0447\u0435\u043D\u0438\u0435"}
          </button>

          {testResult && (
            <p
              className={`text-sm ${testResult.ok ? "text-green-600" : "text-red-600"}`}
            >
              {testResult.message}
            </p>
          )}
        </div>

        {/* Google Analytics */}
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            Google Analytics
          </h3>
          <Field
            label="Measurement ID"
            value={data.ga_measurement_id ?? ""}
            onChange={(v) => handleChange("ga_measurement_id", v)}
            placeholder="G-XXXXXXXXXX"
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
