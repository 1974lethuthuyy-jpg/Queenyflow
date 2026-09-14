import type { NextConfig } from "next";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "");

// Tự host: Supabase ở 127.0.0.1 của máy chủ, trình duyệt ở xa không gọi thẳng
// tới được — cho trình duyệt đi vòng qua app tại /supabase (xem lib/supabase/proxy-url.ts).
const proxySupabase =
  process.env.NEXT_PUBLIC_SUPABASE_PROXY === "1" ||
  /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(supabaseUrl ?? "");

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Cho phép Server Actions (tạo tài khoản, đăng nhập...) hoạt động khi
      // truy cập qua link Cloudflare Tunnel (tự host trên PC), vì domain
      // này đổi mới mỗi lần khởi động lại nên phải dùng wildcard.
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
  async rewrites() {
    if (!proxySupabase || !supabaseUrl) return [];
    return [{ source: "/supabase/:path*", destination: `${supabaseUrl}/:path*` }];
  },
};

export default nextConfig;
