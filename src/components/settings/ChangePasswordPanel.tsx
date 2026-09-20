"use client";

import { useActionState } from "react";
import { KeyRound } from "lucide-react";
import { requestPasswordReset } from "@/app/(auth)/actions";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await requestPasswordReset(formData)) ?? null;
}

export function ChangePasswordPanel({ email }: { email: string }) {
  const [state, formAction, pending] = useActionState(action, null);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4 max-w-xl">
      <h2 className="font-semibold text-gray-800 flex items-center gap-2">
        <KeyRound size={18} className="text-brand-600" /> Đổi mật khẩu
      </h2>
      <p className="text-xs text-gray-400">
        Chúng tôi sẽ gửi một email tới <span className="font-medium">{email}</span> chứa liên kết để bạn đặt mật khẩu mới.
      </p>

      {state?.success ? (
        <p className="text-sm text-green-600">{state.success}</p>
      ) : (
        <form action={formAction}>
          <input type="hidden" name="email" value={email} />
          {state?.error && <p className="text-sm text-red-600 mb-2">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
          >
            {pending ? "Đang gửi..." : "Gửi email đổi mật khẩu"}
          </button>
        </form>
      )}
    </div>
  );
}
