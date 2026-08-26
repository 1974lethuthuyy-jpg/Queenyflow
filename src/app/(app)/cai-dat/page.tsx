import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "@/components/settings/SettingsForm";
import { OrderCategoriesPanel } from "@/components/settings/OrderCategoriesPanel";
import { ChangePasswordPanel } from "@/components/settings/ChangePasswordPanel";
import type { OrderCategory } from "@/types/db";

export default async function SettingsPage() {
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const readOnly = current.profile.role !== "admin" || current.activeOrgId !== current.profile.org_id;

  const supabase = await createClient();
  const { data: categories } = await supabase
    .from("order_categories")
    .select("*")
    .eq("org_id", current.activeOrgId)
    .order("name")
    .returns<OrderCategory[]>();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cài đặt</h1>
        <p className="text-sm text-gray-500">Thông tin cửa hàng và tài khoản ngân hàng nhận thanh toán.</p>
      </div>
      <SettingsForm org={current.org!} readOnly={readOnly} />
      <OrderCategoriesPanel categories={categories ?? []} readOnly={!current.isManager} />
      {current.profile.role === "admin" && <ChangePasswordPanel email={current.org!.owner_email} />}
    </div>
  );
}
