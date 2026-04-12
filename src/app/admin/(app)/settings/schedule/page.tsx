"use client";

import { useState, useEffect, useCallback } from "react";
import AdminHeader from "@/app/admin/components/AdminHeader";

const DAYS = [
  { key: "schedule_monday", label: "Понедельник" },
  { key: "schedule_tuesday", label: "Вторник" },
  { key: "schedule_wednesday", label: "Среда" },
  { key: "schedule_thursday", label: "Четверг" },
  { key: "schedule_friday", label: "Пятница" },
  { key: "schedule_saturday", label: "Суббота" },
  { key: "schedule_sunday", label: "Воскресенье" },
];

function parseSchedule(value: string | undefined): {
  dayOff: boolean;
  from: string;
  to: string;
} {
  if (!value || value === "выходной") {
    return { dayOff: !value ? false : true, from: "09:00", to: "18:00" };
  }
  const parts = value.split("-");
  return {
    dayOff: false,
    from: parts[0] || "09:00",
    to: parts[1] || "18:00",
  };
}

export default function SettingsSchedulePage() {
  const [data, setData] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch("/api/admin/settings/schedule")
      .then((r) => r.json())
      .then((d) => setData(d.settings || {}));
  }, []);

  const updateDay = useCallback(
    (key: string, dayOff: boolean, from: string, to: string) => {
      setData((prev) => ({
        ...prev,
        [key]: dayOff ? "выходной" : `${from}-${to}`,
      }));
    },
    []
  );

  async function handleSave() {
    setSaving(true);
    await fetch("/api/admin/settings/schedule", {
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
      <AdminHeader title="Режим работы" />
      <div className="p-6 max-w-2xl mx-auto w-full space-y-6">
        <div className="bg-white rounded-xl shadow-sm p-6 space-y-3">
          {DAYS.map(({ key, label }) => {
            const { dayOff, from, to } = parseSchedule(data[key]);
            return (
              <div
                key={key}
                className="flex items-center gap-4 py-2 border-b border-gray-100 last:border-0"
              >
                <span className="w-32 text-sm font-medium text-gray-700">
                  {label}
                </span>

                <input
                  type="time"
                  value={from}
                  disabled={dayOff}
                  onChange={(e) => updateDay(key, dayOff, e.target.value, to)}
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                />
                <span className="text-sm text-gray-500">&mdash;</span>
                <input
                  type="time"
                  value={to}
                  disabled={dayOff}
                  onChange={(e) =>
                    updateDay(key, dayOff, from, e.target.value)
                  }
                  className="border border-gray-300 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-gray-100 disabled:text-gray-400"
                />

                <label className="flex items-center gap-2 ml-auto">
                  <input
                    type="checkbox"
                    checked={dayOff}
                    onChange={(e) =>
                      updateDay(key, e.target.checked, from, to)
                    }
                    className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                  />
                  <span className="text-sm text-gray-600">Выходной</span>
                </label>
              </div>
            );
          })}

          <button
            onClick={handleSave}
            disabled={saving}
            className="mt-4 bg-indigo-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 transition-colors"
          >
            {saving ? "Сохранение..." : saved ? "Сохранено ✓" : "Сохранить"}
          </button>
        </div>
      </div>
    </div>
  );
}
