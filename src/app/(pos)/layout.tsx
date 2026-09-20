import { CurrentUserGate } from "@/components/CurrentUserGate";

// Màn hình bán hàng chiếm trọn cửa sổ, không có thanh menu quản lý.
export default function PosLayout({ children }: { children: React.ReactNode }) {
  return <CurrentUserGate>{children}</CurrentUserGate>;
}
