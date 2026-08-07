"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

export async function recordMovement(formData: FormData) {
  const current = await getCurrentUser();
  if (!current) return { error: "Vui lòng đăng nhập lại." };

  const productId = String(formData.get("productId") || "");
  const type = String(formData.get("type") || "");
  const quantity = Number(formData.get("quantity") || 0);
  const note = String(formData.get("note") || "").trim() || null;

  if (!productId || (type !== "in" && type !== "out") || quantity <= 0) {
    return { error: "Vui lòng nhập đầy đủ thông tin nhập/xuất kho hợp lệ." };
  }

  const supabase = await createClient();

  if (type === "out") {
    const { data: product } = await supabase
      .from("products")
      .select("stock_quantity")
      .eq("id", productId)
      .single();
    if (product && Number(product.stock_quantity) < quantity) {
      return { error: "Số lượng xuất kho vượt quá tồn kho hiện có." };
    }
  }

  const { error } = await supabase.from("inventory_movements").insert({
    org_id: current.activeOrgId,
    product_id: productId,
    type,
    quantity,
    note,
    created_by: current.profile.id,
  });

  if (error) return { error: "Lỗi ghi nhận kho: " + error.message };
  revalidatePath("/kho-hang");
  revalidatePath("/san-pham");
  return { success: type === "in" ? "Đã nhập kho." : "Đã xuất kho." };
}
