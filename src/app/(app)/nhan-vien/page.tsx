import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { EmployeesPanel } from "@/components/employees/EmployeesPanel";
import { DelegationsPanel } from "@/components/employees/DelegationsPanel";
import type { Delegation, Profile } from "@/types/db";

export default async function EmployeesPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");

  if (current.profile.role !== "admin") {
    return (
      <div className="bg-white rounded-xl border border-gray-200 p-10 text-center text-sm text-gray-500">
        Chỉ tài khoản admin mới có thể quản lý nhân viên và ủy quyền truy cập.
      </div>
    );
  }

  const supabase = await createClient();
  const orgId = current.profile.org_id;

  const [employeesRes, grantedRes, receivedRes] = await Promise.all([
    supabase.from("profiles").select("*").eq("org_id", orgId).eq("role", "employee").returns<Profile[]>(),
    supabase
      .from("delegations")
      .select("*, organizations!delegations_grantee_org_id_fkey(business_name, owner_email)")
      .eq("owner_org_id", orgId)
      .returns<Delegation[]>(),
    supabase
      .from("delegations")
      .select("*, organizations!delegations_owner_org_id_fkey(business_name, owner_email)")
      .eq("grantee_org_id", orgId)
      .returns<Delegation[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Nhân viên &amp; Ủy quyền</h1>
        <p className="text-sm text-gray-500">Quản lý tối đa 15 tài khoản nhân viên và ủy quyền truy cập giữa các tài khoản admin.</p>
      </div>
      <EmployeesPanel employees={employeesRes.data ?? []} />
      <DelegationsPanel granted={grantedRes.data ?? []} received={receivedRes.data ?? []} />
    </div>
  );
}
