"use client";

import Link from "next/link";
import { useActionState, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { useCloseOnSuccess } from "@/lib/use-close-on-success";
import { Badge } from "@/components/ui/Badge";
import { ImageUploadField } from "@/components/ui/ImageUploadField";
import { CustomerPricesEditor } from "./CustomerPricesEditor";
import { markOrderPaid } from "@/app/(app)/don-hang/actions";
import {
  createCustomer,
  getCustomerHistory,
  updateCustomer,
  type CustomerOrderRow,
} from "@/app/(app)/khach-hang/actions";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type Customer, type CustomerGroup, type OrderStatus, type PaymentMethod, type Product } from "@/types/db";

type FormState = { error?: string; success?: string } | null;
type Tab = "info" | "history" | "debt" | "prices";

const GROUPS: CustomerGroup[] = ["Mới", "Thường", "Thân thiết", "VIP", "Tiềm năng", "Ngừng giao dịch"];
const inputClass = "w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500";

type ModalProps = {
  open: boolean;
  onClose: () => void;
  customer: Customer | null;
  canEdit: boolean;
  products?: Product[];
};

// Chỉ dựng nội dung khi đang mở và dùng key theo khách: mỗi lần mở là một trạng thái mới
// (về tab Thông tin, không còn thông báo lỗi/thành công của lần trước).
export function CustomerModal(props: ModalProps) {
  if (!props.open) return null;
  return <CustomerModalContent key={props.customer?.id ?? "new"} {...props} />;
}

function CustomerModalContent({ open, onClose, customer, canEdit, products = [] }: ModalProps) {
  const isEdit = Boolean(customer);
  const action = isEdit ? updateCustomer : createCustomer;
  const [state, formAction, pending] = useActionState<FormState, FormData>(
    async (_prev, formData) => (await action(formData)) ?? null,
    null
  );
  const [tab, setTab] = useState<Tab>("info");
  const [orders, setOrders] = useState<CustomerOrderRow[] | null>(null);

  useCloseOnSuccess(state, onClose);

  useEffect(() => {
    if (!customer) return;
    let cancelled = false;
    void getCustomerHistory(customer.id).then((rows) => {
      if (!cancelled) setOrders(rows);
    });
    return () => {
      cancelled = true;
    };
  }, [customer]);

  const summary = useMemo(() => {
    const list = orders ?? [];
    const sold = list.filter((o) => o.status !== "da_huy").reduce((s, o) => s + Number(o.total_amount), 0);
    const debt = list
      .filter((o) => o.payment_method === "debt" && o.payment_status === "unpaid" && o.status !== "da_huy")
      .reduce((s, o) => s + Number(o.total_amount), 0);
    return { sold, debt };
  }, [orders]);

  const readOnly = isEdit && !canEdit;
  const tabs: Array<{ key: Tab; label: string }> = [
    { key: "info", label: "Thông tin" },
    ...(isEdit
      ? [
          { key: "history" as Tab, label: "Lịch sử bán hàng" },
          { key: "debt" as Tab, label: "Công nợ" },
          ...(canEdit && products.length > 0 ? [{ key: "prices" as Tab, label: "Giá riêng" }] : []),
        ]
      : []),
  ];

  return (
    <Modal open={open} onClose={onClose} title={isEdit ? customer!.name : "Thêm khách hàng mới"} width="max-w-2xl">
      {isEdit && (
        <div className="-mt-2 mb-3 flex flex-wrap gap-x-5 gap-y-1 text-sm">
          <span>
            Nợ hiện tại:{" "}
            <b className={summary.debt > 0 ? "text-red-500" : "text-gray-700"}>{orders ? formatCurrency(summary.debt) : "…"}</b>
          </span>
          <span className="text-gray-300">|</span>
          <span>
            Tổng bán: <b className="text-gray-800">{orders ? formatCurrency(summary.sold) : "…"}</b>
          </span>
        </div>
      )}

      {tabs.length > 1 && (
        <div className="flex gap-5 border-b border-gray-200 mb-4">
          {tabs.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`pb-2 -mb-px text-sm border-b-2 ${tab === t.key ? "border-brand-600 text-brand-700 font-semibold" : "border-transparent text-gray-500 hover:text-gray-700"}`}
            >
              {t.label}
            </button>
          ))}
        </div>
      )}

      {tab === "info" && (
        <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={customer!.id} />}

          <ImageUploadField bucket="avatars" name="avatarUrl" defaultValue={customer?.avatar_url} label="Ảnh khách hàng" />

          <fieldset disabled={readOnly} className="space-y-4 disabled:opacity-70">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Họ tên *</label>
              <input name="name" required defaultValue={customer?.name} className={inputClass} />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Số điện thoại</label>
                <input name="phone" defaultValue={customer?.phone ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                <input name="email" type="email" defaultValue={customer?.email ?? ""} className={inputClass} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Khu vực</label>
                <input name="region" defaultValue={customer?.region ?? ""} className={inputClass} />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nhóm khách hàng</label>
                <select name="groupTag" defaultValue={customer?.group_tag ?? "Mới"} className={inputClass}>
                  {GROUPS.map((g) => (
                    <option key={g} value={g}>
                      {g}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Địa chỉ</label>
              <input name="address" defaultValue={customer?.address ?? ""} className={inputClass} />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Ghi chú</label>
              <textarea name="notes" rows={2} defaultValue={customer?.notes ?? ""} className={inputClass} />
            </div>
          </fieldset>

          {state?.error && <p className="text-sm text-red-600">{state.error}</p>}

          {!readOnly && (
            <button
              type="submit"
              disabled={pending}
              className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-semibold transition"
            >
              {pending ? "Đang lưu..." : isEdit ? "Lưu thay đổi" : "Thêm khách hàng"}
            </button>
          )}
          {readOnly && <p className="text-xs text-amber-600 text-center">Chỉ tài khoản admin mới có quyền sửa thông tin khách hàng.</p>}
        </form>
      )}

      {tab === "history" && <HistoryTab orders={orders} onNavigate={onClose} />}
      {tab === "debt" && <DebtTab orders={orders} onChanged={() => customer && getCustomerHistory(customer.id).then(setOrders)} />}
      {tab === "prices" && isEdit && canEdit && <CustomerPricesEditor customerId={customer!.id} products={products} />}
    </Modal>
  );
}

const STATUS_COLOR: Record<OrderStatus, "gray" | "purple" | "blue" | "green" | "orange" | "red"> = {
  cho_xac_nhan: "blue",
  dang_xu_ly: "orange",
  dang_giao: "purple",
  hoan_thanh: "green",
  da_huy: "red",
};

function Loading() {
  return (
    <div className="flex items-center justify-center gap-2 text-sm text-gray-400 py-10">
      <Loader2 size={16} className="animate-spin" /> Đang tải...
    </div>
  );
}

function HistoryTab({ orders, onNavigate }: { orders: CustomerOrderRow[] | null; onNavigate: () => void }) {
  if (!orders) return <Loading />;
  if (orders.length === 0) return <p className="text-sm text-gray-400 text-center py-10">Khách này chưa mua đơn nào.</p>;
  return (
    <div className="overflow-x-auto max-h-96 overflow-y-auto border border-gray-200 rounded-lg">
      <table className="w-full text-sm">
        <thead className="sticky top-0 bg-brand-50">
          <tr className="text-left text-xs text-gray-600">
            <th className="px-3 py-2">Mã đơn</th>
            <th className="px-3 py-2">Thời gian</th>
            <th className="px-3 py-2 text-right">Tổng tiền</th>
            <th className="px-3 py-2">Thanh toán</th>
            <th className="px-3 py-2">Trạng thái</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((o) => (
            <tr key={o.id} className="border-t border-gray-100">
              <td className="px-3 py-2">
                <Link href={`/don-hang/${o.id}`} onClick={onNavigate} className="text-brand-700 font-medium hover:underline">
                  {o.code}
                </Link>
              </td>
              <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
              <td className="px-3 py-2 text-right font-medium">{formatCurrency(o.total_amount)}</td>
              <td className="px-3 py-2 text-xs text-gray-600">{PAYMENT_METHOD_LABEL[o.payment_method as PaymentMethod]}</td>
              <td className="px-3 py-2">
                <Badge color={STATUS_COLOR[o.status as OrderStatus]}>{ORDER_STATUS_LABEL[o.status as OrderStatus]}</Badge>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function DebtTab({ orders, onChanged }: { orders: CustomerOrderRow[] | null; onChanged: () => void }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  if (!orders) return <Loading />;

  const unpaid = orders.filter((o) => o.payment_method === "debt" && o.payment_status === "unpaid" && o.status !== "da_huy");
  const total = unpaid.reduce((s, o) => s + Number(o.total_amount), 0);

  async function collect(o: CustomerOrderRow) {
    if (!confirm(`Xác nhận đã thu ${formatCurrency(o.total_amount)} của đơn ${o.code}?`)) return;
    setBusyId(o.id);
    await markOrderPaid(o.id);
    setBusyId(null);
    onChanged();
    router.refresh();
  }

  if (unpaid.length === 0) return <p className="text-sm text-gray-400 text-center py-10">Khách này không có công nợ.</p>;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between rounded-lg bg-red-50 border border-red-100 px-4 py-2.5 text-sm">
        <span className="text-gray-700">Tổng công nợ chưa thu ({unpaid.length} đơn)</span>
        <span className="font-bold text-red-600">{formatCurrency(total)}</span>
      </div>
      <div className="border border-gray-200 rounded-lg divide-y divide-gray-100 max-h-80 overflow-y-auto">
        {unpaid.map((o) => (
          <div key={o.id} className="flex items-center justify-between gap-3 px-3 py-2.5 text-sm">
            <div>
              <div className="font-medium text-gray-800">{o.code}</div>
              <div className="text-xs text-gray-400">{formatDateTime(o.created_at)}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-semibold">{formatCurrency(o.total_amount)}</span>
              <button
                onClick={() => collect(o)}
                disabled={busyId === o.id}
                className="text-xs font-medium text-green-700 bg-green-50 hover:bg-green-100 rounded-md px-2.5 py-1.5 disabled:opacity-50"
              >
                {busyId === o.id ? "Đang lưu…" : "Đã thu tiền"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
