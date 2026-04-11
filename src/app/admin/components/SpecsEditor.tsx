"use client";

interface Spec {
  label: string;
  value: string;
}

interface SpecsEditorProps {
  specs: Spec[];
  onChange: (specs: Spec[]) => void;
}

export default function SpecsEditor({ specs, onChange }: SpecsEditorProps) {
  function handleChange(index: number, field: "label" | "value", val: string) {
    const updated = specs.map((s, i) => (i === index ? { ...s, [field]: val } : s));
    onChange(updated);
  }

  function handleAdd() {
    onChange([...specs, { label: "", value: "" }]);
  }

  function handleRemove(index: number) {
    onChange(specs.filter((_, i) => i !== index));
  }

  const inputClass =
    "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500";

  return (
    <div>
      <div className="space-y-3">
        {specs.map((spec, i) => (
          <div key={i} className="flex items-center gap-3">
            <input
              type="text"
              placeholder="Название"
              value={spec.label}
              onChange={(e) => handleChange(i, "label", e.target.value)}
              className={inputClass}
            />
            <input
              type="text"
              placeholder="Значение"
              value={spec.value}
              onChange={(e) => handleChange(i, "value", e.target.value)}
              className={inputClass}
            />
            <button
              type="button"
              onClick={() => handleRemove(i)}
              className="flex-shrink-0 w-8 h-8 flex items-center justify-center text-gray-400 hover:text-red-500 transition"
              title="Удалить"
            >
              &times;
            </button>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={handleAdd}
        className="mt-3 text-sm text-indigo-600 hover:text-indigo-700 font-medium"
      >
        + Добавить характеристику
      </button>
    </div>
  );
}
