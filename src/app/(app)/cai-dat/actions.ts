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
