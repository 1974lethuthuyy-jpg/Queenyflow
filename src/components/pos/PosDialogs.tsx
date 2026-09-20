"use client";

import Link from "next/link";
import { useState } from "react";
import { CheckCircle2, Loader2, Plus, Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { formatCurrency } from "@/lib/format";
import { createQuickCustomer } from "@/app/(pos)/ban-hang/actions";
import type { ReceiptData } from "@/lib/receipt";
import type { Customer } from "@/types/db";

export function QuickCustomerModal({
  open,
  onClose,
  onCreated,
  initialName,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (customer: Customer) => void;
  initialName: string;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(formData: FormData) {
    setBusy(true);
    setError(null);
    const result = await createQuickCustomer({
      name: String(formData.get("name") || ""),
      phone: String(formData.get("phone") || ""),
      address: String(formData.get("address") || ""),
      region: String(formData.get("region") || ""),
    });
    setBusy(false);
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onCreated(result.customer);
  }

  return (
    <Modal open={open} onClose={onClose} title="Thêm khách hàng mới">
      <form action={submit} className="space-y-3 text-sm" key={open ? "open" : "closed"}>
        <div>
          <label className="block font-medium text-gray-700 mb-1">Tên khách hàng *</label>
          <input
            name="name"
            required
            autoFocus
            defaultValue={initialName}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-gray-700 mb-1">Điện thoại</label>
            <input name="phone" inputMode="tel" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Khu vực</label>
            <input name="region" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
          </div>
        </div>
        <div>
          <label className="block font-medium text-gray-700 mb-1">Địa chỉ</label>
          <input name="address" className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500" />
        </div>
        {error && <p className="text-red-600">{error}</p>}
        <div className="flex justify-end gap-2 pt-1">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50">
            Bỏ qua
          </button>
          <button
            type="submit"
            disabled={busy}
            className="px-5 py-2 rounded-lg bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white font-medium flex items-center gap-2"
          >
            {busy ? <Loader2 size={16} className="animate-spin" /> : <Plus size={16} />} Lưu &amp; chọn
          </button>
        </div>
      </form>
    </Modal>
  );
}

export function SuccessDialog({
  receipt,
  orderId,
  onPrint,
  onClose,
}: {
  receipt: ReceiptData | null;
  orderId: string | null;
  onPrint: () => void;
  onClose: () => void;
}) {
  if (!receipt) return null;
  const change = receipt.cashGiven != null ? receipt.cashGiven - receipt.total : null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/50 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6 text-center">
        <CheckCircle2 className="mx-auto text-green-500" size={52} strokeWidth={1.6} />
        <div className="mt-2 text-lg font-bold text-gray-900">Thanh toán thành công</div>
        <div className="text-sm text-gray-500">Mã hóa đơn: {receipt.code}</div>
        <div className="mt-3 text-3xl font-bold text-brand-700">{formatCurrency(receipt.total)}</div>
        {change != null && change > 0 && (
          <div className="mt-1 text-sm text-gray-600">
            Tiền thừa trả khách: <b>{formatCurrency(change)}</b>
          </div>
        )}
        <div className="mt-5 grid grid-cols-2 gap-2">
          <button
            onClick={onPrint}
            className="flex items-center justify-center gap-2 border border-gray-300 hover:bg-gray-50 rounded-lg py-2.5 font-medium text-gray-700"
          >
            <Printer size={16} /> In hóa đơn
          </button>
          {orderId && (
            <Link
              href={`/don-hang/${orderId}`}
              className="flex items-center justify-center border border-gray-300 hover:bg-gray-50 rounded-lg py-2.5 font-medium text-gray-700"
            >
              Xem đơn hàng
            </Link>
          )}
        </div>
        <button
          onClick={onClose}
          autoFocus
          className="mt-2 w-full bg-brand-600 hover:bg-brand-700 text-white rounded-lg py-3 font-bold"
        >
          Bán đơn mới
        </button>
      </div>
    </div>
  );
}

export function ShortcutsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const rows: Array<[string, string]> = [
    ["F3", "Tìm hàng hóa"],
    ["F4", "Tìm khách hàng"],
    ["F9", "Thanh toán"],
    ["Ctrl + N", "Thêm hóa đơn mới (tab mới)"],
    ["↑ ↓ + Enter", "Chọn kết quả tìm kiếm"],
    ["Enter (ô tìm hàng)", "Thêm hàng đầu tiên / đúng mã hàng vào hóa đơn"],
    ["Esc", "Đóng cửa sổ / ngăn thanh toán"],
  ];
  return (
    <Modal open={open} onClose={onClose} title="Phím tắt">
      <table className="w-full text-sm">
        <tbody>
          {rows.map(([key, desc]) => (
            <tr key={key} className="border-b border-gray-100 last:border-0">
              <td className="py-2 pr-4 w-44">
                <kbd className="bg-gray-100 border border-gray-300 rounded px-2 py-0.5 text-xs font-mono">{key}</kbd>
              </td>
              <td className="py-2 text-gray-700">{desc}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Modal>
  );
}
