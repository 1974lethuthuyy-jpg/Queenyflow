"use client";

import { useActionState, useState } from "react";
import { updateOrgSettings } from "@/app/(app)/cai-dat/actions";
import { VIETNAM_BANKS } from "@/lib/vietqr";
import type { Organization } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await updateOrgSettings(formData)) ?? null;
}

export function SettingsForm({ org, readOnly }: { org: Organization; readOnly: boolean }) {
  const [state, formAction, pending] = useActionState(action, null);
  const [bankBin, setBankBin] = useState(org.bank_bin ?? "");

  return (
    <form action={formAction} className="bg-white rounded-xl border border-gray-200 p-6 space-y-5 max-w-xl">
      <fieldset disabled={readOnly} className="space-y-5 disabled:opacity-70">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Tên cửa hàng / doanh nghiệp</label>
          <input
            name="businessName"
            defaultValue={org.business_name}
            required
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
          />
        </div>

        <div>
          <div className="text-sm font-medium text-gray-700 mb-2">Tài khoản ngân hàng nhận thanh toán (QR)</div>
          <div className="grid grid-cols-1 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Ngân hàng</label>
              <select
                name="bankBin"
                value={bankBin}
                onChange={(e) => setBankBin(e.target.value)}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <option value="">-- Chọn ngân hàng --</option>
                {VIETNAM_BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Số tài khoản</label>
              <input
                name="bankAccountNumber"
                defaultValue={org.bank_account_number ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Tên chủ tài khoản</label>
              <input
                name="bankAccountName"
                defaultValue={org.bank_account_name ?? ""}
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>
          <p className="text-xs text-gray-400 mt-2">
            Thông tin này dùng để tạo mã QR chuyển khoản tĩnh khi khách chọn thanh toán qua QR ngân hàng.
          </p>
        </div>
      </fieldset>

      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      {!readOnly && (
        <button
          type="submit"
          disabled={pending}
          className="bg-purple-600 hover:bg-purple-700 disabled:opacity-60 text-white rounded-lg px-4 py-2.5 text-sm font-semibold"
        >
          {pending ? "Đang lưu..." : "Lưu cài đặt"}
        </button>
      )}
      {readOnly && (
        <p className="text-xs text-amber-600">Chỉ chủ tài khoản admin mới có quyền chỉnh sửa cài đặt.</p>
      )}
    </form>
  );
}
