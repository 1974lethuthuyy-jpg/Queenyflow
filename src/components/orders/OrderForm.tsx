"use client";

import { useActionState, useMemo, useState } from "react";
import { Plus, Trash2, QrCode, Banknote, HandCoins, Tag } from "lucide-react";
import { createOrder } from "@/app/(app)/don-hang/actions";
import { formatCurrency } from "@/lib/format";
import type { Customer, OrderCategory, PaymentMethod, PricingUnit, Product } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await createOrder(formData)) ?? null;
}

type LineItem = {
  key: string;
  productId: string | null;
  name: string;
  unitPrice: number;
  isCustomPrice: boolean;
  quantity: number;
  pricingUnit: PricingUnit;
  width: number;
  height: number;
  maxStock: number;
};

const PAYMENT_OPTIONS: Array<{ value: PaymentMethod; label: string; icon: typeof QrCode }> = [
  { value: "qr", label: "QR ngân hàng", icon: QrCode },
  { value: "cash", label: "Tiền mặt", icon: Banknote },
  { value: "debt", label: "Ghi nợ", icon: HandCoins },
];

function lineTotal(it: LineItem) {
  if (it.pricingUnit === "area") {
    return it.quantity * it.width * it.height * it.unitPrice;
  }
  if (it.pricingUnit === "length") {
    return it.quantity * it.height * it.unitPrice;
  }
  return it.quantity * it.unitPrice;
}

function consumedStock(it: LineItem) {
  if (it.pricingUnit === "area") {
    return it.quantity * it.width * it.height;
  }
  if (it.pricingUnit === "length") {
    return it.quantity * it.height;
  }
  return it.quantity;
}

const AREA_LENGTH_PRESETS = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3];
const AREA_WIDTH_PRESETS = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.4, 2.8, 3, 3.2];
const RAIL_LENGTH_PRESETS = [1, 1.2, 1.5, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.5, 4, 5, 6];

export function OrderForm({
  products,
  customers,
  categories,
  customerPrices,
}: {
  products: Product[];
  customers: Customer[];
  categories: OrderCategory[];
  customerPrices: Record<string, Record<string, number>>;
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [items, setItems] = useState<LineItem[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cash");
  const [discount, setDiscount] = useState(0);
  const [note, setNote] = useState("");

  const subtotal = useMemo(() => items.reduce((s, it) => s + lineTotal(it), 0), [items]);
  const total = Math.max(0, subtotal - discount);

  function priceFor(forCustomerId: string, product: Product) {
    const custom = forCustomerId ? customerPrices[forCustomerId]?.[product.id] : undefined;
    if (custom !== undefined) return { price: custom, isCustom: true };
    return { price: product.sale_price, isCustom: false };
  }

  function addItem() {
    const first = products[0];
    if (!first) return;
    const { price, isCustom } = priceFor(customerId, first);
    setItems((prev) => [
      ...prev,
      {
        key: crypto.randomUUID(),
        productId: first.id,
        name: first.name,
        unitPrice: price,
        isCustomPrice: isCustom,
        quantity: 1,
        pricingUnit: first.pricing_unit,
        width: first.pricing_unit === "area" ? 1 : 0,
        height: first.pricing_unit === "area" || first.pricing_unit === "length" ? 1 : 0,
        maxStock: Number(first.stock_quantity),
      },
    ]);
  }

  function updateItemProduct(key: string, productId: string) {
    const p = products.find((pr) => pr.id === productId);
    if (!p) return;
    const { price, isCustom } = priceFor(customerId, p);
    setItems((prev) =>
      prev.map((it) =>
        it.key === key
          ? {
              ...it,
              productId: p.id,
              name: p.name,
              unitPrice: price,
              isCustomPrice: isCustom,
              pricingUnit: p.pricing_unit,
              width: p.pricing_unit === "area" ? it.width || 1 : 0,
              height: p.pricing_unit === "area" || p.pricing_unit === "length" ? it.height || 1 : 0,
              maxStock: Number(p.stock_quantity),
            }
          : it
      )
    );
  }

  function updateItemQuantity(key: string, quantity: number) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, quantity } : it)));
  }

  function updateItemDimension(key: string, field: "width" | "height", value: number) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, [field]: value } : it)));
  }

  function updateItemPrice(key: string, unitPrice: number) {
    setItems((prev) => prev.map((it) => (it.key === key ? { ...it, unitPrice } : it)));
  }

  function removeItem(key: string) {
    setItems((prev) => prev.filter((it) => it.key !== key));
  }

  function handleCustomerChange(newCustomerId: string) {
    setCustomerId(newCustomerId);
    setItems((prev) =>
      prev.map((it) => {
        const product = products.find((p) => p.id === it.productId);
        if (!product) return it;
        const { price, isCustom } = priceFor(newCustomerId, product);
        return { ...it, unitPrice: price, isCustomPrice: isCustom };
      })
    );
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
          width: it.pricingUnit === "area" ? it.width : null,
          height: it.pricingUnit === "area" || it.pricingUnit === "length" ? it.height : null,
        }))
      )
    );
    formData.set("customerId", customerId);
    formData.set("categoryId", categoryId);
    formData.set("paymentMethod", paymentMethod);
    formData.set("discount", String(discount));
    formData.set("note", note);
    formAction(formData);
  }

  const overStock = items.find((it) => consumedStock(it) > it.maxStock);
  const invalidDimension = items.find((it) => {
    if (it.pricingUnit === "area") return !it.width || it.width <= 0 || !it.height || it.height <= 0;
    if (it.pricingUnit === "length") return !it.height || it.height <= 0;
    return false;
  });

  return (
    <form action={handleSubmit} className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5 space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Khách hàng</label>
            <select
              value={customerId}
              onChange={(e) => handleCustomerChange(e.target.value)}
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
            <label className="block text-sm font-medium text-gray-700 mb-1">Loại đơn hàng</label>
            <select
              value={categoryId}
              onChange={(e) => setCategoryId(e.target.value)}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="">Không phân loại</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
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
              <div key={it.key} className="border border-gray-100 rounded-lg p-2.5 space-y-2">
                <div className="flex items-center gap-2">
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
                    title={it.pricingUnit === "area" ? "Số tấm" : it.pricingUnit === "length" ? "Số cây/thanh" : "Số lượng"}
                    onChange={(e) => updateItemQuantity(it.key, Number(e.target.value))}
                    className="w-16 border border-gray-300 rounded-lg px-2 py-2 text-sm"
                  />
                  <div className="w-28 shrink-0">
                    <input
                      type="number"
                      min={0}
                      value={it.unitPrice}
                      onChange={(e) => updateItemPrice(it.key, Number(e.target.value))}
                      className={`w-full border rounded-lg px-2 py-2 text-sm text-right ${
                        it.isCustomPrice ? "border-purple-300 bg-purple-50 text-purple-700" : "border-gray-300"
                      }`}
                    />
                    {it.isCustomPrice && (
                      <div className="flex items-center gap-0.5 text-[10px] text-purple-600 mt-0.5">
                        <Tag size={10} /> Giá riêng
                      </div>
                    )}
                  </div>
                  <div className="w-24 text-right text-sm text-gray-700 shrink-0">{formatCurrency(lineTotal(it))}</div>
                  <button type="button" onClick={() => removeItem(it.key)} className="text-gray-400 hover:text-red-600">
                    <Trash2 size={16} />
                  </button>
                </div>

                {it.pricingUnit === "area" && (
                  <div className="flex items-center gap-2 pl-1 text-sm">
                    <span className="text-gray-400 text-xs">Số tấm × Dài(m) × Rộng(m):</span>
                    <input
                      list={`dai-presets-${it.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Dài"
                      value={it.height || ""}
                      onChange={(e) => updateItemDimension(it.key, "height", Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                    <datalist id={`dai-presets-${it.key}`}>
                      {AREA_LENGTH_PRESETS.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <span className="text-gray-400">×</span>
                    <input
                      list={`rong-presets-${it.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Rộng"
                      value={it.width || ""}
                      onChange={(e) => updateItemDimension(it.key, "width", Number(e.target.value))}
                      className="w-20 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                    <datalist id={`rong-presets-${it.key}`}>
                      {AREA_WIDTH_PRESETS.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <span className="text-xs text-gray-400">
                      = {(it.quantity * it.width * it.height).toFixed(2)} m²
                    </span>
                  </div>
                )}

                {it.pricingUnit === "length" && (
                  <div className="flex items-center gap-2 pl-1 text-sm">
                    <span className="text-gray-400 text-xs">Số cây × Số mét:</span>
                    <input
                      list={`met-presets-${it.key}`}
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Số mét"
                      value={it.height || ""}
                      onChange={(e) => updateItemDimension(it.key, "height", Number(e.target.value))}
                      className="w-24 border border-gray-300 rounded-lg px-2 py-1 text-sm"
                    />
                    <datalist id={`met-presets-${it.key}`}>
                      {RAIL_LENGTH_PRESETS.map((v) => (
                        <option key={v} value={v} />
                      ))}
                    </datalist>
                    <span className="text-xs text-gray-400">
                      = {(it.quantity * it.height).toFixed(2)} mét
                    </span>
                  </div>
                )}
              </div>
            ))}
          </div>
          {overStock && (
            <p className="text-xs text-red-600 mt-2">
              &quot;{overStock.name}&quot; chỉ còn {overStock.maxStock} trong kho, vượt số lượng đặt.
            </p>
          )}
          {!overStock && invalidDimension && (
            <p className="text-xs text-red-600 mt-2">
              Vui lòng nhập đủ {invalidDimension.pricingUnit === "length" ? "số mét" : "Dài/Rộng"} cho &quot;
              {invalidDimension.name}&quot;.
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
          disabled={pending || items.length === 0 || Boolean(overStock) || Boolean(invalidDimension)}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-semibold transition"
        >
          {pending ? "Đang tạo đơn..." : "Tạo đơn hàng"}
        </button>
      </div>
    </form>
  );
}
