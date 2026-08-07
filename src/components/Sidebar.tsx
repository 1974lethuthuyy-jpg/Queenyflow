"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Users,
  ShoppingCart,
  PackagePlus,
  Boxes,
  UserCog,
  BarChart3,
  Settings,
  Crown,
} from "lucide-react";

const NAV_ITEMS = [
  { href: "/", label: "Tổng quan", icon: LayoutDashboard },
  { href: "/khach-hang", label: "Khách hàng", icon: Users },
  { href: "/don-hang", label: "Đơn hàng", icon: ShoppingCart },
  { href: "/san-pham", label: "Sản phẩm", icon: PackagePlus },
  { href: "/kho-hang", label: "Kho hàng", icon: Boxes },
  { href: "/nhan-vien", label: "Nhân viên", icon: UserCog },
  { href: "/bao-cao", label: "Báo cáo", icon: BarChart3 },
  { href: "/cai-dat", label: "Cài đặt", icon: Settings },
];

export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden md:flex md:w-60 md:flex-col bg-[#1e1b3a] text-white min-h-screen sticky top-0">
      <div className="flex items-center gap-2 px-5 py-5 border-b border-white/10">
        <Crown className="text-purple-300" size={26} />
        <div>
          <div className="font-bold text-sm leading-tight">QUEENY FLOW</div>
          <div className="text-[11px] text-purple-200 leading-tight">Quản trị &amp; CSKH</div>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1">
        {NAV_ITEMS.map((item) => {
          const active = pathname === item.href;
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition ${
                active
                  ? "bg-purple-600 text-white font-medium"
                  : "text-purple-100/80 hover:bg-white/10"
              }`}
            >
              <Icon size={18} />
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
