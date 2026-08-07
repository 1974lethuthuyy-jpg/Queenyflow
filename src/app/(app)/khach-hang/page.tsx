import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { CustomersTable } from "@/components/customers/CustomersTable";
import type { Customer } from "@/types/db";

export default async function CustomersPage() {
  const current = await getCurrentUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("customers")
    .select("*")
    .eq("org_id", current!.activeOrgId)
    .order("created_at", { ascending: false })
    .returns<Customer[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Khách hàng</h1>
        <p className="text-sm text-gray-500">Thêm khách hàng mới, quản lý thông tin và nhóm khách hàng.</p>
      </div>
      <CustomersTable customers={data ?? []} isManager={current!.isManager} />
    </div>
  );
}
