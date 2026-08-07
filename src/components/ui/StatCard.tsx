import type { LucideIcon } from "lucide-react";

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  color = "purple",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  color?: "purple" | "blue" | "green" | "orange" | "pink";
}) {
  const colors: Record<string, string> = {
    purple: "bg-purple-100 text-purple-600",
    blue: "bg-blue-100 text-blue-600",
    green: "bg-green-100 text-green-600",
    orange: "bg-orange-100 text-orange-600",
    pink: "bg-pink-100 text-pink-600",
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex-1 min-w-[180px]">
      <div className="flex items-center gap-3">
        <div className={`rounded-lg p-2 ${colors[color]}`}>
          <Icon size={20} />
        </div>
        <div>
          <div className="text-xs text-gray-500">{label}</div>
          <div className="text-lg font-bold text-gray-800">{value}</div>
        </div>
      </div>
      {hint && <div className="text-xs text-gray-400 mt-2">{hint}</div>}
    </div>
  );
}
