import { createClient as createSupabaseClient } from "@supabase/supabase-js";

// Client dùng service role key — CHỈ dùng trong server actions / route handlers,
// không bao giờ import vào code chạy ở client.
export function createAdminClient() {
  return createSupabaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
