"use client";

import { useActionState, useState } from "react";
import { ShieldCheck, Trash2 } from "lucide-react";
import { grantAccess, revokeAccess } from "@/app/(app)/nhan-vien/actions";
import type { Delegation } from "@/types/db";

type FormState = { error?: string; success?: string } | null;

async function action(_prev: FormState, formData: FormData): Promise<FormState> {
  return (await grantAccess(formData)) ?? null;
}

export function DelegationsPanel({
  granted,
  received,
}: {
  granted: Delegation[];
  received: Delegation[];
}) {
  const [state, formAction, pending] = useActionState(action, null);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleRevoke(id: string) {
    if (!confirm("Thu hồi quyền truy cập này?")) return;
    setBusyId(id);
    await revokeAccess(id);
    setBusyId(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-5">
      <div>
        <h2 className="font-semibold text-gray-800 flex items-center gap-2">
          <ShieldCheck size={18} className="text-brand-600" /> Ủy quyền truy cập
        </h2>
        <p className="text-xs text-gray-400 mt-1">
          Cấp cho một tài khoản admin khác quyền xem, sửa sản phẩm và lên đơn hàng trên dữ liệu của bạn.
        </p>
      </div>

      <form action={formAction} className="flex items-end gap-2">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Email tài khoản admin muốn cấp quyền</label>
          <input
            name="email"
            type="email"
            required
            placeholder="admin@congty.com"
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>
        <button
          type="submit"
          disabled={pending}
          className="bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg"
        >
          {pending ? "Đang cấp..." : "Cấp quyền"}
        </button>
      </form>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      {state?.success && <p className="text-sm text-green-600">{state.success}</p>}

      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Đã cấp quyền cho</div>
        <div className="divide-y divide-gray-50">
          {granted.length === 0 && <p className="text-sm text-gray-400 py-2">Chưa cấp quyền cho ai.</p>}
          {granted.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700">
                {d.organizations?.business_name} ({d.organizations?.owner_email})
              </span>
              <button
                onClick={() => handleRevoke(d.id)}
                disabled={busyId === d.id}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </div>

      <div>
        <div className="text-sm font-medium text-gray-700 mb-2">Đang được cấp quyền từ</div>
        <div className="divide-y divide-gray-50">
          {received.length === 0 && <p className="text-sm text-gray-400 py-2">Chưa được ai cấp quyền.</p>}
          {received.map((d) => (
            <div key={d.id} className="flex items-center justify-between py-2 text-sm">
              <span className="text-gray-700">
                {d.organizations?.business_name} ({d.organizations?.owner_email})
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
