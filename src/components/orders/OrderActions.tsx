"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Trash2 } from "lucide-react";
import { deleteOrder, markOrderPaid, updateOrderStatus } from "@/app/(app)/don-hang/actions";
import { ORDER_STATUS_LABEL, type Order, type OrderStatus } from "@/types/db";

const STATUSES: OrderStatus[] = ["cho_xac_nhan", "dang_xu_ly", "dang_giao", "hoan_thanh", "da_huy"];

export function OrderActions({ order, isManager }: { order: Order; isManager: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function handleStatusChange(status: OrderStatus) {
    setBusy(true);
    await updateOrderStatus(order.id, status);
    setBusy(false);
    router.refresh();
  }

  async function handleMarkPaid() {
    setBusy(true);
    await markOrderPaid(order.id);
    setBusy(false);
    router.refresh();
  }

  async function handleDelete() {
    if (!confirm(`Xoá đơn hàng ${order.code}? Hành động này không thể hoàn tác.`)) return;
    setBusy(true);
    await deleteOrder(order.id);
    router.push("/don-hang");
  }

  return (
    <div className="flex flex-wrap items-center gap-3 print:hidden">
      <select
        value={order.status}
        disabled={busy}
        onChange={(e) => handleStatusChange(e.target.value as OrderStatus)}
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm"
      >
        {STATUSES.map((s) => (
          <option key={s} value={s}>
            {ORDER_STATUS_LABEL[s]}
          </option>
        ))}
      </select>

      {order.payment_status === "unpaid" && (
        <button
          onClick={handleMarkPaid}
          disabled={busy}
          className="text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-lg px-3 py-2"
        >
          Xác nhận đã thanh toán
        </button>
      )}

      {isManager && (
        <button
          onClick={handleDelete}
          disabled={busy}
          className="flex items-center gap-1.5 text-sm font-medium text-red-600 hover:bg-red-50 rounded-lg px-3 py-2"
        >
          <Trash2 size={14} /> Xoá đơn hàng
        </button>
      )}
    </div>
  );
}
