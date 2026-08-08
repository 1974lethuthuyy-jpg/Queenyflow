import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { OrderForm } from "@/components/orders/OrderForm";
import type { Customer, CustomerPrice, OrderCategory, Product } from "@/types/db";

export default async function NewOrderPage() {
  const current = await getCurrentUser();
  const supabase = await createClient();
  const orgId = current!.activeOrgId;

  const [productsRes, customersRes, categoriesRes, customerPricesRes] = await Promise.all([
    supabase
      .from("products")
      .select("*")
      .eq("org_id", orgId)
      .eq("status", "active")
      .order("name")
      .returns<Product[]>(),
    supabase.from("customers").select("*").eq("org_id", orgId).order("name").returns<Customer[]>(),
    supabase.from("order_categories").select("*").eq("org_id", orgId).order("name").returns<OrderCategory[]>(),
    supabase.from("customer_prices").select("*").eq("org_id", orgId).returns<CustomerPrice[]>(),
  ]);

  const customerPrices: Record<string, Record<string, number>> = {};
  for (const cp of customerPricesRes.data ?? []) {
    if (!customerPrices[cp.customer_id]) customerPrices[cp.customer_id] = {};
    customerPrices[cp.customer_id][cp.product_id] = Number(cp.price);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Tạo đơn hàng</h1>
        <p className="text-sm text-gray-500">Chọn sản phẩm, khách hàng và phương thức thanh toán.</p>
      </div>
      {(productsRes.data ?? []).length === 0 ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          Bạn chưa có sản phẩm nào đang kinh doanh. Vui lòng thêm sản phẩm trước khi tạo đơn hàng.
        </div>
      ) : (
        <OrderForm
          products={productsRes.data ?? []}
          customers={customersRes.data ?? []}
          categories={categoriesRes.data ?? []}
          customerPrices={customerPrices}
        />
      )}
    </div>
  );
}
