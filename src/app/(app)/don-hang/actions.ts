"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import type { OrderStatus, PaymentMethod } from "@/types/db";

type OrderItemInput = {
  productId: string | null;
  name: string;
  unitPrice: number;
  quantity: number;
};

async function generateOrderCode(
  supabase: Awaited<ReturnType<typeof createClient>>,
  orgId: string
) {
  const now = new Date();
  const prefix = `DH${String(now.getFullYear()).slice(2)}${String(now.getMonth() + 1).padStart(
    2,
    "0"
  )}${String(now.getDate()).padStart(2, "0")}`;

  const startOfDay = new Date(now);
  startOfDay.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("orders")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .gte("created_at", startOfDay.toISOString());

  return `${prefix}-${String((count ?? 0) + 1).padStart(3, "0")}`;
}

export async function createOrder(formData: FormData) {
  const current = await getCurrentUser();
  if (!current) return { error: "Vui lòng đăng nhập lại." };

  const customerId = String(formData.get("customerId") || "").trim() || null;
  const paymentMethod = String(formData.get("paymentMethod") || "cash") as PaymentMethod;
  const discount = Number(formData.get("discount") || 0);
  const note = String(formData.get("note") || "").trim() || null;
  const categoryId = String(formData.get("categoryId") || "").trim() || null;
  const itemsRaw = String(formData.get("items") || "[]");

  let items: OrderItemInput[] = [];
  try {
    items = JSON.parse(itemsRaw);
  } catch {
    return { error: "Dữ liệu sản phẩm không hợp lệ." };
  }

  if (!Array.isArray(items) || items.length === 0) {
    return { error: "Vui lòng thêm ít nhất một sản phẩm vào đơn hàng." };
  }
  if (!["qr", "cash", "debt"].includes(paymentMethod)) {
    return { error: "Phương thức thanh toán không hợp lệ." };
  }

  const subtotal = items.reduce((sum, it) => sum + it.unitPrice * it.quantity, 0);
  const total = Math.max(0, subtotal - discount);

  const supabase = await createClient();

  let orderId: string | null = null;
  let lastError: string | null = null;

  for (let attempt = 0; attempt < 3 && !orderId; attempt++) {
    const code = await generateOrderCode(supabase, current.activeOrgId);
    const { data, error } = await supabase
      .from("orders")
      .insert({
        org_id: current.activeOrgId,
        code,
        customer_id: customerId,
        category_id: categoryId,
        status: "cho_xac_nhan",
        payment_method: paymentMethod,
        payment_status: paymentMethod === "cash" ? "paid" : "unpaid",
        subtotal,
        discount,
        total_amount: total,
        note,
        created_by: current.profile.id,
      })
      .select("id")
      .single();

    if (data) {
      orderId = data.id;
    } else {
      lastError = error?.message ?? "Lỗi không xác định";
    }
  }

  if (!orderId) {
    return { error: "Không thể tạo đơn hàng: " + lastError };
  }

  const { error: itemsError } = await supabase.from("order_items").insert(
    items.map((it) => ({
      order_id: orderId,
      product_id: it.productId,
      product_name: it.name,
      unit_price: it.unitPrice,
      quantity: it.quantity,
      line_total: it.unitPrice * it.quantity,
    }))
  );

  if (itemsError) {
    return { error: "Lỗi thêm sản phẩm vào đơn: " + itemsError.message };
  }

  revalidatePath("/don-hang");
  revalidatePath("/kho-hang");
  revalidatePath("/san-pham");
  redirect(`/don-hang/${orderId}`);
}

export async function updateOrderStatus(orderId: string, status: OrderStatus) {
  const current = await getCurrentUser();
  if (!current) return { error: "Vui lòng đăng nhập lại." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ status, updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi cập nhật trạng thái: " + error.message };
  revalidatePath("/don-hang");
  revalidatePath(`/don-hang/${orderId}`);
  return { success: "Đã cập nhật trạng thái đơn hàng." };
}

export async function markOrderPaid(orderId: string) {
  const current = await getCurrentUser();
  if (!current) return { error: "Vui lòng đăng nhập lại." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .update({ payment_status: "paid", updated_at: new Date().toISOString() })
    .eq("id", orderId)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi cập nhật thanh toán: " + error.message };
  revalidatePath("/don-hang");
  revalidatePath(`/don-hang/${orderId}`);
  return { success: "Đã xác nhận thanh toán." };
}

export async function deleteOrder(orderId: string) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền xoá đơn hàng." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("orders")
    .delete()
    .eq("id", orderId)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi xoá đơn hàng: " + error.message };
  revalidatePath("/don-hang");
  return { success: "Đã xoá đơn hàng." };
}
