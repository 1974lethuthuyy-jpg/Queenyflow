"use client";

import { useState } from "react";
import { ChevronDown, SlidersHorizontal } from "lucide-react";

// Cột bộ lọc bên trái các trang danh sách (kiểu KiotViet). Trên điện thoại thu gọn thành nút "Bộ lọc".
export function FilterPanel({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <aside className="w-full lg:w-64 shrink-0">
      <button
        onClick={() => setOpen((v) => !v)}
        className="lg:hidden w-full flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-2.5 text-sm font-medium text-gray-700"
      >
        <span className="flex items-center gap-2">
          <SlidersHorizontal size={16} /> Bộ lọc
        </span>
        <ChevronDown size={16} className={open ? "rotate-180 transition" : "transition"} />
      </button>
      <div className={`${open ? "block" : "hidden"} lg:block mt-2 lg:mt-0 bg-white border border-gray-200 rounded-lg divide-y divide-gray-100`}>{children}</div>
    </aside>
  );
}

export function FilterSection({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="p-3.5">
      <div className="text-sm font-semibold text-gray-800 mb-2.5">{title}</div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

export function CheckItem({
  label,
  checked,
  onChange,
  count,
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  count?: number;
}) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="w-4 h-4 accent-brand-600" />
      <span className="flex-1">{label}</span>
      {count !== undefined && <span className="text-xs text-gray-400">{count}</span>}
    </label>
  );
}

export function RadioItem({ label, checked, onChange }: { label: string; checked: boolean; onChange: () => void }) {
  return (
    <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
      <input type="radio" checked={checked} onChange={onChange} className="w-4 h-4 accent-brand-600" />
      {label}
    </label>
  );
}

export function FilterSelect({
  value,
  onChange,
  children,
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-500"
    >
      {children}
    </select>
  );
}
