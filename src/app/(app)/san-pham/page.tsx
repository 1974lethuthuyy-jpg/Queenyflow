import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { ProductsTable } from "@/components/products/ProductsTable";
import type { Product } from "@/types/db";

export default async function ProductsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const supabase = await createClient();

  const { data } = await supabase
    .from("products")
    .select("*")
    .eq("org_id", current.activeOrgId)
    .order("created_at", { ascending: false })
    .returns<Product[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Sản phẩm</h1>
        <p className="text-sm text-gray-500">Quản lý danh sách sản phẩm, giá bán và tồn kho.</p>
      </div>
      <ProductsTable products={data ?? []} isManager={current.isManager} />
    </div>
  );
}
