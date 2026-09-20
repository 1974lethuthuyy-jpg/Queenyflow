import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { endOfDayVN, presetRange, startOfDayVN, todayVN } from "@/lib/dates";
import { OrdersTable } from "@/components/orders/OrdersTable";
import type { Order } from "@/types/db";

const ROW_LIMIT = 1000;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<{ from?: string; to?: string; q?: string }>;
}) {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const sp = await searchParams;

  const validDate = (s?: string) => (s && /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null);
  const defaults = presetRange("month", todayVN());
  const from = validDate(sp.from) ?? defaults.from;
  const to = validDate(sp.to) ?? defaults.to;

  const supabase = await createClient();
  const { data } = await supabase
    .from("orders")
    .select("*, customers(name, phone), order_categories(name), profiles(display_name)")
    .eq("org_id", current.activeOrgId)
    .gte("created_at", startOfDayVN(from))
    .lte("created_at", endOfDayVN(to))
    .order("created_at", { ascending: false })
    .limit(ROW_LIMIT)
    .returns<Order[]>();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Hóa đơn / Đơn hàng</h1>
        <p className="text-sm text-gray-500">Tra cứu, lọc và quản lý các đơn đã bán.</p>
      </div>
      <OrdersTable
        key={`${from}_${to}`}
        orders={data ?? []}
        isManager={current.isManager}
        from={from}
        to={to}
        initialQuery={sp.q ?? ""}
        truncated={(data?.length ?? 0) >= ROW_LIMIT}
      />
    </div>
  );
}
