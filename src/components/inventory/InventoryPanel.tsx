"use client";

import { useState } from "react";
import { ArrowDownToLine, ArrowUpFromLine } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatDateTime } from "@/lib/format";
import { MovementModal } from "./MovementModal";
import type { InventoryMovement, Product } from "@/types/db";

export function InventoryPanel({
  products,
  movements,
}: {
  products: Product[];
  movements: InventoryMovement[];
}) {
  const [modal, setModal] = useState<"in" | "out" | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex gap-3">
        <button
          onClick={() => setModal("in")}
          className="flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
        >
          <ArrowDownToLine size={16} /> Nhập kho
        </button>
        <button
          onClick={() => setModal("out")}
          className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 text-white text-sm font-medium px-4 py-2.5 rounded-lg"
        >
          <ArrowUpFromLine size={16} /> Xuất kho
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-1">
          <h2 className="font-semibold text-gray-800 mb-3">Tồn kho theo sản phẩm</h2>
          <div className="divide-y divide-gray-50 max-h-[520px] overflow-y-auto">
            {products.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-gray-700">{p.name}</span>
                <Badge color={Number(p.stock_quantity) <= Number(p.low_stock_threshold) ? "orange" : "gray"}>
                  {p.stock_quantity} {p.unit}
                </Badge>
              </div>
            ))}
            {products.length === 0 && <p className="text-sm text-gray-400 py-4">Chưa có sản phẩm.</p>}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4 lg:col-span-2">
          <h2 className="font-semibold text-gray-800 mb-3">Lịch sử nhập / xuất kho</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-400 border-b border-gray-100">
                  <th className="px-2 py-2 font-medium">Sản phẩm</th>
                  <th className="px-2 py-2 font-medium">Loại</th>
                  <th className="px-2 py-2 font-medium">Số lượng</th>
                  <th className="px-2 py-2 font-medium">Ghi chú</th>
                  <th className="px-2 py-2 font-medium">Thời gian</th>
                </tr>
              </thead>
              <tbody>
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={5} className="text-center text-gray-400 py-10">
                      Chưa có giao dịch kho nào.
                    </td>
                  </tr>
                )}
                {movements.map((m) => (
                  <tr key={m.id} className="border-b border-gray-50">
                    <td className="px-2 py-2 text-gray-700">{m.products?.name ?? "—"}</td>
                    <td className="px-2 py-2">
                      <Badge color={m.type === "in" ? "green" : "orange"}>
                        {m.type === "in" ? "Nhập kho" : "Xuất kho"}
                      </Badge>
                    </td>
                    <td className="px-2 py-2 text-gray-700">
                      {m.quantity} {m.products?.unit}
                    </td>
                    <td className="px-2 py-2 text-gray-500">{m.note || "—"}</td>
                    <td className="px-2 py-2 text-gray-400 text-xs">{formatDateTime(m.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <MovementModal open={modal !== null} onClose={() => setModal(null)} type={modal ?? "in"} products={products} />
    </div>
  );
}
