import type { createClient } from "@/lib/supabase/server";
import type { getCurrentUser } from "@/lib/session";
import { lineTotal } from "@/lib/pricing";
import type { ReceiptData } from "@/lib/receipt";
import { ORDER_STATUS_LABEL, type OrderStatus, type PaymentMethod, type PricingUnit } from "@/types/db";

type Supabase = Awaited<ReturnType<typeof createClient>>;
type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

export type PosItemInput = {
  productId: string;
  quantity: number;
  width?: number | null;
  height?: number | null;
  // Chỉ có hiệu lực với tài khoản admin; nhân viên luôn dùng giá niêm yết / giá riêng của khách.
  unitPrice?: number;
};

export type PosOrderInput = {
  customerId: string | null;
  categoryId: string | null;
  paymentMethod: PaymentMethod;
  // Chuyển khoản: khách đã chuyển xong chưa (mặc định coi là đã nhận tiền)
  transferReceived?: boolean;
  discount: number;
  status: OrderStatus;
  note: string | null;
  delivery?: { name: string; phone: string; address: string } | null;
  cashGiven?: number | null;
  items: PosItemInput[];
};

export type PosOrderResult = { error: string } | { receipt: ReceiptData; orderId: string };

const ALLOWED_STATUS: OrderStatus[] = ["cho_xac_nhan", "dang_xu_ly", "dang_giao", "hoan_thanh"];
const ALLOWED_METHODS: PaymentMethod[] = ["qr", "cash", "debt"];

async function generateOrderCode(supabase: Supabase, orgId: string) {
  const now = new Date();
  const prefix = `DH${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(2, "0")}${String(
    now.getDate()
  ).padStart(2, "0")}`;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", startOfDay.toISOString());

  return `${prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

type ProductRow = { id: string; name: string; sku: string | null; pricing_unit: PricingUnit; sale_price: number };

export async function createPosOrderRecord(
  supabase: Supabase,
  current: CurrentUser,
  input: PosOrderInput
): Promise<PosOrderResult> {
  const orgId = current.activeOrgId;

  if (!Array.isArray(input.items) || input.items.length === 0) {
    return { error: "Vui lòng thêm ít nhất một sản phẩm vào đơn hàng." };
  }
  if (!ALLOWED_METHODS.includes(input.paymentMethod)) {
    return { error: "Phương thức thanh toán không hợp lệ." };
  }
  const status: OrderStatus = ALLOWED_STATUS.includes(input.status) ? input.status : "hoan_thanh";

  if (input.paymentMethod === "debt" && !input.customerId) {
    return { error: "Vui lòng chọn khách hàng để ghi nợ." };
  }

  // Khách hàng phải thuộc tổ chức đang thao tác
  let customer: { id: string; name: string; phone: string | null; address: string | null } | null = null;
  if (input.customerId) {
    const { data } = await supabase
      .from("customers")
      .select("id, name, phone, address")
      .eq("id", input.customerId)
      .eq("org_id", orgId)
      .maybeSingle();
    if (!data) return { error: "Không tìm thấy khách hàng này." };
    customer = data;
  }

  // Giá lấy lại từ database — không tin giá gửi từ trình duyệt (trừ admin được quyền sửa giá)
  const productIds = Array.from(new Set(input.items.map((i) => i.productId)));
  const { data: products } = await supabase
    .from("products")
    .select("id, name, sku, pricing_unit, sale_price")
    .eq("org_id", orgId)
    .in("id", productIds)
    .returns<ProductRow[]>();
  const productMap = new Map((products ?? []).map((p) => [p.id, p]));

  const customPrices = new Map<string, number>();
  if (input.customerId) {
    const { data: prices } = await supabase
      .from("customer_prices")
      .select("product_id, price")
      .eq("customer_id", input.customerId)
      .in("product_id", productIds);
    for (const row of prices ?? []) customPrices.set(row.product_id, Number(row.price));
  }

  const lines: Array<{
    productId: string;
    name: string;
    sku: string | null;
    pricingUnit: PricingUnit;
    quantity: number;
    width: number | null;
    height: number | null;
    unitPrice: number;
    lineTotal: number;
  }> = [];

  for (const item of input.items) {
    const product = productMap.get(item.productId);
    if (!product) return { error: "Có sản phẩm không còn tồn tại trong hệ thống. Vui lòng tải lại trang." };

    const quantity = Number(item.quantity);
    if (!Number.isFinite(quantity) || quantity <= 0) {
      return { error: `Số lượng của "${product.name}" không hợp lệ.` };
    }

    let width: number | null = null;
    let height: number | null = null;
    if (product.pricing_unit === "area") {
      width = Number(item.width);
      height = Number(item.height);
      if (!(width > 0) || !(height > 0)) return { error: `Vui lòng nhập đủ dài và rộng cho "${product.name}".` };
    } else if (product.pricing_unit === "length") {
      height = Number(item.height);
      if (!(height > 0)) return { error: `Vui lòng nhập số mét cho "${product.name}".` };
    }

    const listPrice = customPrices.get(product.id) ?? Number(product.sale_price);
    const requested = Number(item.unitPrice);
    const unitPrice = current.isManager && Number.isFinite(requested) && requested >= 0 ? requested : listPrice;

    lines.push({
      productId: product.id,
      name: product.name,
      sku: product.sku,
      pricingUnit: product.pricing_unit,
      quantity,
      width,
      height,
      unitPrice,
      lineTotal: lineTotal({ pricingUnit: product.pricing_unit, quantity, width, height, unitPrice }),
    });
  }

  const subtotal = lines.reduce((sum, l) => sum + l.lineTotal, 0);
  const discount = Math.min(Math.max(Math.round(Number(input.discount) || 0), 0), subtotal);
  const total = subtotal - discount;

  const paymentStatus =
    input.paymentMethod === "cash" || (input.paymentMethod === "qr" && input.transferReceived !== false)
      ? "paid"
      : "unpaid";

  const noteParts: string[] = [];
  if (input.note?.trim()) noteParts.push(input.note.trim());
  if (input.delivery && (input.delivery.name || input.delivery.phone || input.delivery.address)) {
    noteParts.push(
      "Giao hàng: " + [input.delivery.name, input.delivery.phone, input.delivery.address].filter(Boolean).join(" - ")
    );
  }
  const note = noteParts.join("\n") || null;

  let orderId: string | null = null;
  let code = "";
  let createdAt = new Date().toISOString();
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3 && !orderId; attempt++) {
    code = await generateOrderCode(supabase, orgId);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        org_id: orgId,
        code,
        customer_id: input.customerId,
        category_id: input.categoryId,
        status,
        payment_method: input.paymentMethod,
        payment_status: paymentStatus,
        subtotal,
        discount,
        total_amount: total,
        note,
        created_by: current.profile.id,
      })
      .select("id, created_at")
      .single();

    if (data) {
      orderId = data.id;
      createdAt = data.created_at;
    } else {
      lastError = error?.message ?? "Lỗi không xác định";
    }
  }

  if (!orderId) return { error: "Không thể tạo đơn hàng: " + lastError };

  const { error: itemsError } = await supabase.from("order_items").insert(
    lines.map((l) => ({
      order_id: orderId,
      product_id: l.productId,
      product_name: l.name,
      unit_price: l.unitPrice,
      quantity: l.quantity,
      width: l.width,
      height: l.height,
      line_total: l.lineTotal,
    }))
  );

  if (itemsError) {
    // Không để lại đơn rỗng nếu lưu sản phẩm bị lỗi
    await supabase.from("orders").delete().eq("id", orderId);
    return { error: "Lỗi thêm sản phẩm vào đơn: " + itemsError.message };
  }

  const cashGiven = input.paymentMethod === "cash" && Number(input.cashGiven) > 0 ? Number(input.cashGiven) : null;

  return {
    orderId,
    receipt: {
      code,
      createdAt,
      cashier: current.profile.display_name || "—",
      statusLabel: ORDER_STATUS_LABEL[status],
      customerName: customer?.name ?? null,
      customerPhone: customer?.phone ?? null,
      customerAddress: input.delivery?.address || customer?.address || null,
      lines: lines.map((l) => ({
        name: l.name,
        sku: l.sku,
        pricingUnit: l.pricingUnit,
        quantity: l.quantity,
        width: l.width,
        height: l.height,
        unitPrice: l.unitPrice,
        lineTotal: l.lineTotal,
      })),
      subtotal,
      discount,
      total,
      paymentMethod: input.paymentMethod,
      paymentStatus,
      cashGiven,
      note,
    },
  };
}
