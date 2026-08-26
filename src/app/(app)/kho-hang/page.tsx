import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { InventoryPanel } from "@/components/inventory/InventoryPanel";
import type { InventoryMovement, Product } from "@/types/db";

export default async function InventoryPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const supabase = await createClient();
  const orgId = current.activeOrgId;

  const [productsRes, movementsRes] = await Promise.all([
    supabase.from("products").select("*").eq("org_id", orgId).order("name").returns<Product[]>(),
    supabase
      .from("inventory_movements")
      .select("*, products(name, unit)")
      .eq("org_id", orgId)
      .order("created_at", { ascending: false })
      .limit(100)
      .returns<InventoryMovement[]>(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Kho hàng</h1>
        <p className="text-sm text-gray-500">Theo dõi tồn kho, nhập/xuất kho không giới hạn.</p>
      </div>
      <InventoryPanel products={productsRes.data ?? []} movements={movementsRes.data ?? []} />
    </div>
  );
}
