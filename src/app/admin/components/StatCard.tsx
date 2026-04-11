interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  subtitleColor?: "green" | "red" | "gray" | "amber";
}

const subtitleColors: Record<string, string> = {
  green: "text-green-600",
  red: "text-red-500",
  gray: "text-gray-500",
  amber: "text-amber-600",
};

export default function StatCard({ label, value, subtitle, subtitleColor = "gray" }: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm p-5 flex flex-col gap-1">
      <p className="text-xs font-semibold uppercase tracking-wider text-gray-400">{label}</p>
      <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
      {subtitle && (
        <p className={`text-sm mt-0.5 ${subtitleColors[subtitleColor]}`}>{subtitle}</p>
      )}
    </div>
  );
}
