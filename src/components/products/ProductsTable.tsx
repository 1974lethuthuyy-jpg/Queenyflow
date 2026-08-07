"use client";

import { useState } from "react";
import { Pencil, Trash2, Plus, Package } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";
import { deleteProduct } from "@/app/(app)/san-pham/actions";
import { ProductModal } from "./ProductModal";
import type { Product } from "@/types/db";

export function ProductsTable({
  products,
  isManager,
}: {
  products: Product[];
  isManager: boolean;
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }

  function openEdit(p: Product) {
    setEditing(p);
    setModalOpen(true);
  }

  async function handleDelete(p: Product) {
    if (!confirm(`Xoá sản phẩm "${p.name}"? Hành động này không thể hoàn tác.`)) return;
    setBusyId(p.id);
    await deleteProduct(p.id);
    setBusyId(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <h2 className="font-semibold text-gray-800">Danh sách sản phẩm ({products.length})</h2>
        {isManager && (
          <button
            onClick={openCreate}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
          >
            <Plus size={16} /> Thêm sản phẩm
          </button>
        )}
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Sản phẩm</th>
              <th className="px-4 py-2 font-medium">Danh mục</th>
              <th className="px-4 py-2 font-medium">Giá vốn</th>
              <th className="px-4 py-2 font-medium">Giá bán</th>
              <th className="px-4 py-2 font-medium">Tồn kho</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              {isManager && <th className="px-4 py-2 font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {products.length === 0 && (
              <tr>
                <td colSpan={7} className="text-center text-gray-400 py-10">
                  Chưa có sản phẩm nào.
                </td>
              </tr>
            )}
            {products.map((p) => (
              <tr key={p.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                      {p.image_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={p.image_url} alt={p.name} className="w-full h-full object-cover" />
                      ) : (
                        <Package size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">{p.name}</div>
                      <div className="text-xs text-gray-400">{p.sku || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{p.category || "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{formatCurrency(p.cost_price)}</td>
                <td className="px-4 py-2.5 text-gray-800 font-medium">{formatCurrency(p.sale_price)}</td>
                <td className="px-4 py-2.5">
                  {Number(p.stock_quantity) <= Number(p.low_stock_threshold) ? (
                    <Badge color="orange">
                      {p.stock_quantity} {p.unit}
                    </Badge>
                  ) : (
                    <span className="text-gray-600">
                      {p.stock_quantity} {p.unit}
                    </span>
                  )}
                </td>
                <td className="px-4 py-2.5">
                  <Badge color={p.status === "active" ? "green" : "gray"}>
                    {p.status === "active" ? "Còn kinh doanh" : "Ngừng kinh doanh"}
                  </Badge>
                </td>
                {isManager && (
                  <td className="px-4 py-2.5">
                    <div className="flex items-center gap-2">
                      <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-purple-600">
                        <Pencil size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(p)}
                        disabled={busyId === p.id}
                        className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <ProductModal open={modalOpen} onClose={() => setModalOpen(false)} product={editing} />
    </div>
  );
}
