import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Cho phép Server Actions (tạo tài khoản, đăng nhập...) hoạt động khi
      // truy cập qua link Cloudflare Tunnel (tự host trên PC), vì domain
      // này đổi mới mỗi lần khởi động lại nên phải dùng wildcard.
      allowedOrigins: ["*.trycloudflare.com"],
    },
  },
};

export default nextConfig;
