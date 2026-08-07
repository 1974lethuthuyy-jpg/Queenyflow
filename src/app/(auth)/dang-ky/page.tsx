"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAdmin } from "../actions";
import { Crown } from "lucide-react";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await signUpAdmin(formData)) ?? null;
}

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-purple-50 via-white to-purple-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Crown className="text-purple-600" size={28} />
          <div className="text-center">
            <div className="font-bold text-lg text-purple-700 leading-tight">QUEENY FLOW</div>
            <div className="text-xs text-gray-500 leading-tight">Tạo tài khoản quản trị</div>
          </div>
        </div>

        {state?.success ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              {state.success}
            </p>
            <Link href="/dang-nhap" className="text-purple-600 font-medium text-sm">
              Về trang đăng nhập
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Tên cửa hàng / doanh nghiệp
              </label>
              <input
                name="businessName"
                type="text"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Queeny Curtain"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
              <input
                name="email"
                type="email"
                required
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="ban@congty.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu</label>
              <input
                name="password"
                type="password"
                required
                minLength={6}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
                placeholder="Ít nhất 6 ký tự"
              />
            </div>
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
            >
              {pending ? "Đang tạo..." : "Tạo tài khoản"}
            </button>
            <p className="text-center text-sm text-gray-500">
              Đã có tài khoản?{" "}
              <Link href="/dang-nhap" className="text-purple-600 font-medium">
                Đăng nhập
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
