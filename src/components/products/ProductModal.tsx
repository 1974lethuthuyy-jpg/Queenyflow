"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { createProduct, updateProduct } from "@/app/(app)/san-pham/actions";
import type { Product } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

export function ProductModal({
  open,
  onClose,
  product,
}: {
  open: boolean;
  onClose: () => void;
  product: Product | null;
}) {
  const isEdit = Boolean(product);
  const action = isEdit ? updateProduct : createProduct;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => (await action(formData)) ?? null,
    null
  );

  useEffect(() => {
    if (state?.success) onClose();
  }, [state, onClose]);

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? "Sửa sản phẩm" : "Thêm sản phẩm"}>
      <form action={formAction} className="space-y-4">
        {isEdit && <input type="hidden" name="id" value={product!.id} />}

        <ImageUploadField bucket="products" name="imageUrl" defaultValue={product?.image_url} label="Hình ảnh sản phẩm" />

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên sản phẩm *</label>
          <input
            name="name"
            required
            defaultValue={product?.name}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mã SKU</label>
            <input
              name="sku"
              defaultValue={product?.sku ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Danh mục</label>
            <input
              name="category"
              defaultValue={product?.category ?? ""}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Đơn vị</label>
            <input
              name="unit"
              defaultValue={product?.unit ?? "Cái"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Ngưỡng báo sắp hết</label>
            <input
              name="lowStockThreshold"
              type="number"
              min={0}
              defaultValue={product?.low_stock_threshold ?? 10}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá vốn</label>
            <input
              name="costPrice"
              type="number"
              min={0}
              defaultValue={product?.cost_price ?? 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Giá bán</label>
            <input
              name="salePrice"
              type="number"
              min={0}
              defaultValue={product?.sale_price ?? 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tồn kho</label>
            <input
              name="stockQuantity"
              type="number"
              min={0}
              defaultValue={product?.stock_quantity ?? 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>

        {isEdit && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Trạng thái</label>
            <select
              name="status"
              defaultValue={product?.status ?? "active"}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="active">Còn kinh doanh</option>
              <option value="inactive">Ngừng kinh doanh</option>
            </select>
          </div>
        )}

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
        >
          {pending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm sản phẩm"}
        </button>
      </form>
    </Modal>
  );
}
