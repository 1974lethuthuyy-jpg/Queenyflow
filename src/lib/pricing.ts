import type { PricingUnit } from "@/types/db";

export type PricedLine = {
  pricingUnit: PricingUnit;
  quantity: number;
  width: number | null;
  height: number | null;
  unitPrice: number;
};

// Theo m²: số tấm × dài × rộng × giá/m². Theo mét dài: số cây × số mét × giá/mét. Còn lại: số lượng × giá.
export function lineTotal(line: PricedLine) {
  const q = Number(line.quantity) || 0;
  const w = Number(line.width) || 0;
  const h = Number(line.height) || 0;
  const price = Number(line.unitPrice) || 0;
  if (line.pricingUnit === "area") return Math.round(q * w * h * price);
  if (line.pricingUnit === "length") return Math.round(q * h * price);
  return Math.round(q * price);
}

// Lượng thực trừ kho (m², mét hoặc cái) — khớp với trigger trừ kho trong database.
export function consumedStock(line: Omit<PricedLine, "unitPrice">) {
  const q = Number(line.quantity) || 0;
  const w = Number(line.width) || 0;
  const h = Number(line.height) || 0;
  if (line.pricingUnit === "area") return q * w * h;
  if (line.pricingUnit === "length") return q * h;
  return q;
}

export function formatNumber(value: number, maxFractionDigits = 2) {
  return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: maxFractionDigits }).format(value);
}

// "2,4m × 2,6m" (rèm/vải) hoặc "3m" (ray) — dùng trên hóa đơn và giỏ hàng.
export function dimensionLabel(line: { width: number | null; height: number | null }) {
  if (line.width && line.height) return `${formatNumber(line.height)}m × ${formatNumber(line.width)}m`;
  if (line.height) return `${formatNumber(line.height)}m`;
  return "";
}
