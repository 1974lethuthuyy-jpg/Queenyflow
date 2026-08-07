"use client";

import { LogOut } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { setActiveOrg } from "@/app/(app)/org-actions";
import { useCurrentUser } from "@/lib/user-context";

export function Header() {
  const { profile, activeOrg, isManager, accessibleOrgs, activeOrgId } = useCurrentUser();

  return (
    <header className="flex items-center justify-between bg-white border-b border-gray-200 px-6 py-3 sticky top-0 z-10">
      <div>
        {accessibleOrgs.length > 1 ? (
          <form action={setActiveOrg} className="inline-block">
            <select
              name="orgId"
              defaultValue={activeOrgId}
              onChange={(e) => e.currentTarget.form?.requestSubmit()}
              className="text-sm font-semibold text-gray-800 border-none bg-transparent focus:outline-none cursor-pointer"
            >
              {accessibleOrgs.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.business_name}
                </option>
              ))}
            </select>
          </form>
        ) : (
          <div className="text-sm font-semibold text-gray-800">{activeOrg.business_name}</div>
        )}
        <div className="text-xs text-gray-400">
          {profile.role === "admin" ? "Quản trị viên" : "Nhân viên"} · {profile.display_name}
          {!isManager && <span className="ml-1 text-amber-600">(chỉ xem / lên đơn)</span>}
        </div>
      </div>
      <form action={logout}>
        <button
          type="submit"
          className="flex items-center gap-2 text-sm text-gray-500 hover:text-red-600 transition"
        >
          <LogOut size={16} />
          Đăng xuất
        </button>
      </form>
    </header>
  );
}
