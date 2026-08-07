import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Queeny Flow — Quản trị & CSKH",
  description: "Ứng dụng quản trị bán hàng, kho, khách hàng và CSKH cho Queeny Flow.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi" className="h-full antialiased">
      <body className="min-h-full flex flex-col bg-gray-50 text-gray-900">{children}</body>
    </html>
  );
}
