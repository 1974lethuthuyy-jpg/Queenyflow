"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentUser } from "@/lib/session";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";

const DUPLICATE_EMAIL_MESSAGE =
  "Xin lỗi, mail này đã được sử dụng để tạo tài khoản trước đó. Vui lòng đăng nhập lại hoặc sử dụng mail khác.";
const DUPLICATE_USERNAME_MESSAGE =
  "Tên đăng nhập hoặc mật khẩu này đã được tạo cho một tài khoản nhân viên khác.";

export async function signUpAdmin(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const businessName = String(formData.get("businessName") || "").trim() || "Cửa hàng của tôi";

  if (!email || !password) {
    return { error: "Vui lòng nhập đầy đủ email và mật khẩu." };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu phải có ít nhất 6 ký tự." };
  }

  const admin = createAdminClient();
  const { data: existingOrg } = await admin
    .from("organizations")
    .select("id")
    .eq("owner_email", email)
    .maybeSingle();

  if (existingOrg) {
    return { error: DUPLICATE_EMAIL_MESSAGE };
  }

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({ email, password });

  if (error) {
    if (error.message.toLowerCase().includes("already registered")) {
      return { error: DUPLICATE_EMAIL_MESSAGE };
    }
    return { error: error.message };
  }

  const userId = data.user?.id;
  if (!userId) {
    return { error: "Không thể tạo tài khoản, vui lòng thử lại." };
  }

  // Tạo profile trước với org_id tạm để null, vì organizations.id đang tham chiếu tới
  // profiles.id (ràng buộc khóa ngoại) — phải có profile tồn tại trước khi tạo organization.
  const { error: profileError } = await admin
    .from("profiles")
    .insert({ id: userId, role: "admin", org_id: null, display_name: businessName });
  if (profileError) {
    return { error: "Lỗi tạo hồ sơ: " + profileError.message };
  }

  const { error: orgError } = await admin
    .from("organizations")
    .insert({ id: userId, owner_email: email, business_name: businessName });
  if (orgError) {
    return { error: "Lỗi tạo tổ chức: " + orgError.message };
  }

  const { error: linkError } = await admin
    .from("profiles")
    .update({ org_id: userId })
    .eq("id", userId);
  if (linkError) {
    return { error: "Lỗi liên kết hồ sơ với tổ chức: " + linkError.message };
  }

  if (data.session) {
    redirect("/");
  }

  return {
    success:
      "Đăng ký thành công! Vui lòng kiểm tra email để xác nhận tài khoản trước khi đăng nhập.",
  };
}

export async function loginAdmin(formData: FormData) {
  const email = String(formData.get("email") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!email || !password) {
    return { error: "Vui lòng nhập đầy đủ email và mật khẩu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Email hoặc mật khẩu không đúng." };
  }

  redirect("/");
}

export async function loginEmployee(formData: FormData) {
  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");

  if (!username || !password) {
    return { error: "Vui lòng nhập đầy đủ tên đăng nhập và mật khẩu." };
  }

  const admin = createAdminClient();
  const { data: profileRow } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .eq("role", "employee")
    .maybeSingle();

  if (!profileRow) {
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }

  const { data: authUser } = await admin.auth.admin.getUserById(profileRow.id);
  const employeeEmail = authUser.user?.email;
  if (!employeeEmail) {
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: employeeEmail,
    password,
  });

  if (error) {
    return { error: "Tên đăng nhập hoặc mật khẩu không đúng." };
  }

  redirect("/");
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/dang-nhap");
}

export async function createEmployee(formData: FormData) {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin") {
    return { error: "Chỉ tài khoản admin mới có quyền tạo tài khoản nhân viên." };
  }

  const username = String(formData.get("username") || "").trim().toLowerCase();
  const password = String(formData.get("password") || "");
  const displayName = String(formData.get("displayName") || "").trim();
  const facebookLink = String(formData.get("facebookLink") || "").trim() || null;
  const zaloOaLink = String(formData.get("zaloOaLink") || "").trim() || null;

  if (!username || !password || !displayName) {
    return { error: "Vui lòng nhập đầy đủ thông tin nhân viên." };
  }
  if (password.length < 6) {
    return { error: "Mật khẩu phải có ít nhất 6 ký tự." };
  }
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) {
    return {
      error:
        "Tên đăng nhập chỉ gồm chữ thường, số, dấu chấm/gạch dưới/gạch ngang, từ 3-32 ký tự.",
    };
  }

  const admin = createAdminClient();

  const orgId = current.profile.org_id;
  const { count } = await admin
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("org_id", orgId)
    .eq("role", "employee");

  if ((count ?? 0) >= 15) {
    return { error: "Tổ chức của bạn đã đạt tối đa 15 tài khoản nhân viên." };
  }

  const { data: existingUsername } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsername) {
    return { error: DUPLICATE_USERNAME_MESSAGE };
  }

  const employeeDomain = process.env.EMPLOYEE_EMAIL_DOMAIN || "employees.queenyflow.local";
  const syntheticEmail = `${username}.${orgId.slice(0, 8)}@${employeeDomain}`;

  const { data: created, error: createError } = await admin.auth.admin.createUser({
    email: syntheticEmail,
    password,
    email_confirm: true,
  });

  if (createError || !created.user) {
    return { error: "Không thể tạo tài khoản nhân viên: " + (createError?.message ?? "") };
  }

  const { error: profileError } = await admin.from("profiles").insert({
    id: created.user.id,
    role: "employee",
    org_id: orgId,
    username,
    display_name: displayName,
    facebook_link: facebookLink,
    zalo_oa_link: zaloOaLink,
  });

  if (profileError) {
    await admin.auth.admin.deleteUser(created.user.id);
    if (profileError.message.toLowerCase().includes("duplicate")) {
      return { error: DUPLICATE_USERNAME_MESSAGE };
    }
    return { error: "Lỗi tạo hồ sơ nhân viên: " + profileError.message };
  }

  revalidatePath("/nhan-vien");
  return { success: `Đã tạo tài khoản nhân viên "${username}".` };
}

export async function deleteEmployee(employeeId: string) {
  const current = await getCurrentUser();
  if (!current || current.profile.role !== "admin") {
    return { error: "Chỉ tài khoản admin mới có quyền xoá tài khoản nhân viên." };
  }

  const admin = createAdminClient();
  const { data: target } = await admin
    .from("profiles")
    .select("org_id, role")
    .eq("id", employeeId)
    .single();

  if (!target || target.role !== "employee" || target.org_id !== current.profile.org_id) {
    return { error: "Không tìm thấy nhân viên trong tổ chức của bạn." };
  }

  await admin.auth.admin.deleteUser(employeeId);
  revalidatePath("/nhan-vien");
  return { success: "Đã xoá tài khoản nhân viên." };
}
