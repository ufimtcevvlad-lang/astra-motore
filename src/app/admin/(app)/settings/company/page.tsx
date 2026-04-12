"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";

export default function SettingsCompanyPage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/company")
      .then((r) => r.json())
      .then((d) => setData(d.settings || {}));
  }, []);

  const handleChange = useCallback((key: string, value: string) => {
    setData((prev) => ({ ...prev, [key]: value }));
  }, []);

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/settings/company", {
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
      <AdminHeader title="Реквизиты" />
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-4">
          <Field
            label="Название компании"
            value={data.company_name ?? ""}
            onChange={(v) => handleChange("company_name", v)}
            placeholder="Astra Motors"
          />
          <Field
            label="ИНН"
            value={data.company_inn ?? ""}
            onChange={(v) => handleChange("company_inn", v)}
            placeholder="1234567890"
          />
          <Field
            label="ОГРН"
            value={data.company_ogrn ?? ""}
            onChange={(v) => handleChange("company_ogrn", v)}
            placeholder="1234567890123"
          />
          <Field
            label="Юридический адрес"
            value={data.company_legal_address ?? ""}
            onChange={(v) => handleChange("company_legal_address", v)}
            placeholder="г. Екатеринбург, ул. Примерная, 1"
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
