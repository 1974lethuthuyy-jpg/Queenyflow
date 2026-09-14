import { createBrowserClient } from "@supabase/ssr";
import { SUPABASE_PROXY_PATH, shouldProxySupabase } from "./proxy-url";

export function createClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  if (shouldProxySupabase() && typeof window !== "undefined") {
    // Giữ tên cookie phiên đăng nhập theo URL gốc để khớp với cookie phía server.
    const cookieName = `sb-${new URL(url).hostname.split(".")[0]}-auth-token`;
    return createBrowserClient(`${window.location.origin}${SUPABASE_PROXY_PATH}`, key, {
      cookieOptions: { name: cookieName },
    });
  }

  return createBrowserClient(url, key);
}
