import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Điểm "ping giữ sống": gọi vào đây sẽ chạm nhẹ vào database để Supabase (gói miễn phí)
// thấy có hoạt động và không tự tạm dừng. Không trả về bất kỳ dữ liệu nào của cửa hàng.
export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createAdminClient();
  const { error } = await supabase.from("organizations").select("id", { count: "exact", head: true });

  if (error) {
    return NextResponse.json({ ok: false }, { status: 503, headers: { "Cache-Control": "no-store" } });
  }
  return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
}
