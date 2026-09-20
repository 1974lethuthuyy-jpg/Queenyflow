"use client";

import { useEffect, useState } from "react";
import { Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { deleteCustomerPrice, listCustomerPrices, upsertCustomerPrice } from "@/app/(app)/khach-hang/actions";
import type { CustomerPrice, Product } from "@/types/db";

export function CustomerPricesEditor({
  customerId,
  products,
}: {
  customerId: string;
  products: Product[];
}) {
  const [prices, setPrices] = useState<CustomerPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState(products[0]?.id ?? "");
  const [price, setPrice] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function refresh() {
    setLoading(true);
    const rows = (await listCustomerPrices(customerId)) as CustomerPrice[];
    setPrices(rows);
    setLoading(false);
  }

  useEffect(() => {
    let cancelled = false;
    void (listCustomerPrices(customerId) as Promise<CustomerPrice[]>).then((rows) => {
      if (cancelled) return;
      setPrices(rows);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [customerId]);

  async function handleAdd() {
    setError("");
    if (!productId || !price || Number(price) <= 0) {
      setError("Vui lòng chọn sản phẩm và nhập giá hợp lệ.");
      return;
    }
    setBusy(true);
    const formData = new FormData();
    formData.set("customerId", customerId);
    formData.set("productId", productId);
    formData.set("price", price);
    const result = await upsertCustomerPrice(formData);
    setBusy(false);
    if (result?.error) {
      setError(result.error);
      return;
    }
    setPrice("");
    await refresh();
  }

  async function handleDelete(id: string) {
    setBusy(true);
    await deleteCustomerPrice(id);
    await refresh();
    setBusy(false);
  }

  return (
    <div className="border border-gray-200 rounded-lg p-3 space-y-3">
      <div className="text-sm font-medium text-gray-700 flex items-center gap-1.5">
        <Tag size={14} className="text-brand-600" /> Giá riêng theo sản phẩm
      </div>
      <p className="text-xs text-gray-400">
        Khi lên đơn cho khách này, giá dưới đây sẽ tự động thay cho giá bán mặc định.
      </p>

      {loading ? (
        <div className="flex items-center gap-2 text-sm text-gray-400 py-2">
          <Loader2 size={14} className="animate-spin" /> Đang tải...
        </div>
      ) : (
        <div className="divide-y divide-gray-50">
          {prices.length === 0 && <p className="text-xs text-gray-400 py-1">Chưa có giá riêng nào.</p>}
          {prices.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-1.5 text-sm">
              <span className="text-gray-700">{p.products?.name ?? "—"}</span>
              <div className="flex items-center gap-2">
                <span className="font-medium text-brand-700">{formatCurrency(p.price)}</span>
                <button
                  type="button"
                  onClick={() => handleDelete(p.id)}
                  disabled={busy}
                  className="text-gray-400 hover:text-red-600 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <select
          value={productId}
          onChange={(e) => setProductId(e.target.value)}
          className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        >
          {products.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          min={0}
          placeholder="Giá riêng"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
          className="w-28 border border-gray-300 rounded-lg px-2 py-1.5 text-sm"
        />
        <button
          type="button"
          onClick={handleAdd}
          disabled={busy || products.length === 0}
          className="flex items-center gap-1 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm px-3 py-1.5 rounded-lg"
        >
          <Plus size={14} /> Lưu
        </button>
      </div>
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}
