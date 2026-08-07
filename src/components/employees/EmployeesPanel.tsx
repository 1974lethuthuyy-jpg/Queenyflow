"use client";

import { useState } from "react";
import { Plus, Trash2, Link2, MessageCircle } from "lucide-react";
import { deleteEmployee } from "@/app/(auth)/actions";
import { EmployeeModal } from "./EmployeeModal";
import type { Profile } from "@/types/db";

export function EmployeesPanel({ employees }: { employees: Profile[] }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);

  async function handleDelete(e: Profile) {
    if (!confirm(`Xoá tài khoản nhân viên "${e.display_name}"?`)) return;
    setBusyId(e.id);
    await deleteEmployee(e.id);
    setBusyId(null);
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200">
      <div className="flex items-center justify-between p-4 border-b border-gray-100">
        <div>
          <h2 className="font-semibold text-gray-800">Tài khoản nhân viên ({employees.length}/15)</h2>
          <p className="text-xs text-gray-400">Nhân viên đăng nhập bằng tên đăng nhập &amp; mật khẩu, không cần email.</p>
        </div>
        <button
          onClick={() => setModalOpen(true)}
          disabled={employees.length >= 15}
          className="flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white text-sm font-medium px-3 py-2 rounded-lg"
        >
          <Plus size={16} /> Thêm nhân viên
        </button>
      </div>

      <div className="divide-y divide-gray-50">
        {employees.length === 0 && (
          <p className="text-sm text-gray-400 py-10 text-center">Chưa có tài khoản nhân viên nào.</p>
        )}
        {employees.map((e) => (
          <div key={e.id} className="flex items-center justify-between px-4 py-3">
            <div>
              <div className="font-medium text-gray-700 text-sm">{e.display_name}</div>
              <div className="text-xs text-gray-400">@{e.username}</div>
            </div>
            <div className="flex items-center gap-3">
              {e.facebook_link && (
                <a href={e.facebook_link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-600">
                  <Link2 size={16} />
                </a>
              )}
              {e.zalo_oa_link && (
                <a href={e.zalo_oa_link} target="_blank" rel="noreferrer" className="text-gray-400 hover:text-blue-500">
                  <MessageCircle size={16} />
                </a>
              )}
              <button
                onClick={() => handleDelete(e)}
                disabled={busyId === e.id}
                className="text-gray-400 hover:text-red-600 disabled:opacity-50"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
      </div>

      <EmployeeModal open={modalOpen} onClose={() => setModalOpen(false)} />
    </div>
  );
}
