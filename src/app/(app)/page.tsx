import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { StatCard } from "@/components/ui/StatCard";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL, type Order, type Product } from "@/types/db";
import { Wallet, ShoppingCart, Users, AlertTriangle } from "lucide-react";
import Link from "next/link";

type DebtOrder = {
  id: string;
  total_amount: number;
  customer_id: string | null;
  customers: { name: string } | null;
};

export default async function DashboardPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const orgId = current.activeOrgId;
  const supabase = await createClient();

  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [ordersRes, customersRes, productsRes, recentOrdersRes, debtOrdersRes] = await Promise.all([
    supabase
      .from("orders")
      .select("id, total_amount, status, payment_method, payment_status, created_at")
      .eq("org_id", orgId)
      .gte("created_at", startOfMonth.toISOString())
      .returns<Order[]>(),
    supabase
      .from("customers")
      .select("id, created_at")
      .eq("org_id", orgId)
      .gte("created_at", startOfMonth.toISOString()),
    supabase
      .from("products")
      .select("id, name, stock_quantity, low_stock_threshold")
      .eq("org_id", orgId)
      .returns<Product[]>(),
    supabase
      .from("orders")
      .select("id, code, status, total_amount, created_at, customers(name)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(5),
    // Công nợ tính trên TOÀN BỘ đơn ghi nợ chưa thu, không giới hạn theo tháng.
    supabase
      .from("orders")
      .select("id, total_amount, customer_id, customers(name)")
      .eq("org_id", orgId)
      .eq("payment_method", "debt")
      .eq("payment_status", "unpaid")
      .returns<DebtOrder[]>(),
  ]);

  const orders = ordersRes.data ?? [];
  const revenue = orders
    .filter((o) => o.status !== "da_huy")
    .reduce((sum, o) => sum + Number(o.total_amount), 0);
  const lowStockProducts = (productsRes.data ?? []).filter(
    (p) => Number(p.stock_quantity) <= Number(p.low_stock_threshold)
  );

  const debtOrders = debtOrdersRes.data ?? [];
  const totalDebt = debtOrders.reduce((sum, o) => sum + Number(o.total_amount), 0);

  const debtByCustomer = new Map<string, { name: string; amount: number }>();
  for (const o of debtOrders) {
    const key = o.customer_id ?? "unknown";
    const name = o.customers?.name ?? "Khách vãng lai";
    const prev = debtByCustomer.get(key);
    debtByCustomer.set(key, { name, amount: (prev?.amount ?? 0) + Number(o.total_amount) });
  }
  const topDebtors = Array.from(debtByCustomer.values())
    .sort((a, b) => b.amount - a.amount)
    .slice(0, 5);
  const maxDebtorAmount = topDebtors[0]?.amount ?? 0;

  const recentOrders = (recentOrdersRes.data ?? []) as unknown as Array<{
    id: string;
    code: string;
    status: Order["status"];
    total_amount: number;
    created_at: string;
    customers: { name: string } | null;
  }>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tổng quan</h1>
        <p className="text-sm text-gray-500">Số liệu trong tháng {new Date().getMonth() + 1}/{new Date().getFullYear()}</p>
      </div>

      <div className="flex flex-wrap gap-4">
        <StatCard icon={Wallet} label="Doanh thu tháng này" value={formatCurrency(revenue)} color="purple" />
        <StatCard icon={ShoppingCart} label="Đơn hàng tháng này" value={String(orders.length)} color="blue" />
        <StatCard icon={Users} label="Khách hàng mới" value={String(customersRes.data?.length ?? 0)} color="green" />
        <StatCard icon={Wallet} label="Tổng công nợ chưa thu" value={formatCurrency(totalDebt)} color="orange" />
        <StatCard icon={AlertTriangle} label="Sản phẩm sắp hết hàng" value={String(lowStockProducts.length)} color="pink" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Đơn hàng gần đây</h2>
            <Link href="/don-hang" className="text-xs text-brand-600 font-medium">
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {recentOrders.length === 0 && (
              <p className="text-sm text-gray-400 py-4">Chưa có đơn hàng nào.</p>
            )}
            {recentOrders.map((o) => (
              <div key={o.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <div className="font-medium text-gray-700">{o.code}</div>
                  <div className="text-xs text-gray-400">
                    {o.customers?.name ?? "Khách vãng lai"} · {formatDateTime(o.created_at)}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-semibold text-gray-800">{formatCurrency(o.total_amount)}</div>
                  <Badge color="purple">{ORDER_STATUS_LABEL[o.status]}</Badge>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Công nợ theo khách hàng</h2>
            <Link href="/khach-hang" className="text-xs text-brand-600 font-medium">
              Xem tất cả
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {topDebtors.length === 0 && (
              <p className="text-sm text-gray-400 py-4">Không có công nợ nào chưa thu.</p>
            )}
            {topDebtors.map((d) => (
              <div key={d.name} className="py-2.5 text-sm">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-gray-700">{d.name}</span>
                  <span className="font-semibold text-orange-600">{formatCurrency(d.amount)}</span>
                </div>
                <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-orange-500 rounded-full"
                    style={{ width: `${maxDebtorAmount ? (d.amount / maxDebtorAmount) * 100 : 0}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="font-semibold text-gray-800">Sản phẩm sắp hết hàng</h2>
            <Link href="/kho-hang" className="text-xs text-brand-600 font-medium">
              Xem kho hàng
            </Link>
          </div>
          <div className="divide-y divide-gray-100">
            {lowStockProducts.length === 0 && (
              <p className="text-sm text-gray-400 py-4">Không có sản phẩm nào sắp hết hàng.</p>
            )}
            {lowStockProducts.slice(0, 6).map((p) => (
              <div key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                <span className="text-gray-700">{p.name}</span>
                <Badge color="orange">Còn {p.stock_quantity}</Badge>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
