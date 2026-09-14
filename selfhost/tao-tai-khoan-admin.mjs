import { createClient } from "@supabase/supabase-js";
import fs from "node:fs";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import path from "node:path";

const dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(dir, ".env.local");

if (!fs.existsSync(envPath)) {
  console.error("Khong tim thay .env.local — hay chay CHAY-SERVER.bat truoc.");
  process.exit(1);
}

const envText = fs.readFileSync(envPath, "utf8").replace(/^﻿/, "");
const env = {};
for (const line of envText.split(/\r?\n/)) {
  const m = line.match(/^([A-Z_]+)=(.*)$/);
  if (m) env[m[1]] = m[2].trim();
}

// QUEN-MAT-KHAU-ADMIN.bat chay voi --doi-mat-khau: chi dat lai mat khau, khong tao moi.
const resetMode = process.argv.includes("--doi-mat-khau");

if (!env.SUPABASE_SERVICE_ROLE_KEY || !env.NEXT_PUBLIC_SUPABASE_URL) {
  console.error("File .env.local chua co du thong tin — hay chay CHAY-SERVER.bat truoc.");
  process.exit(1);
}

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
const ask = (q) => new Promise((resolve) => rl.question(q, resolve));

let businessName = "";
if (resetMode) {
  console.log("=== Dat lai mat khau admin Queeny Flow (khong can email xac nhan) ===\n");
} else {
  console.log("=== Tao tai khoan admin cho Queeny Flow (server local) ===\n");
  businessName = (await ask("Ten cua hang: ")).trim() || "Cua hang cua toi";
}
const email = (await ask("Email dang nhap: ")).trim().toLowerCase();
const password = await ask(resetMode ? "Mat khau MOI (it nhat 6 ky tu): " : "Mat khau (it nhat 6 ky tu): ");
rl.close();

if (!email || !password || password.length < 6) {
  console.error("\nEmail hoac mat khau khong hop le (mat khau can it nhat 6 ky tu).");
  process.exit(1);
}

// --- Truong hop 1: da co to chuc voi email nay tu truoc ---
const { data: existingOrg } = await admin
  .from("organizations")
  .select("id, business_name")
  .eq("owner_email", email)
  .maybeSingle();

if (existingOrg) {
  const userId = existingOrg.id;

  // Dat lai mat khau theo dung mat khau ban vua nhap (phong truong hop quen,
  // hoac lan truoc tao tai khoan bi lo dang chung).
  const { error: pwError } = await admin.auth.admin.updateUserById(userId, { password });
  if (pwError) {
    console.error("\nLoi dat lai mat khau:", pwError.message);
    process.exit(1);
  }

  const { data: existingProfile } = await admin
    .from("profiles")
    .select("id")
    .eq("id", userId)
    .maybeSingle();

  if (existingProfile) {
    console.log("\nTai khoan nay da ton tai day du. Da dat lai mat khau theo mat khau ban vua nhap.");
    console.log(`Dang nhap tai http://localhost:3000 bang email: ${email}`);
    process.exit(0);
  }

  // Ho so (profile) bi thieu tu lan tao truoc (loi giua chung) — tu sua lai.
  console.log("\nPhat hien tai khoan tao dang chung tu truoc (thieu ho so). Dang tu hoan tat...");
  const { error: repairError } = await admin.from("profiles").insert({
    id: userId,
    role: "admin",
    org_id: userId,
    display_name: businessName || existingOrg.business_name,
  });

  if (repairError) {
    console.error("\nKhong tu sua duoc. Loi chi tiet:", repairError.message);
    console.error("Chi tiet day du:", JSON.stringify(repairError));
    process.exit(1);
  }

  console.log(`\nDa sua xong va tao tai khoan admin thanh cong!`);
  console.log(`Dang nhap tai http://localhost:3000 bang:`);
  console.log(`  Email: ${email}`);
  console.log(`  Mat khau: (mat khau ban vua nhap)`);
  process.exit(0);
}

if (resetMode) {
  console.error("\nKhong tim thay tai khoan admin nao dung email nay tren server nay.");
  console.error("Kiem tra lai email, hoac chay TAO-TAI-KHOAN-ADMIN.bat de tao tai khoan moi.");
  process.exit(1);
}

// --- Truong hop 2: tao moi hoan toan ---
const { data, error } = await admin.auth.admin.createUser({
  email,
  password,
  email_confirm: true,
});

if (error || !data.user) {
  console.error("\nLoi tao tai khoan:", error?.message);
  process.exit(1);
}

const userId = data.user.id;

const { error: orgError } = await admin.from("organizations").insert({
  id: userId,
  owner_email: email,
  business_name: businessName,
});
if (orgError) {
  console.error("\nLoi tao to chuc:", orgError.message);
  console.error("Chi tiet day du:", JSON.stringify(orgError));
  await admin.auth.admin.deleteUser(userId);
  process.exit(1);
}

const { error: profileError } = await admin.from("profiles").insert({
  id: userId,
  role: "admin",
  org_id: userId,
  display_name: businessName,
});
if (profileError) {
  console.error("\nLoi tao ho so:", profileError.message);
  console.error("Chi tiet day du:", JSON.stringify(profileError));
  console.error("(Du lieu da tao mot phan van con — chay lai file nay voi cung email de tu dong sua.)");
  process.exit(1);
}

console.log(`\nDa tao tai khoan admin thanh cong!`);
console.log(`Dang nhap tai http://localhost:3000 bang:`);
console.log(`  Email: ${email}`);
console.log(`  Mat khau: (mat khau ban vua nhap)`);
