import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllRows } from "@/lib/supabase/fetch-all";
import { getCurrentUser } from "@/lib/session";
import { ProductsTable } from "@/components/products/ProductsTable";
import type { Product } from "@/types/db";

export default async function ProductsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const supabase = await createClient();

  const products = await fetchAllRows<Product>((from, to) =>
    supabase
      .from("products")
      .select("*")
      .eq("org_id", current.activeOrgId)
      .order("created_at", { ascending: false })
      .range(from, to)
      .returns<Product[]>()
  );

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold text-gray-800">Hàng hóa</h1>
        <p className="text-sm text-gray-500">Danh mục hàng hóa, giá bán, giá vốn và tồn kho.</p>
      </div>
      <ProductsTable products={products} isManager={current.isManager} />
    </div>
  );
}
