"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Trash2, Plus } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { deleteOrder } from "@/app/(app)/don-hang/actions";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type Order, type OrderStatus } from "@/types/db";

const TABS: Array<{ key: OrderStatus | "all"; label: string }> = [
  { key: "all", label: "Tất cả" },
  { key: "cho_xac_nhan", label: "Chờ xác nhận" },
  { key: "dang_xu_ly", label: "Đang xử lý" },
  { key: "dang_giao", label: "Đang giao" },
  { key: "hoan_thanh", label: "Hoàn thành" },
  { key: "da_huy", label: "Đã hủy" },
];

const STATUS_COLOR: Record<OrderStatus, "gray" | "purple" | "blue" | "green" | "orange" | "red"> = {
  cho_xac_nhan: "blue",
  dang_xu_ly: "orange",
  dang_giao: "purple",
  hoan_thanh: "green",
  da_huy: "red",
};

export function OrdersTable({ orders, isManager }: { orders: Order[]; isManager: boolean }) {
  const [tab, setTab] = useState<OrderStatus | "all">("all");
  const [busyId, setBusyId] = useState<string | null>(null);

  const filtered = useMemo(
    () => (tab === "all" ? orders : orders.filter((o) => o.status === tab)),
    [orders, tab]
  );

  async function handleDelete(o: Order) {
    if (!confirm(`Xoá đơn hàng ${o.code}? Hành động này không thể hoàn tác.`)) return;
    setBusyId(o.id);
    await deleteOrder(o.id);
    setBusyId(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100 flex-wrap gap-3">
        <div className="flex gap-1 overflow-x-auto">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition ${
                tab === t.key ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-100"
              }`}
            >
              {t.label} ({t.key === "all" ? orders.length : orders.filter((o) => o.status === t.key).length})
            </button>
          ))}
        </div>
        <Link
          href="/don-hang/moi"
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          <Plus size={16} /> Tạo đơn hàng
        </Link>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="px-4 py-2 font-medium">Mã đơn</th>
              <th className="px-4 py-2 font-medium">Khách hàng</th>
              <th className="px-4 py-2 font-medium">Loại đơn</th>
              <th className="px-4 py-2 font-medium">Tổng tiền</th>
              <th className="px-4 py-2 font-medium">Thanh toán</th>
              <th className="px-4 py-2 font-medium">Trạng thái</th>
              <th className="px-4 py-2 font-medium">Thời gian</th>
              <th className="px-4 py-2 font-medium">Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 && (
              <tr>
                <td colSpan={8} className="text-center text-gray-400 py-10">
                  Chưa có đơn hàng nào.
                </td>
              </tr>
            )}
            {filtered.map((o) => (
              <tr key={o.id} className="border-b border-gray-50 hover:bg-gray-50/60">
                <td className="px-4 py-2.5">
                  <Link href={`/don-hang/${o.id}`} className="font-medium text-purple-600">
                    {o.code}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-gray-700">{o.customers?.name ?? "Khách vãng lai"}</td>
                <td className="px-4 py-2.5 text-gray-500 text-xs">{o.order_categories?.name ?? "—"}</td>
                <td className="px-4 py-2.5 font-medium text-gray-800">{formatCurrency(o.total_amount)}</td>
                <td className="px-4 py-2.5">
                  <div className="flex flex-col gap-1">
                    <span className="text-gray-600 text-xs">{PAYMENT_METHOD_LABEL[o.payment_method]}</span>
                    <Badge color={o.payment_status === "paid" ? "green" : "orange"}>
                      {o.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
                    </Badge>
                  </div>
                </td>
                <td className="px-4 py-2.5">
                  <Badge color={STATUS_COLOR[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                </td>
                <td className="px-4 py-2.5 text-gray-400 text-xs">{formatDateTime(o.created_at)}</td>
                <td className="px-4 py-2.5">
                  {isManager && (
                    <button
                      onClick={() => handleDelete(o)}
                      disabled={busyId === o.id}
                      className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                    >
                      <Trash2 size={16} />
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
