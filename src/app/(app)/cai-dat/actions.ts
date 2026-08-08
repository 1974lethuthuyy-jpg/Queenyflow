"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";

export async function updateOrgSettings(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin" || current.activeOrgId !== current.profile.org_id) {
    return { error: "Chỉ chủ tài khoản admin mới có quyền chỉnh sửa cài đặt tổ chức của mình." };
  }

  const businessName = String(formData.get("businessName") || "").trim();
  const bankBin = String(formData.get("bankBin") || "").trim() || null;
  const bankAccountNumber = String(formData.get("bankAccountNumber") || "").trim() || null;
  const bankAccountName = String(formData.get("bankAccountName") || "").trim() || null;

  if (!businessName) return { error: "Vui lòng nhập tên cửa hàng." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("organizations")
    .update({
      business_name: businessName,
      bank_bin: bankBin,
      bank_account_number: bankAccountNumber,
      bank_account_name: bankAccountName,
    })
    .eq("id", current.profile.org_id);

  if (error) return { error: "Lỗi lưu cài đặt: " + error.message };
  revalidatePath("/cai-dat");
  return { success: "Đã lưu cài đặt." };
}

export async function createOrderCategory(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền tạo loại đơn hàng." };
  }

  const name = String(formData.get("name") || "").trim();
  if (!name) return { error: "Vui lòng nhập tên loại đơn hàng." };

  const supabase = await createClient();
  const { error } = await supabase.from("order_categories").insert({
    org_id: current.activeOrgId,
    name,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { error: "Loại đơn hàng này đã tồn tại." };
    }
    return { error: "Lỗi tạo loại đơn hàng: " + error.message };
  }

  revalidatePath("/cai-dat");
  revalidatePath("/don-hang/moi");
  return { success: "Đã tạo loại đơn hàng." };
}

export async function deleteOrderCategory(id: string) {
  const current = await getCurrentUser();
  if (!current || !current.isManager) {
    return { error: "Chỉ tài khoản admin mới có quyền xoá loại đơn hàng." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("order_categories")
    .delete()
    .eq("id", id)
    .eq("org_id", current.activeOrgId);

  if (error) return { error: "Lỗi xoá loại đơn hàng: " + error.message };
  revalidatePath("/cai-dat");
  revalidatePath("/don-hang/moi");
  return { success: "Đã xoá loại đơn hàng." };
}
