"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { CustomerPricesEditor } from "./CustomerPricesEditor";
import { createCustomer, updateCustomer } from "@/app/(app)/khach-hang/actions";
import type { Customer, CustomerGroup, Product } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

const GROUPS: CustomerGroup[] = ["Mới", "Thường", "Thân thiết", "VIP", "Tiềm năng", "Ngừng giao dịch"];

export function CustomerModal({
  open,
  onClose,
  customer,
  canEdit,
  products = [],
}: {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  canEdit: boolean;
  products?: Product[];
}) {
  const isEdit = Boolean(customer);
  const action = isEdit ? updateCustomer : createCustomer;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => (await action(formData)) ?? null,
    null
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  const readOnly = isEdit && !canEdit;

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Thông tin khách hàng" : "Thêm khách hàng mới"}>
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={customer!.id} />}

        <ImageUploadField bucket="avatars" name="avatarUrl" defaultValue={customer?.avatar_url} label="Ảnh khách hàng" />

        <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-70">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
            <input
              name="name"
              required
              defaultValue={customer?.name}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
              <input
                name="phone"
                defaultValue={customer?.phone ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                defaultValue={customer?.email ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
              <input
                name="region"
                defaultValue={customer?.region ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm khách hàng</label>
              <select
                name="groupTag"
                defaultValue={customer?.group_tag ?? "Mới"}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                {GROUPS.map((g) => (
                  <option key={g} value={g}>
                    {g}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
            <input
              name="address"
              defaultValue={customer?.address ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
            <textarea
              name="notes"
              rows={2}
              defaultValue={customer?.notes ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </fieldset>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        {!readOnly && (
          <button
            type="submit"
            disabled={pending}
            className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
          >
            {pending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm khách hàng"}
          </button>
        )}
        {readOnly && (
          <p className="text-xs text-amber-600 text-center">
            Chỉ tài khoản admin mới có quyền sửa thông tin khách hàng.
          </p>
        )}
      </form>

      {isEdit && canEdit && products.length > 0 && (
        <div className="mt-4">
          <CustomerPricesEditor customerId={customer!.id} products={products} />
        </div>
      )}
    </Modal>
  );
}
