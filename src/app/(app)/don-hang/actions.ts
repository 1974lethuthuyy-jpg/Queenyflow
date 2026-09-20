"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import type { OrderStatus } from "@/types/db";

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
