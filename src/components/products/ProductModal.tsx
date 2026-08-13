"use client";

import { useActionState, useEffect, useState } from "react";
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
  const [pricingUnit, setPricingUnit] = useState(product?.pricing_unit ?? "piece");

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

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cách tính giá</label>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setPricingUnit("piece")}
              className={`rounded-lg border py-2 text-xs font-medium ${
                pricingUnit === "piece" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
              }`}
            >
              Theo cái/bộ
            </button>
            <button
              type="button"
              onClick={() => setPricingUnit("area")}
              className={`rounded-lg border py-2 text-xs font-medium ${
                pricingUnit === "area" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
              }`}
            >
              Theo m² (dài × rộng)
            </button>
            <button
              type="button"
              onClick={() => setPricingUnit("length")}
              className={`rounded-lg border py-2 text-xs font-medium ${
                pricingUnit === "length" ? "border-purple-500 bg-purple-50 text-purple-700" : "border-gray-200 text-gray-500"
              }`}
            >
              Theo mét dài
            </button>
          </div>
          <input type="hidden" name="pricingUnit" value={pricingUnit} />
          <p className="text-xs text-gray-400 mt-1">
            {pricingUnit === "area" &&
              "Khi lên đơn sẽ nhập dài/rộng, tiền tính = số lượng × dài × rộng × giá/m². Dùng cho vải, rèm may đo."}
            {pricingUnit === "length" &&
              "Khi lên đơn sẽ nhập số mét, tiền tính = số lượng × số mét × giá/mét. Dùng cho ray, thanh nhôm."}
            {pricingUnit === "piece" && "Khi lên đơn tính tiền = số lượng × giá bán."}
          </p>
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
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá vốn {pricingUnit === "area" ? "/m²" : pricingUnit === "length" ? "/mét" : ""}
            </label>
            <input
              name="costPrice"
              type="number"
              min={0}
              defaultValue={product?.cost_price ?? 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Giá bán {pricingUnit === "area" ? "/m²" : pricingUnit === "length" ? "/mét" : ""}
            </label>
            <input
              name="salePrice"
              type="number"
              min={0}
              defaultValue={product?.sale_price ?? 0}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Tồn kho {pricingUnit === "area" ? "(m²)" : pricingUnit === "length" ? "(mét)" : ""}
            </label>
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
