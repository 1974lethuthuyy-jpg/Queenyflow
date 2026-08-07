"use client";

import { useActionState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { createEmployee } from "@/app/(auth)/actions";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await createEmployee(formData)) ?? null;
}

export function EmployeeModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [state, formAction, pending] = useActionState(action, null);

  useEffect(() => {
    if (state?.success) {
      const timeout = setTimeout(onClose, 800);
      return () => clearTimeout(timeout);
    }
  }, [state, onClose]);

  return (
    <Modal open={open} onClose={onClose} title="Thêm tài khoản nhân viên">
      <form action={formAction} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên nhân viên *</label>
          <input
            name="displayName"
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Tên đăng nhập *</label>
            <input
              name="username"
              required
              pattern="[a-z0-9._-]{3,32}"
              title="Chữ thường, số, . _ -, 3-32 ký tự"
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mật khẩu *</label>
            <input
              name="password"
              type="password"
              required
              minLength={6}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
            />
          </div>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link Facebook (tùy chọn)</label>
          <input
            name="facebookLink"
            placeholder="https://facebook.com/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Link Zalo OA (tùy chọn)</label>
          <input
            name="zaloOaLink"
            placeholder="https://zalo.me/..."
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
        {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

        <button
          type="submit"
          disabled={pending}
          className="w-full bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
        >
          {pending ? "Đang tạo..." : "Tạo tài khoản nhân viên"}
        </button>
      </form>
    </Modal>
  );
}
