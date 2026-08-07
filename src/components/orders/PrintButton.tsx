"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-purple-600 border border-gray-200 rounded-lg px-3 py-2 print:hidden"
    >
      <Printer size={16} /> In hóa đơn
    </button>
  );
}
