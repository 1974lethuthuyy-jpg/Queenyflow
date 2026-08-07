"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";

export async function grantAccess(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin") {
    return { error: "Chỉ tài khoản admin mới có quyền ủy quyền truy cập." };
  }

  const email = String(formData.get("email") || "").trim().toLowerCase();
  if (!email) return { error: "Vui lòng nhập email tài khoản admin muốn cấp quyền." };
  if (email === current.org?.owner_email) {
    return { error: "Không thể tự cấp quyền cho chính tài khoản của bạn." };
  }

  const admin = createAdminClient();
  const { data: targetOrg } = await admin
    .from("organizations")
    .select("id, business_name")
    .eq("owner_email", email)
    .maybeSingle();

  if (!targetOrg) {
    return { error: "Không tìm thấy tài khoản admin nào dùng email này." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("delegations").insert({
    owner_org_id: current.profile.org_id,
    grantee_org_id: targetOrg.id,
  });

  if (error) {
    if (error.message.toLowerCase().includes("duplicate")) {
      return { error: "Tài khoản này đã được cấp quyền truy cập trước đó." };
    }
    return { error: "Lỗi cấp quyền: " + error.message };
  }

  revalidatePath("/nhan-vien");
  return { success: `Đã cấp quyền truy cập cho "${targetOrg.business_name}".` };
}

export async function revokeAccess(delegationId: string) {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin") {
    return { error: "Chỉ tài khoản admin mới có quyền thu hồi ủy quyền." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("delegations")
    .delete()
    .eq("id", delegationId)
    .eq("owner_org_id", current.profile.org_id);

  if (error) return { error: "Lỗi thu hồi quyền: " + error.message };
  revalidatePath("/nhan-vien");
  return { success: "Đã thu hồi quyền truy cập." };
}
