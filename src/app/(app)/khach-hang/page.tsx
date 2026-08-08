import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { CustomersTable } from "@/components/customers/CustomersTable";
import type { Customer, Product } from "@/types/db";

export default async function CustomersPage() {
  const current = await getCurrentUser();
  const supabase = await createClient();
  const orgId = current!.activeOrgId;

  const [customersRes, debtRes, productsRes] = await Promise.all([
    supabase
      .from("customers")
      .select("*")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .returns<Customer[]>(),
    supabase
      .from("orders")
      .select("customer_id, total_amount")
      .eq("org_id", orgId)
      .eq("payment_method", "debt")
      .eq("payment_status", "unpaid"),
    supabase
      .from("products")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("name")
      .returns<Product[]>(),
  ]);

  const debtByCustomerId = new Map<string, number>();
  for (const o of debtRes.data ?? []) {
    if (!o.customer_id) continue;
    debtByCustomerId.set(o.customer_id, (debtByCustomerId.get(o.customer_id) ?? 0) + Number(o.total_amount));
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Khách hàng</h1>
        <p className="text-sm text-gray-500">Thêm khách hàng mới, quản lý thông tin và nhóm khách hàng.</p>
      </div>
      <CustomersTable
        customers={customersRes.data ?? []}
        isManager={current!.isManager}
        debtByCustomerId={Object.fromEntries(debtByCustomerId)}
        products={productsRes.data ?? []}
      />
    </div>
  );
}
