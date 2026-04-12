"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";

export default function SettingsContactsPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/contacts")
      .then((r) => r.json())
      .then((d) => setData(d.settings || {}));
  }, []);

  const handleChange = useCallback((key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/settings/contacts", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="flex flex-col flex-1">
      <AdminHeader title="Контакты" />
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <Field
            label="Телефон"
            value={data.contact_phone ?? ""}
            onChange={(v) => handleChange("contact_phone", v)}
            placeholder="+7 (999) 123-45-67"
          />
          <Field
            label="Email"
            value={data.contact_email ?? ""}
            onChange={(v) => handleChange("contact_email", v)}
            placeholder="info@example.com"
            type="email"
          />
          <Field
            label="Адрес"
            value={data.contact_address ?? ""}
            onChange={(v) => handleChange("contact_address", v)}
            placeholder="г. Екатеринбург, ул. Примерная, 1"
          />
          <Field
            label="Telegram"
            value={data.contact_telegram ?? ""}
            onChange={(v) => handleChange("contact_telegram", v)}
            placeholder="@username"
          />
          <Field
            label="WhatsApp"
            value={data.contact_whatsapp ?? ""}
            onChange={(v) => handleChange("contact_whatsapp", v)}
            placeholder="+79991234567"
          />

          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">
        {label}
      </label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
      />
    </div>
  );
}
