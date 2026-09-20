"use client";

import { useActionState } from "react";
import Link from "next/link";
import { requestPasswordReset } from "../actions";
import { Crown } from "lucide-react";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await requestPasswordReset(formData)) ?? null;
}

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-brand-50 via-white to-brand-100 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-8">
        <div className="flex items-center gap-2 justify-center mb-6">
          <Crown className="text-brand-600" size={28} />
          <div className="text-center">
            <div className="font-bold text-lg text-brand-700 leading-tight">QUEENY FLOW</div>
            <div className="text-xs text-gray-500 leading-tight">Quên mật khẩu</div>
          </div>
        </div>

        {state?.success ? (
          <div className="text-center space-y-4">
            <p className="text-sm text-green-700 bg-green-50 border border-green-200 rounded-lg p-3">
              {state.success}
            </p>
            <Link href="/dang-nhap" className="text-brand-600 font-medium text-sm">
              Về trang đăng nhập
            </Link>
          </div>
        ) : (
          <form action={formAction} className="space-y-4">
            <p className="text-sm text-gray-500">
              Nhập email tài khoản admin của bạn. Chúng tôi sẽ gửi một email chứa liên kết để bạn đặt mật khẩu mới.
            </p>
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
            {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
            >
              {pending ? "Đang gửi..." : "Gửi email đặt lại mật khẩu"}
            </button>
            <p className="text-center text-sm text-gray-500">
              <Link href="/dang-nhap" className="text-brand-600 font-medium">
                Quay lại đăng nhập
              </Link>
            </p>
          </form>
        )}
      </div>
    </div>
  );
}
