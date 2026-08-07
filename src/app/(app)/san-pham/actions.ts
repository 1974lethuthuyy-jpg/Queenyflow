"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

export async function createProduct(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền thêm sản phẩm." };
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Vui lòng nhập tên sản phẩm." };

  const supabase = await createClient();
  const { error } = await supabase.from("products").insert({
    org_id: current.activeOrgId,
    name,
    sku: String(formData.get("sku") || "").trim() || null,
    category: String(formData.get("category") || "").trim() || null,
    unit: String(formData.get("unit") || "Cái").trim() || "Cái",
    cost_price: Number(formData.get("costPrice") || 0),
    sale_price: Number(formData.get("salePrice") || 0),
    stock_quantity: Number(formData.get("stockQuantity") || 0),
    low_stock_threshold: Number(formData.get("lowStockThreshold") || 10),
    image_url: String(formData.get("imageUrl") || "").trim() || null,
  });

  if (error) return { error: "Lỗi thêm sản phẩm: " + error.message };
  revalidatePath("/san-pham");
  return { success: "Đã thêm sản phẩm." };
}

export async function updateProduct(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền sửa sản phẩm." };
  }

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Thiếu thông tin sản phẩm." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name,
      sku: String(formData.get("sku") || "").trim() || null,
      category: String(formData.get("category") || "").trim() || null,
      unit: String(formData.get("unit") || "Cái").trim() || "Cái",
      cost_price: Number(formData.get("costPrice") || 0),
      sale_price: Number(formData.get("salePrice") || 0),
      stock_quantity: Number(formData.get("stockQuantity") || 0),
      low_stock_threshold: Number(formData.get("lowStockThreshold") || 10),
      image_url: String(formData.get("imageUrl") || "").trim() || null,
      status: String(formData.get("status") || "active"),
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi cập nhật sản phẩm: " + error.message };
  revalidatePath("/san-pham");
  return { success: "Đã lưu thay đổi." };
}

export async function deleteProduct(id: string) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền xoá sản phẩm." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("products")
    .delete()
    .eq("id", id)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi xoá sản phẩm: " + error.message };
  revalidatePath("/san-pham");
  return { success: "Đã xoá sản phẩm." };
}
