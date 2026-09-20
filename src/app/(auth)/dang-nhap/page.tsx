"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { loginAdmin, loginEmployee } from "../actions";
import { Crown } from "lucide-react";

type FormState = { error?: string; success?: string } | null;

async function adminAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await loginAdmin(formData)) ?? null;
}

async function employeeAction(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await loginEmployee(formData)) ?? null;
}

export default function LoginPage() {
  const [tab, setTab] = useState<"admin" | "employee">("admin");
  const [adminState, adminFormAction, adminPending] = useActionState(adminAction, null);
  const [employeeState, employeeFormAction, employeePending] = useActionState(employeeAction, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Crown className="text-brand-600" size={28} />
          <div className="text-center">
            <div className="font-bold text-lg text-brand-700 leading-tight">QUEENY FLOW</div>
            <div className="text-xs text-gray-500 leading-tight">Quản trị &amp; CSKH</div>
          </div>
        </div>

        <div className="grid grid-cols-2 mb-6 rounded-lg bg-gray-100 p-1">
          <button
            className={`py-2 rounded-md text-sm font-medium transition ${
              tab === "admin" ? "bg-white shadow text-brand-700" : "text-gray-500"
            }`}
            onClick={() => setTab("admin")}
            type="button"
          >
            Chủ tài khoản (Email)
          </button>
          <button
            className={`py-2 rounded-md text-sm font-medium transition ${
              tab === "employee" ? "bg-white shadow text-brand-700" : "text-gray-500"
            }`}
            onClick={() => setTab("employee")}
            type="button"
          >
            Nhân viên
          </button>
        </div>

        {tab === "admin" ? (
          <form action={adminFormAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ban@congty.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                name="password"
                type="password"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="••••••••"
              />
              <div className="text-right mt-1">
                <Link href="/quen-mat-khau" className="text-xs text-brand-600">
                  Quên mật khẩu?
                </Link>
              </div>
            </div>
            {adminState?.error && (
              <p className="text-sm text-red-600">{adminState.error}</p>
            )}
            <button
              type="submit"
              disabled={adminPending}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
            >
              {adminPending ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <p className="text-center text-sm text-gray-500">
              Chưa có tài khoản?{" "}
              <Link href="/dang-ky" className="text-brand-600 font-medium">
                Tạo tài khoản mới
              </Link>
            </p>
          </form>
        ) : (
          <form action={employeeFormAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập</label>
              <input
                name="username"
                type="text"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="ten.dangnhap"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                name="password"
                type="password"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                placeholder="••••••••"
              />
            </div>
            {employeeState?.error && (
              <p className="text-sm text-red-600">{employeeState.error}</p>
            )}
            <button
              type="submit"
              disabled={employeePending}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
            >
              {employeePending ? "Đang đăng nhập..." : "Đăng nhập"}
            </button>
            <p className="text-center text-xs text-gray-400">
              Tài khoản nhân viên do quản trị viên tạo trong mục Nhân viên.
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
