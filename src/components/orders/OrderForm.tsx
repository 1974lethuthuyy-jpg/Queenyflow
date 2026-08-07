"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2, QrCode, Banknote, HandCoins } from "lucide-react";
import { createOrder } from "@/app/(app)/don-hang/actions";
import { formatCurrency } from "@/lib/format";
import type { Customer, PaymentMethod, Product } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await createOrder(formData)) ?? null;
}

type LineItem = {
  key: string;
  productId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
  maxStock: number;
};

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string; icon: typeof QrCode }> = [
  { value: "qr", label: "QR ngân hàng", icon: QrCode },
  { value: "cash", label: "Tiền mặt", icon: Banknote },
  { value: "debt", label: "Ghi nợ", icon: HandCoins },
];

export function OrderForm({ products, customers }: { products: Product[]; customers: Customer[] }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");

  const subtotal = useMemo(() => items.reduce((s, it) => s + it.unitPrice * it.quantity, 0), [items]);
  const total = Math.max(0, subtotal - discount);

  function addItem() {
    const first = products[0];
    if (!first) return;
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: first.id,
        name: first.name,
        unitPrice: first.sale_price,
        quantity: 1,
        maxStock: Number(first.stock_quantity),
      },
    ]);
  }

  function updateItemProduct(key: string, productId: string) {
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? { ...it, productId: p.id, name: p.name, unitPrice: p.sale_price, maxStock: Number(p.stock_quantity) }
          : it
      )
    );
  }

  function updateItemQuantity(key: string, quantity: number) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function handleSubmit(formData: FormData) {
    formData.set(
      "items",
      JSON.stringify(
        items.map((it) => ({
          productId: it.productId,
          name: it.name,
          unitPrice: it.unitPrice,
          quantity: it.quantity,
        }))
      )
    );
    formData.set("customerId", customerId);
    formData.set("paymentMethod", paymentMethod);
    formData.set("discount", String(discount));
    formData.set("note", note);
    formAction(formData);
  }

  const overStock = items.find((it) => it.quantity > it.maxStock);

  return (
    <form action={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
          <select
            value={customerId}
            onChange={(e) => setCustomerId(e.target.value)}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          >
            <option value="">Khách vãng lai</option>
            {customers.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} {c.phone ? `— ${c.phone}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">Sản phẩm</label>
            <button
              type="button"
              onClick={addItem}
              disabled={products.length === 0}
              className="flex items-center gap-1 text-xs font-medium text-purple-600 hover:text-purple-800 disabled:opacity-50"
            >
              <Plus size={14} /> Thêm dòng
            </button>
          </div>

          <div className="space-y-2">
            {items.length === 0 && (
              <p className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg py-6 text-center">
                Chưa có sản phẩm nào trong đơn.
              </p>
            )}
            {items.map((it) => (
              <div key={it.key} className="flex items-center gap-2">
                <select
                  value={it.productId ?? ""}
                  onChange={(e) => updateItemProduct(it.key, e.target.value)}
                  className="flex-1 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                >
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItemQuantity(it.key, Number(e.target.value))}
                  className="w-20 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                />
                <div className="w-28 text-right text-sm text-gray-700 shrink-0">
                  {formatCurrency(it.unitPrice * it.quantity)}
                </div>
                <button type="button" onClick={() => removeItem(it.key)} className="text-gray-400 hover:text-red-600">
                  <Trash2 size={16} />
                </button>
              </div>
            ))}
          </div>
          {overStock && (
            <p className="text-xs text-red-600 mt-2">
              &quot;{overStock.name}&quot; chỉ còn {overStock.maxStock} trong kho, vượt số lượng đặt.
            </p>
          )}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú đơn hàng</label>
          <textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={2}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4 h-fit">
        <h2 className="font-semibold text-gray-800">Thanh toán</h2>

        <div className="grid grid-cols-3 gap-2">
          {PAYMENT_OPTIONS.map((opt) => {
            const Icon = opt.icon;
            return (
              <button
                type="button"
                key={opt.value}
                onClick={() => setPaymentMethod(opt.value)}
                className={`flex flex-col items-center gap-1 rounded-lg border py-3 text-xs font-medium transition ${
                  paymentMethod === opt.value
                    ? "border-purple-500 bg-purple-50 text-purple-700"
                    : "border-gray-200 text-gray-500 hover:bg-gray-50"
                }`}
              >
                <Icon size={18} />
                {opt.label}
              </button>
            );
          })}
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Giảm giá (đ)</label>
          <input
            type="number"
            min={0}
            value={discount}
            onChange={(e) => setDiscount(Number(e.target.value))}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div className="border-t border-gray-100 pt-3 space-y-1.5 text-sm">
          <div className="flex justify-between text-gray-500">
            <span>Tạm tính</span>
            <span>{formatCurrency(subtotal)}</span>
          </div>
          <div className="flex justify-between text-gray-500">
            <span>Giảm giá</span>
            <span>-{formatCurrency(discount)}</span>
          </div>
          <div className="flex justify-between text-base font-bold text-gray-800">
            <span>Tổng cộng</span>
            <span>{formatCurrency(total)}</span>
          </div>
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

        <button
          type="submit"
          disabled={pending || items.length === 0 || Boolean(overStock)}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition"
        >
          {pending ? "Đang tạo đơn..." : "Tạo đơn hàng"}
        </button>
      </div>
    </form>
  );
}
