import { CurrentUserGate } from "@/components/CurrentUserGate";
import { TopNav } from "@/components/nav/TopNav";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <CurrentUserGate>
      <div className="min-h-screen flex flex-col">
        <TopNav />
        <main className="flex-1 w-full max-w-[1680px] mx-auto px-3 sm:px-5 py-5">{children}</main>
      </div>
    </CurrentUserGate>
  );
}
