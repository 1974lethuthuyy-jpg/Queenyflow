"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { createPosOrderRecord, type PosOrderInput, type PosOrderResult } from "@/lib/order-service";
import type { Customer } from "@/types/db";

export async function createPosOrder(input: PosOrderInput): Promise<PosOrderResult> {
  const current = await getCurrentUser();
  if (!current) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

  const supabase = await createClient();
  const result = await createPosOrderRecord(supabase, current, input);

  if (!("error" in result)) {
    revalidatePath("/don-hang");
    revalidatePath("/kho-hang");
    revalidatePath("/san-pham");
    revalidatePath("/khach-hang");
    revalidatePath("/ban-hang");
    revalidatePath("/");
  }
  return result;
}

export async function createQuickCustomer(input: {
  name: string;
  phone: string;
  address: string;
  region: string;
}): Promise<{ error: string } | { customer: Customer }> {
  const current = await getCurrentUser();
  if (!current) return { error: "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại." };

  const name = input.name.trim();
  if (!name) return { error: "Vui lòng nhập tên khách hàng." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("customers")
    .insert({
      org_id: current.activeOrgId,
      name,
      phone: input.phone.trim() || null,
      address: input.address.trim() || null,
      region: input.region.trim() || null,
      group_tag: "Mới",
      created_by: current.profile.id,
    })
    .select("*")
    .single<Customer>();

  if (error || !data) return { error: "Lỗi thêm khách hàng: " + (error?.message ?? "không rõ") };

  revalidatePath("/khach-hang");
  return { customer: data };
}
