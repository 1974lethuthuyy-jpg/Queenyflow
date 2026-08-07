import { getCurrentUser } from "@/lib/session";
import { SettingsForm } from "@/components/settings/SettingsForm";

export default async function SettingsPage() {
  const current = await getCurrentUser();
  const readOnly = current!.profile.role !== "admin" || current!.activeOrgId !== current!.profile.org_id;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Cài đặt</h1>
        <p className="text-sm text-gray-500">Thông tin cửa hàng và tài khoản ngân hàng nhận thanh toán.</p>
      </div>
      <SettingsForm org={current!.org!} readOnly={readOnly} />
    </div>
  );
}
