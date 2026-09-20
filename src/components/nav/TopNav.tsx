"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, Crown, LogOut, ShoppingCart, UserRound } from "lucide-react";
import { logout } from "@/app/(auth)/actions";
import { setActiveOrg } from "@/app/(app)/org-actions";
import { useCurrentUser } from "@/lib/user-context";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan" },
  { href: "/san-pham", label: "Hàng hóa" },
  { href: "/kho-hang", label: "Kho hàng" },
  { href: "/don-hang", label: "Đơn hàng" },
  { href: "/khach-hang", label: "Khách hàng" },
  { href: "/nhan-vien", label: "Nhân viên" },
  { href: "/bao-cao", label: "Báo cáo" },
  { href: "/cai-dat", label: "Cài đặt" },
];

export function TopNav() {
  const pathname = usePathname();
  const { profile, activeOrg, isManager, accessibleOrgs, activeOrgId } = useCurrentUser();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (!menuRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-30 print:hidden">
      <div className="bg-white border-b border-gray-200 h-12 px-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <Crown className="text-brand-600" size={24} />
          <div className="leading-tight">
            <div className="font-bold text-sm text-brand-800 tracking-wide">QUEENY FLOW</div>
            <div className="text-[10px] text-gray-400 -mt-0.5">Quản trị &amp; bán hàng</div>
          </div>
        </Link>

        <div className="flex items-center gap-4">
          {accessibleOrgs.length > 1 ? (
            <form action={setActiveOrg}>
              <select
                name="orgId"
                defaultValue={activeOrgId}
                onChange={(e) => e.currentTarget.form?.requestSubmit()}
                className="text-sm font-semibold text-gray-700 bg-transparent border border-gray-200 rounded-md px-2 py-1 focus:outline-none cursor-pointer max-w-52"
              >
                {accessibleOrgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.business_name}
                  </option>
                ))}
              </select>
            </form>
          ) : (
            <span className="hidden sm:inline text-sm font-semibold text-gray-700">{activeOrg.business_name}</span>
          )}

          <div className="relative" ref={menuRef}>
            <button
              onClick={() => setMenuOpen((v) => !v)}
              className="flex items-center gap-2 text-sm text-gray-600 hover:text-brand-700"
            >
              <span className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center">
                <UserRound size={15} />
              </span>
              <span className="hidden sm:block text-left leading-tight">
                <span className="block text-xs font-medium text-gray-700">{profile.display_name || "Tài khoản"}</span>
                <span className="block text-[10px] text-gray-400">
                  {profile.role === "admin" ? "Quản trị viên" : "Nhân viên"}
                  {!isManager && " · chỉ xem / bán hàng"}
                </span>
              </span>
              <ChevronDown size={14} className="text-gray-400" />
            </button>
            {menuOpen && (
              <div className="absolute right-0 mt-2 w-52 bg-white rounded-lg shadow-lg border border-gray-200 py-1 text-sm">
                <Link
                  href="/cai-dat"
                  onClick={() => setMenuOpen(false)}
                  className="block px-4 py-2 text-gray-700 hover:bg-gray-50"
                >
                  Cài đặt &amp; đổi mật khẩu
                </Link>
                <form action={logout}>
                  <button
                    type="submit"
                    className="w-full flex items-center gap-2 px-4 py-2 text-left text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut size={14} /> Đăng xuất
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </div>

      <nav className="bg-brand-600 h-11 px-2 sm:px-4 flex items-center gap-2 text-white">
        <div className="flex-1 min-w-0 flex items-center gap-1 overflow-x-auto">
          {NAV_ITEMS.map((item) => {
            const active = item.href === "/" ? pathname === "/" : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`px-3.5 py-2 rounded-md text-sm font-medium whitespace-nowrap transition ${
                  active ? "bg-brand-800" : "hover:bg-white/10"
                }`}
              >
                {item.label}
              </Link>
            );
          })}
        </div>
        <Link
          href="/ban-hang"
          className="shrink-0 flex items-center gap-2 bg-white text-brand-700 hover:bg-brand-50 font-semibold text-sm rounded-md px-4 py-1.5"
        >
          <ShoppingCart size={16} /> Bán hàng
        </Link>
      </nav>
    </header>
  );
}
