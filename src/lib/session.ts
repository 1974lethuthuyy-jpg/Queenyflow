import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/db";

// `cache` giúp layout và trang cùng dùng chung kết quả trong một lần tải trang (trước đây mỗi nơi tự hỏi lại
// database), và hai truy vấn hồ sơ / danh sách tổ chức chạy song song để bớt độ trễ khi database ở xa.
export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const [{ data: profile }, { data: accessibleOrgs }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", auth.user.id).single<Profile>(),
    // Danh sách tổ chức mà user này có thể truy cập (chính mình + được ủy quyền).
    // RLS trên bảng organizations tự lọc theo accessible_org_ids().
    supabase.from("organizations").select("*").returns<Organization[]>(),
  ]);

  if (!profile) return null;

  // Tổ chức của chính user đã nằm trong danh sách truy cập; chỉ hỏi thêm nếu vì lý do nào đó không thấy.
  let org: Organization | null = accessibleOrgs?.find((o) => o.id === profile.org_id) ?? null;
  if (!org) {
    const { data } = await supabase.from("organizations").select("*").eq("id", profile.org_id).single<Organization>();
    org = data;
  }

  const cookieStore = await cookies();
  const requestedOrgId = cookieStore.get("active_org_id")?.value;
  const activeOrgId =
    requestedOrgId && accessibleOrgs?.some((o) => o.id === requestedOrgId)
      ? requestedOrgId
      : profile.org_id;

  const activeOrg =
    accessibleOrgs?.find((o) => o.id === activeOrgId) ?? org ?? null;

  let isManager = profile.role === "admin" && activeOrgId === profile.org_id;
  if (profile.role === "admin" && activeOrgId !== profile.org_id) {
    const { data: canManage } = await supabase.rpc("can_manage", {
      target_org: activeOrgId,
    });
    isManager = Boolean(canManage);
  }

  return {
    authUser: auth.user,
    profile,
    org,
    accessibleOrgs: accessibleOrgs ?? [],
    activeOrgId,
    activeOrg,
    isManager,
  };
});
