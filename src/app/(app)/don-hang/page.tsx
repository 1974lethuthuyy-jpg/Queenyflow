import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { OrdersTable } from "@/components/orders/OrdersTable";
import type { Order } from "@/types/db";

export default async function OrdersPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const supabase = await createClient();

  const { data } = await supabase
    .from("orders")
    .select("*, customers(name), order_categories(name)")
    .eq("org_id", current.activeOrgId)
    .order("created_at", { ascending: false })
    .returns<Order[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Đơn hàng</h1>
        <p className="text-sm text-gray-500">Tạo và quản lý đơn hàng, hóa đơn và thanh toán.</p>
      </div>
      <OrdersTable orders={data ?? []} isManager={current.isManager} />
    </div>
  );
}
