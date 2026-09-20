"use client";

import { useActionState } from "react";
import { Modal } from "@/components/ui/Modal";
import { useCloseOnSuccess } from "@/lib/use-close-on-success";
import { recordMovement } from "@/app/(app)/kho-hang/actions";
import type { Product } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await recordMovement(formData)) ?? null;
}

export function MovementModal({
  open,
  onClose,
  type,
  products,
}: {
  open: boolean;
  onClose: () => void;
  type: "in" | "out";
  products: Product[];
}) {
  const [state, formAction, pending] = useActionState(action, null);

  useCloseOnSuccess(state, onClose);

  return (
    <Modal open={open} onClose={onClose} title={type === "in" ? "Nhập kho" : "Xuất kho"}>
      <form action={formAction} className="space-y-4">
        <input type="hidden" name="type" value={type} />
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Sản phẩm *</label>
          <select
            name="productId"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          >
            <option value="">-- Chọn sản phẩm --</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} (đang có {p.stock_quantity} {p.unit})
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Số lượng *</label>
          <input
            name="quantity"
            type="number"
            min={0.01}
            step="any"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
          <input
            name="note"
            placeholder={type === "in" ? "Ví dụ: nhập từ nhà cung cấp X" : "Ví dụ: xuất bán lẻ"}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button
          type="submit"
          disabled={pending}
          className={`w-full text-white rounded-lg py-2.5 text-sm font-semibold transition disabled:opacity-60 ${
            type === "in" ? "bg-green-600 hover:bg-green-700" : "bg-orange-600 hover:bg-orange-700"
          }`}
        >
          {pending ? "Đang lưu..." : type === "in" ? "Xác nhận nhập kho" : "Xác nhận xuất kho"}
        </button>
      </form>
    </Modal>
  );
}
