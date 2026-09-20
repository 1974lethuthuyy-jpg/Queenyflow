import { ORDER_STATUS_LABEL, type Order, type PaymentMethod, type PaymentStatus, type PricingUnit } from "@/types/db";

// Dữ liệu một hóa đơn để in / hiển thị — dùng chung cho màn bán hàng và trang chi tiết đơn.
export type ReceiptLine = {
  name: string;
  sku?: string | null;
  pricingUnit: PricingUnit;
  quantity: number;
  width: number | null;
  height: number | null;
  unitPrice: number;
  lineTotal: number;
};

export type ReceiptData = {
  code: string;
  createdAt: string;
  cashier: string;
  statusLabel: string;
  customerName: string | null;
  customerPhone: string | null;
  customerAddress: string | null;
  lines: ReceiptLine[];
  subtotal: number;
  discount: number;
  total: number;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  // Khách đưa (chỉ với tiền mặt) để in "tiền thừa"
  cashGiven: number | null;
  note: string | null;
};

export function receiptFromOrder(
  order: Order,
  cashier: string,
  opts: { cashGiven?: number | null } = {}
): ReceiptData {
  return {
    code: order.code,
    createdAt: order.created_at,
    cashier,
    statusLabel: ORDER_STATUS_LABEL[order.status],
    customerName: order.customers?.name ?? null,
    customerPhone: order.customers?.phone ?? null,
    customerAddress: order.customers?.address ?? null,
    lines: (order.order_items ?? []).map((it) => ({
      name: it.product_name,
      pricingUnit: it.width && it.height ? "area" : it.height ? "length" : "piece",
      quantity: Number(it.quantity),
      width: it.width != null ? Number(it.width) : null,
      height: it.height != null ? Number(it.height) : null,
      unitPrice: Number(it.unit_price),
      lineTotal: Number(it.line_total),
    })),
    subtotal: Number(order.subtotal),
    discount: Number(order.discount),
    total: Number(order.total_amount),
    paymentMethod: order.payment_method,
    paymentStatus: order.payment_status,
    cashGiven: opts.cashGiven ?? null,
    note: order.note,
  };
}
