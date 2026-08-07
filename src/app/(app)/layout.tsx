import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/session";
import { CurrentUserProvider } from "@/lib/user-context";
import { Sidebar } from "@/components/Sidebar";
import { Header } from "@/components/Header";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
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
      <div className="flex min-h-screen w-full">
        <Sidebar />
        <div className="flex-1 flex flex-col min-w-0">
          <Header />
          <main className="flex-1 p-6 bg-gray-50">{children}</main>
        </div>
      </div>
    </CurrentUserProvider>
  );
}
