"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

export async function setActiveOrg(formData: FormData) {
  const orgId = String(formData.get("orgId") || "");
  if (!orgId) return;
  const cookieStore = await cookies();
  cookieStore.set("active_org_id", orgId, { path: "/", maxAge: 60 * 60 * 24 * 30 });
  redirect("/");
}
