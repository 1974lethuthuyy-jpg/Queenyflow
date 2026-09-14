// Khi tự host trên PC, Supabase chạy ở 127.0.0.1 của máy chủ. Trình duyệt của
// người dùng ở xa (vào qua link công khai) không gọi thẳng tới địa chỉ đó được,
// nên các request từ trình duyệt đi vòng qua chính app tại đường dẫn này
// (xem rewrites trong next.config.ts).
export const SUPABASE_PROXY_PATH = "/supabase";

function isLocalHost(url: string | undefined) {
  if (!url) return false;
  try {
    const host = new URL(url).hostname;
    return host === "127.0.0.1" || host === "localhost";
  } catch {
    return false;
  }
}

export function shouldProxySupabase() {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_PROXY === "1" ||
    isLocalHost(process.env.NEXT_PUBLIC_SUPABASE_URL)
  );
}

// Link ảnh cũ đã lưu dạng http://127.0.0.1:54321/storage/... chỉ xem được trên
// chính máy chủ — đổi sang đường dẫn tương đối để xem được qua mọi tên miền.
export function toDisplayImageUrl(url: string | null | undefined) {
  if (!url) return "";
  const match = url.match(/^https?:\/\/(?:127\.0\.0\.1|localhost):\d+(\/storage\/.*)$/);
  return match ? `${SUPABASE_PROXY_PATH}${match[1]}` : url;
}
