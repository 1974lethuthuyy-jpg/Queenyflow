"use client";

import { useActionState, useState } from "react";
import { Plus, Trash2, Tag } from "lucide-react";
import { createOrderCategory, deleteOrderCategory } from "@/app/(app)/cai-dat/actions";
import type { OrderCategory } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await createOrderCategory(formData)) ?? null;
}

export function OrderCategoriesPanel({
  categories,
  readOnly,
}: {
  categories: OrderCategory[];
  readOnly: boolean;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(c: OrderCategory) {
    if (!confirm(`Xoá loại đơn hàng "${c.name}"?`)) return;
    setBusyId(c.id);
    await deleteOrderCategory(c.id);
    setBusyId(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-xl">
      <div>
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <Tag size={18} className="text-brand-600" /> Loại đơn hàng
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Tự tạo các loại đơn hàng theo ý bạn (ví dụ: Đặt may riêng, Bán sỉ, Bảo hành...) để chọn khi lên đơn.
        </p>
      </div>

      <div className="flex flex-wrap gap-2">
        {categories.length === 0 && <p className="text-sm text-gray-400">Chưa có loại đơn hàng nào.</p>}
        {categories.map((c) => (
          <span
            key={c.id}
            className="inline-flex items-center gap-1.5 bg-brand-50 text-brand-700 text-sm rounded-full pl-3 pr-1.5 py-1"
          >
            {c.name}
            {!readOnly && (
              <button
                onClick={() => handleDelete(c)}
                disabled={busyId === c.id}
                className="text-brand-400 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 size={13} />
              </button>
            )}
          </span>
        ))}
      </div>

      {!readOnly && (
        <form action={formAction} className="flex items-end gap-2">
          <input
            name="name"
            placeholder="Tên loại đơn hàng mới"
            required
            className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
          <button
            type="submit"
            disabled={pending}
            className="flex items-center gap-1.5 bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium px-3 py-2 rounded-lg"
          >
            <Plus size={16} /> Thêm
          </button>
        </form>
      )}
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
