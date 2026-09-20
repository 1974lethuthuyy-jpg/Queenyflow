"use client";

import { AlertTriangle, Minus, PackageSearch, Plus, Tag, Trash2 } from "lucide-react";
import { NumberField } from "@/components/ui/NumberField";
import { formatCurrency } from "@/lib/format";
import { consumedStock, formatNumber, lineTotal } from "@/lib/pricing";
import type { Product } from "@/types/db";
import type { CartLine } from "./pos-state";
import { priceSuffix } from "./PosSearch";

const LENGTH_PRESETS = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3];
const WIDTH_PRESETS = [1, 1.2, 1.4, 1.6, 1.8, 2, 2.4, 2.8, 3, 3.2];
const RAIL_PRESETS = [1, 1.2, 1.5, 1.8, 2, 2.2, 2.4, 2.6, 2.8, 3, 3.5, 4, 5, 6];

const UNIT_TAG: Record<Product["pricing_unit"], string> = { area: "M2", length: "M", piece: "" };

export function PosCart({
  lines,
  productMap,
  priceOf,
  canEditPrice,
  focusKey,
  onChange,
  onRemove,
}: {
  lines: CartLine[];
  productMap: Map<string, Product>;
  priceOf: (line: CartLine, product: Product) => { price: number; custom: boolean };
  canEditPrice: boolean;
  focusKey: string | null;
  onChange: (key: string, patch: Partial<CartLine>) => void;
  onRemove: (key: string) => void;
}) {
  if (lines.length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center text-gray-400 gap-3 px-6 text-center">
        <PackageSearch size={44} strokeWidth={1.3} />
        <div className="text-sm">
          Chưa có sản phẩm nào trong hóa đơn.
          <br />
          Chọn hàng ở bên phải hoặc gõ tên / mã hàng vào ô <b className="text-gray-500">Tìm hàng hóa (F3)</b>.
        </div>
      </div>
    );
  }

  return (
    <div className="pos-scroll h-full overflow-y-auto p-2 space-y-2">
      {lines.map((line, index) => {
        const product = productMap.get(line.productId);
        if (!product) return null;
        const { price, custom } = priceOf(line, product);
        const total = lineTotal({
          pricingUnit: product.pricing_unit,
          quantity: line.quantity,
          width: line.width,
          height: line.height,
          unitPrice: price,
        });
        const used = consumedStock({ pricingUnit: product.pricing_unit, quantity: line.quantity, width: line.width, height: line.height });
        const stock = Number(product.stock_quantity);
        const over = used > stock;
        const isArea = product.pricing_unit === "area";
        const isLength = product.pricing_unit === "length";
        const missingDims = (isArea && (!(line.width > 0) || !(line.height > 0))) || (isLength && !(line.height > 0));
        const isFocus = line.key === focusKey;
        const tag = UNIT_TAG[product.pricing_unit];

        return (
          <div key={line.key} className="bg-white rounded-lg border border-gray-200 px-3 py-2.5 shadow-[0_1px_2px_rgba(0,0,0,0.03)]">
            <div className="flex items-center gap-2.5">
              <span className="text-xs text-gray-400 w-4 text-center shrink-0">{index + 1}</span>
              <button
                type="button"
                onClick={() => onRemove(line.key)}
                title="Xóa khỏi hóa đơn"
                className="text-gray-400 hover:text-red-500 shrink-0"
              >
                <Trash2 size={16} />
              </button>
              {product.sku && <span className="text-xs text-gray-500 shrink-0 hidden sm:inline">{product.sku}</span>}
              <div className="min-w-0 flex-1 text-sm font-medium text-gray-800 truncate" title={product.name}>
                {product.name}
              </div>
              {tag && <span className="text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 rounded px-1.5 py-0.5 shrink-0">{tag}</span>}
              <div className="text-sm font-bold text-gray-900 shrink-0 w-28 text-right">{formatCurrency(total)}</div>
            </div>

            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 pl-6">
              <div className="flex items-center" title={isArea ? "Số tấm" : isLength ? "Số cây / thanh" : "Số lượng"}>
                <button
                  type="button"
                  onClick={() => onChange(line.key, { quantity: Math.max(1, Number(line.quantity) - 1) })}
                  className="w-7 h-7 rounded-l-md border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
                >
                  <Minus size={14} />
                </button>
                <NumberField
                  value={line.quantity}
                  decimals={2}
                  onChange={(v) => onChange(line.key, { quantity: v })}
                  className="w-14 h-7 border-y border-gray-300 text-center text-sm focus:outline-none focus:bg-brand-50"
                />
                <button
                  type="button"
                  onClick={() => onChange(line.key, { quantity: Number(line.quantity) + 1 })}
                  className="w-7 h-7 rounded-r-md border border-gray-300 text-gray-500 hover:bg-gray-50 flex items-center justify-center"
                >
                  <Plus size={14} />
                </button>
                {(isArea || isLength) && <span className="ml-1.5 text-xs text-gray-400">{isArea ? "tấm" : "cây"}</span>}
              </div>

              {isArea && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-xs text-gray-400">Dài</span>
                  <NumberField
                    autoFocus={isFocus}
                    listId={`len-${line.key}`}
                    value={line.height || null}
                    decimals={2}
                    placeholder="0"
                    onChange={(v) => onChange(line.key, { height: v })}
                    className={`w-16 h-7 rounded-md border px-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-200 ${line.height > 0 ? "border-gray-300" : "border-amber-400 bg-amber-50"}`}
                  />
                  <datalist id={`len-${line.key}`}>{LENGTH_PRESETS.map((v) => <option key={v} value={String(v).replace(".", ",")} />)}</datalist>
                  <span className="text-gray-400">m ×</span>
                  <span className="text-xs text-gray-400">Rộng</span>
                  <NumberField
                    listId={`wid-${line.key}`}
                    value={line.width || null}
                    decimals={2}
                    placeholder="0"
                    onChange={(v) => onChange(line.key, { width: v })}
                    className={`w-16 h-7 rounded-md border px-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-200 ${line.width > 0 ? "border-gray-300" : "border-amber-400 bg-amber-50"}`}
                  />
                  <datalist id={`wid-${line.key}`}>{WIDTH_PRESETS.map((v) => <option key={v} value={String(v).replace(".", ",")} />)}</datalist>
                  <span className="text-gray-400">m</span>
                  <span className="text-xs text-brand-700 bg-brand-50 rounded px-1.5 py-0.5">= {formatNumber(line.width * line.height)} m²/tấm</span>
                </div>
              )}

              {isLength && (
                <div className="flex items-center gap-1.5 text-sm">
                  <span className="text-xs text-gray-400">Dài</span>
                  <NumberField
                    autoFocus={isFocus}
                    listId={`rail-${line.key}`}
                    value={line.height || null}
                    decimals={2}
                    placeholder="0"
                    onChange={(v) => onChange(line.key, { height: v })}
                    className={`w-16 h-7 rounded-md border px-2 text-right focus:outline-none focus:ring-2 focus:ring-brand-200 ${line.height > 0 ? "border-gray-300" : "border-amber-400 bg-amber-50"}`}
                  />
                  <datalist id={`rail-${line.key}`}>{RAIL_PRESETS.map((v) => <option key={v} value={String(v).replace(".", ",")} />)}</datalist>
                  <span className="text-gray-400">mét / cây</span>
                </div>
              )}

              <div className="flex items-center gap-1.5 ml-auto">
                <span className="text-xs text-gray-400">Đơn giá</span>
                {canEditPrice ? (
                  <NumberField
                    value={price}
                    onChange={(v) => onChange(line.key, { unitPrice: v })}
                    className={`w-28 h-7 rounded-md border px-2 text-right text-sm focus:outline-none focus:ring-2 focus:ring-brand-200 ${
                      custom ? "border-brand-300 bg-brand-50 text-brand-800" : "border-gray-300"
                    }`}
                  />
                ) : (
                  <span className={`text-sm w-28 text-right ${custom ? "text-brand-700 font-medium" : "text-gray-700"}`}>{formatCurrency(price)}</span>
                )}
                <span className="text-xs text-gray-400 w-6">{priceSuffix(product)}</span>
                {custom && (
                  <span title="Giá riêng của khách này" className="text-brand-600">
                    <Tag size={13} />
                  </span>
                )}
              </div>
            </div>

            {(over || missingDims) && (
              <div className="mt-1.5 pl-6 flex flex-wrap gap-x-4 text-xs">
                {missingDims && <span className="text-amber-600">Nhập đủ số đo để tính tiền.</span>}
                {over && (
                  <span className="text-amber-600 flex items-center gap-1">
                    <AlertTriangle size={12} /> Vượt tồn kho (còn {formatNumber(stock)} {product.unit}, cần {formatNumber(used)})
                  </span>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
