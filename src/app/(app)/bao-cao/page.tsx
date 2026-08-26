import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { StatCard } from "@/components/ui/StatCard";
import { RevenueChart, type MonthlyStat } from "@/components/reports/RevenueChart";
import { formatCurrency } from "@/lib/format";
import { Wallet, TrendingUp, ShoppingCart } from "lucide-react";

type OrderItemWithProduct = {
  quantity: number;
  unit_price: number;
  product_id: string | null;
  products: { cost_price: number } | null;
};

type OrderRow = {
  id: string;
  total_amount: number;
  created_at: string;
  status: string;
  order_items: OrderItemWithProduct[];
};

export default async function ReportsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const supabase = await createClient();
  const orgId = current.activeOrgId;

  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
  sixMonthsAgo.setDate(1);
  sixMonthsAgo.setHours(0, 0, 0, 0);

  const { data } = await supabase
    .from("orders")
    .select("id, total_amount, created_at, status, order_items(quantity, unit_price, product_id, products(cost_price))")
    .eq("org_id", orgId)
    .neq("status", "da_huy")
    .gte("created_at", sixMonthsAgo.toISOString())
    .returns<OrderRow[]>();

  const orders = data ?? [];

  const monthlyMap = new Map<string, MonthlyStat>();
  for (let i = 0; i < 6; i++) {
    const d = new Date(sixMonthsAgo);
    d.setMonth(d.getMonth() + i);
    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
    monthlyMap.set(key, { month: `Th.${d.getMonth() + 1}`, revenue: 0, profit: 0 });
  }

  for (const order of orders) {
    const d = new Date(order.created_at);
    const key = `${d.getMonth() + 1}/${d.getFullYear()}`;
    const bucket = monthlyMap.get(key);
    if (!bucket) continue;
    bucket.revenue += Number(order.total_amount);
    for (const item of order.order_items ?? []) {
      const cost = Number(item.products?.cost_price ?? 0) * Number(item.quantity);
      bucket.profit += Number(item.unit_price) * Number(item.quantity) - cost;
    }
  }

  const monthlyStats = Array.from(monthlyMap.values());
  const totalRevenue = monthlyStats.reduce((s, m) => s + m.revenue, 0);
  const totalProfit = monthlyStats.reduce((s, m) => s + m.profit, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Báo cáo doanh thu &amp; lợi nhuận</h1>
        <p className="text-sm text-gray-500">Thống kê tự động theo tháng, dựa trên đơn hàng không bị hủy.</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard icon={Wallet} label="Doanh thu 6 tháng" value={formatCurrency(totalRevenue)} color="purple" />
        <StatCard icon={TrendingUp} label="Lợi nhuận 6 tháng" value={formatCurrency(totalProfit)} color="green" />
        <StatCard icon={ShoppingCart} label="Số đơn hàng" value={String(orders.length)} color="blue" />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Doanh thu &amp; lợi nhuận theo tháng</h2>
        <RevenueChart data={monthlyStats} />
      </div>
    </div>
  );
}
