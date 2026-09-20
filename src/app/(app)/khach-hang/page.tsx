import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getCurrentUser } from "@/lib/session";
import { CustomersTable } from "@/components/customers/CustomersTable";
import type { Customer, Product } from "@/types/db";

type OrderTotal = { customer_id: string | null; total_amount: number; status: string; payment_method: string; payment_status: string };

export default async function CustomersPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const supabase = await createClient();
  const orgId = current.activeOrgId;

  const [customers, orders, productsRes] = await Promise.all([
    fetchAllRows<Customer>((from, to) =>
      supabase.from("customers").select("*").eq("org_id", orgId).order("created_at", { ascending: false }).range(from, to).returns<Customer[]>()
    ),
    fetchAllRows<OrderTotal>((from, to) =>
      supabase
        .from("orders")
        .select("customer_id, total_amount, status, payment_method, payment_status")
        .eq("org_id", orgId)
        .not("customer_id", "is", null)
        .range(from, to)
        .returns<OrderTotal[]>()
    ),
    supabase.from("products").select("*").eq("org_id", orgId).eq("status", "active").order("name").returns<Product[]>(),
  ]);

  // Công nợ = đơn ghi nợ chưa thu (không tính đơn đã hủy); Tổng bán = mọi đơn không hủy
  const debtByCustomerId: Record<string, number> = {};
  const soldByCustomerId: Record<string, number> = {};
  for (const o of orders) {
    if (!o.customer_id || o.status === "da_huy") continue;
    soldByCustomerId[o.customer_id] = (soldByCustomerId[o.customer_id] ?? 0) + Number(o.total_amount);
    if (o.payment_method === "debt" && o.payment_status === "unpaid") {
      debtByCustomerId[o.customer_id] = (debtByCustomerId[o.customer_id] ?? 0) + Number(o.total_amount);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Khách hàng</h1>
        <p className="text-sm text-gray-500">Thông tin khách, nhóm khách, công nợ và giá riêng.</p>
      </div>
      <CustomersTable
        customers={customers}
        isManager={current.isManager}
        debtByCustomerId={debtByCustomerId}
        soldByCustomerId={soldByCustomerId}
        products={productsRes.data ?? []}
      />
    </div>
  );
}
