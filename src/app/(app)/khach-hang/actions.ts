"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

export async function createCustomer(formData: FormData) {
  const current = await getCurrentUser();
  if (!current) return { error: "Vui lòng đăng nhập lại." };

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Vui lòng nhập tên khách hàng." };

  const supabase = await createClient();
  const { error } = await supabase.from("customers").insert({
    org_id: current.activeOrgId,
    name,
    phone: String(formData.get("phone") || "").trim() || null,
    email: String(formData.get("email") || "").trim() || null,
    address: String(formData.get("address") || "").trim() || null,
    region: String(formData.get("region") || "").trim() || null,
    group_tag: String(formData.get("groupTag") || "Mới"),
    avatar_url: String(formData.get("avatarUrl") || "").trim() || null,
    notes: String(formData.get("notes") || "").trim() || null,
    created_by: current.profile.id,
  });

  if (error) return { error: "Lỗi thêm khách hàng: " + error.message };
  revalidatePath("/khach-hang");
  return { success: "Đã thêm khách hàng." };
}

export async function updateCustomer(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền sửa thông tin khách hàng." };
  }

  const id = String(formData.get("id") || "");
  const name = String(formData.get("name") || "").trim();
  if (!id || !name) return { error: "Thiếu thông tin khách hàng." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .update({
      name,
      phone: String(formData.get("phone") || "").trim() || null,
      email: String(formData.get("email") || "").trim() || null,
      address: String(formData.get("address") || "").trim() || null,
      region: String(formData.get("region") || "").trim() || null,
      group_tag: String(formData.get("groupTag") || "Mới"),
      avatar_url: String(formData.get("avatarUrl") || "").trim() || null,
      notes: String(formData.get("notes") || "").trim() || null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi cập nhật khách hàng: " + error.message };
  revalidatePath("/khach-hang");
  return { success: "Đã lưu thay đổi." };
}

export async function deleteCustomer(id: string) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền xoá khách hàng." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customers")
    .delete()
    .eq("id", id)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi xoá khách hàng: " + error.message };
  revalidatePath("/khach-hang");
  return { success: "Đã xoá khách hàng." };
}

export async function listCustomerPrices(customerId: string) {
  const current = await getCurrentUser();
  if (!current) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("customer_prices")
    .select("*, products(name, unit)")
    .eq("customer_id", customerId)
    .eq("org_id", current.activeOrgId)
    .order("created_at", { ascending: false });

  return data ?? [];
}

export async function upsertCustomerPrice(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền đặt giá riêng cho khách hàng." };
  }

  const customerId = String(formData.get("customerId") || "");
  const productId = String(formData.get("productId") || "");
  const price = Number(formData.get("price") || 0);

  if (!customerId || !productId || price <= 0) {
    return { error: "Vui lòng chọn sản phẩm và nhập giá hợp lệ." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_prices")
    .upsert(
      {
        org_id: current.activeOrgId,
        customer_id: customerId,
        product_id: productId,
        price,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "customer_id,product_id" }
    );

  if (error) return { error: "Lỗi lưu giá riêng: " + error.message };
  revalidatePath("/khach-hang");
  revalidatePath("/ban-hang");
  return { success: "Đã lưu giá riêng." };
}

export async function deleteCustomerPrice(id: string) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền xoá giá riêng." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("customer_prices")
    .delete()
    .eq("id", id)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi xoá giá riêng: " + error.message };
  revalidatePath("/khach-hang");
  revalidatePath("/ban-hang");
  return { success: "Đã xoá giá riêng." };
}

export type CustomerOrderRow = {
  id: string;
  code: string;
  created_at: string;
  total_amount: number;
  status: string;
  payment_method: string;
  payment_status: string;
};

// Lịch sử mua hàng + công nợ của một khách (tối đa 500 đơn gần nhất).
export async function getCustomerHistory(customerId: string): Promise<CustomerOrderRow[]> {
  const current = await getCurrentUser();
  if (!current) return [];

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("id, code, created_at, total_amount, status, payment_method, payment_status")
    .eq("customer_id", customerId)
    .eq("org_id", current.activeOrgId)
    .order("created_at", { ascending: false })
    .limit(500)
    .returns<CustomerOrderRow[]>();

  return data ?? [];
}
