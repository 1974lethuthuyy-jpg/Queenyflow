import { redirect } from "next/navigation";

// Trang tạo đơn cũ đã được thay bằng màn hình bán hàng (POS).
export default function NewOrderPage() {
  redirect("/ban-hang");
}
