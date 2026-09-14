"use client";

import { useMemo, useState } from "react";
import { Trash2, Plus, User, Search } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/format";
import { toDisplayImageUrl } from "@/lib/supabase/proxy-url";
import { deleteCustomer } from "@/app/(app)/khach-hang/actions";
import { CustomerModal } from "./CustomerModal";
import type { Customer, CustomerGroup, Product } from "@/types/db";

const GROUP_COLOR: Record<CustomerGroup, "gray" | "purple" | "blue" | "green" | "orange" | "red"> = {
  Mới: "blue",
  Thường: "gray",
  "Thân thiết": "green",
  VIP: "purple",
  "Tiềm năng": "orange",
  "Ngừng giao dịch": "red",
};

export function CustomersTable({
  customers,
  isManager,
  debtByCustomerId = {},
  products = [],
}: {
  customers: Customer[];
  isManager: boolean;
  debtByCustomerId?: Record<string, number>;
  products?: Product[];
}) {
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.phone?.toLowerCase().includes(q) ||
        c.email?.toLowerCase().includes(q) ||
        c.region?.toLowerCase().includes(q)
    );
  }, [customers, query]);

  async function handleDelete(c: Customer) {
    if (!confirm(`Xoá khách hàng "${c.name}"?`)) return;
    setBusyId(c.id);
    await deleteCustomer(c.id);
    setBusyId(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-3">
        <h2 className="font-semibold text-gray-800">Danh sách khách hàng ({filtered.length}/{customers.length})</h2>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Tìm tên, SĐT, khu vực..."
              className="w-56 border border-gray-300 rounded-lg pl-7 pr-2 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <button
            onClick={() => {
              setSelected(null);
              setModalOpen(true);
            }}
            className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-2 rounded-lg whitespace-nowrap"
          >
            <Plus size={16} /> Thêm khách hàng
          </button>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Khách hàng</th>
              <th className="px-4 py-2 font-medium">SĐT</th>
              <th className="px-4 py-2 font-medium">Khu vực</th>
              <th className="px-4 py-2 font-medium">Nhóm</th>
              <th className="px-4 py-2 font-medium">Công nợ</th>
              {isManager && <th className="px-4 py-2 font-medium">Thao tác</th>}
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={6} className="text-center text-gray-400 py-10">
                  {customers.length === 0 ? "Chưa có khách hàng nào." : "Không tìm thấy khách hàng phù hợp."}
                </td>
              </tr>
            )}
            {filtered.map((c) => (
              <tr key={c.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td
                  className="px-4 py-2.5 cursor-pointer"
                  onClick={() => {
                    setSelected(c);
                    setModalOpen(true);
                  }}
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-9 h-9 rounded-full bg-gray-100 overflow-hidden flex items-center justify-center shrink-0">
                      {c.avatar_url ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={toDisplayImageUrl(c.avatar_url)} alt={c.name} className="w-full h-full object-cover" />
                      ) : (
                        <User size={16} className="text-gray-400" />
                      )}
                    </div>
                    <div>
                      <div className="font-medium text-gray-700">{c.name}</div>
                      <div className="text-xs text-gray-400">{c.email || "—"}</div>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-gray-600">{c.phone || "—"}</td>
                <td className="px-4 py-2.5 text-gray-600">{c.region || "—"}</td>
                <td className="px-4 py-2.5">
                  <Badge color={GROUP_COLOR[c.group_tag]}>{c.group_tag}</Badge>
                </td>
                <td className="px-4 py-2.5">
                  {debtByCustomerId[c.id] ? (
                    <span className="text-orange-600 font-medium">{formatCurrency(debtByCustomerId[c.id])}</span>
                  ) : (
                    <span className="text-gray-400">0đ</span>
                  )}
                </td>
                {isManager && (
                  <td className="px-4 py-2.5">
                    <button
                      onClick={() => handleDelete(c)}
                      disabled={busyId === c.id}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <CustomerModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        customer={selected}
        canEdit={isManager}
        products={products}
      />
    </div>
  );
}
