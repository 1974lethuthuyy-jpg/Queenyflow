import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { PosScreen } from "@/components/pos/PosScreen";
import type { Customer, OrderCategory, Product } from "@/types/db";

export const metadata = { title: "Bán hàng — Queeny Flow" };

export default async function PosPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const orgId = current.activeOrgId;
  const supabase = await createClient();

  const [productsRes, customersRes, categoriesRes, pricesRes, debtRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("name")
      .returns<Product[]>(),
    supabase.from("customers").select("*").eq("org_id", orgId).order("name").returns<Customer[]>(),
    supabase.from("order_categories").select("*").eq("org_id", orgId).order("name").returns<OrderCategory[]>(),
    supabase.from("customer_prices").select("customer_id, product_id, price").eq("org_id", orgId),
    supabase
      .from("orders")
      .select("customer_id, total_amount")
      .eq("org_id", orgId)
      .eq("payment_method", "debt")
      .eq("payment_status", "unpaid")
      .neq("status", "da_huy"),
  ]);

  const customerPrices: Record<string, Record<string, number>> = {};
  for (const row of pricesRes.data ?? []) {
    (customerPrices[row.customer_id] ??= {})[row.product_id] = Number(row.price);
  }

  const debtByCustomerId: Record<string, number> = {};
  for (const row of debtRes.data ?? []) {
    if (!row.customer_id) continue;
    debtByCustomerId[row.customer_id] = (debtByCustomerId[row.customer_id] ?? 0) + Number(row.total_amount);
  }

  return (
    <PosScreen
      products={productsRes.data ?? []}
      customers={customersRes.data ?? []}
      categories={categoriesRes.data ?? []}
      customerPrices={customerPrices}
      debtByCustomerId={debtByCustomerId}
    />
  );
}
