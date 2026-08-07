import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import type { Organization, Profile } from "@/types/db";

export async function getCurrentUser() {
  const supabase = await createClient();
  const { data: auth } = await supabase.auth.getUser();
  if (!auth.user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", auth.user.id)
    .single<Profile>();

  if (!profile) return null;

  const { data: org } = await supabase
    .from("organizations")
    .select("*")
    .eq("id", profile.org_id)
    .single<Organization>();

  // Danh sách tổ chức mà user này có thể truy cập (chính mình + được ủy quyền).
  // RLS trên bảng organizations tự lọc theo accessible_org_ids().
  const { data: accessibleOrgs } = await supabase
    .from("organizations")
    .select("*")
    .returns<Organization[]>();

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
}
