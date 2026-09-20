import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { CurrentUserProvider } from "@/lib/user-context";

// Kiểm tra đã đăng nhập (nếu chưa thì chuyển về trang đăng nhập) và cấp thông tin người dùng cho mọi component con.
export async function CurrentUserGate({ children }: { children: React.ReactNode }) {
  const current = await getCurrentUser();

  if (!current || !current.org || !current.activeOrg) {
    redirect("/dang-nhap");
  }

  const { profile, org, accessibleOrgs, activeOrgId, activeOrg, isManager } = current;

  return (
    <CurrentUserProvider
      value={{
        profile,
        org: org!,
        isAdmin: profile.role === "admin",
        accessibleOrgs,
        activeOrgId,
        activeOrg: activeOrg!,
        isManager,
      }}
    >
      {children}
    </CurrentUserProvider>
  );
}
