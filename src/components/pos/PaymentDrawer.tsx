"use client";

import { useEffect, useState } from "react";
import { Banknote, HandCoins, Loader2, QrCode, X } from "lucide-react";
import { NumberField } from "@/components/ui/NumberField";
import { formatCurrency } from "@/lib/format";
import { formatNumber } from "@/lib/pricing";
import { getVietQrImageUrl } from "@/lib/vietqr";
import { ORDER_STATUS_LABEL, type Customer, type OrderCategory, type OrderStatus, type PaymentMethod } from "@/types/db";
import type { Draft, PosMode } from "./pos-state";

const METHODS: Array<{ value: PaymentMethod; label: string; icon: typeof QrCode }> = [
  { value: "cash", label: "Tiền mặt", icon: Banknote },
  { value: "qr", label: "Chuyển khoản", icon: QrCode },
  { value: "debt", label: "Ghi nợ", icon: HandCoins },
];

const STATUS_OPTIONS: OrderStatus[] = ["hoan_thanh", "dang_xu_ly", "dang_giao", "cho_xac_nhan"];

export function defaultStatus(mode: PosMode): OrderStatus {
  return mode === "delivery" ? "dang_giao" : "hoan_thanh";
}

export function PaymentDrawer({
  open,
  onClose,
  draft,
  mode,
  customer,
  debt,
  itemCount,
  subtotal,
  discountAmount,
  total,
  cashierName,
  categories,
  bank,
  overStockCount,
  submitting,
  error,
  onChange,
  onSubmit,
}: {
  open: boolean;
  onClose: () => void;
  draft: Draft;
  mode: PosMode;
  customer: Customer | null;
  debt: number;
  itemCount: number;
  subtotal: number;
  discountAmount: number;
  total: number;
  cashierName: string;
  categories: OrderCategory[];
  bank: { bin: string; account: string; name: string | null } | null;
  overStockCount: number;
  submitting: boolean;
  error: string | null;
  onChange: (patch: Partial<Draft>) => void;
  onSubmit: () => void;
}) {
  const [showBigQr, setShowBigQr] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showBigQr) setShowBigQr(false);
        else onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, showBigQr]);

  const method = draft.paymentMethod;
  const given = draft.cashGiven ?? total;
  const change = given - total;
  const status = draft.status ?? defaultStatus(mode);
  const cashShort = method === "cash" && given < total;
  const debtNoCustomer = method === "debt" && !customer;
  const canSubmit = !submitting && itemCount > 0 && !cashShort && !debtNoCustomer;
  const qrUrl =
    bank && total > 0
      ? getVietQrImageUrl({
          bankBin: bank.bin,
          accountNumber: bank.account,
          accountName: bank.name ?? undefined,
          amount: total,
          addInfo: "Thanh toan don hang",
        })
      : null;

  return (
    <>
      <div
        onClick={onClose}
        className={`fixed inset-0 z-40 bg-black/40 transition-opacity ${open ? "opacity-100" : "opacity-0 pointer-events-none"}`}
      />
      <aside
        className={`fixed top-0 right-0 z-50 h-dvh w-full sm:w-[440px] bg-white shadow-2xl flex flex-col transition-transform duration-200 ${
          open ? "translate-x-0" : "translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between px-5 py-3 border-b border-dashed border-gray-300 text-sm">
          <span className="text-gray-700 font-medium">{cashierName}</span>
          <div className="flex items-center gap-4">
            {open && <ClockText />}
            <button onClick={onClose} className="text-gray-500 hover:text-gray-800" title="Đóng (Esc)">
              <X size={20} />
            </button>
          </div>
        </div>

        <div className="pos-scroll flex-1 overflow-y-auto px-5 py-4 space-y-4 text-sm">
          <div>
            <div className="font-semibold text-gray-900 text-base">
              {customer ? `${customer.name}${customer.phone ? " " + customer.phone : ""}` : "Khách vãng lai"}
            </div>
            {debt > 0 && <div className="mt-1 inline-block text-xs text-red-500 bg-red-50 rounded px-1.5 py-0.5">Nợ: {formatCurrency(debt)}</div>}
          </div>

          <div className="space-y-2.5">
            <Line label={`Tổng tiền hàng (${formatNumber(itemCount)})`} value={formatNumber(subtotal)} />
            <div className="flex items-center justify-between">
              <span className="text-gray-700">Giảm giá</span>
              <div className="flex items-center gap-2">
                <NumberField
                  value={draft.discount}
                  onChange={(v) => onChange({ discount: v })}
                  className="w-28 text-right border-b border-gray-300 focus:border-brand-600 focus:outline-none py-0.5"
                />
                <div className="flex rounded-md border border-gray-300 overflow-hidden text-xs">
                  <button
                    type="button"
                    onClick={() => onChange({ discountPct: false })}
                    className={`px-2 py-1 ${!draft.discountPct ? "bg-brand-600 text-white" : "text-gray-500"}`}
                  >
                    VND
                  </button>
                  <button
                    type="button"
                    onClick={() => onChange({ discountPct: true })}
                    className={`px-2 py-1 ${draft.discountPct ? "bg-brand-600 text-white" : "text-gray-500"}`}
                  >
                    %
                  </button>
                </div>
              </div>
            </div>
            {draft.discountPct && discountAmount > 0 && (
              <div className="text-xs text-gray-400 text-right -mt-1.5">= {formatCurrency(discountAmount)}</div>
            )}
            <div className="flex items-center justify-between pt-1 border-t border-gray-100">
              <span className="font-semibold text-gray-900">Khách cần trả</span>
              <span className="text-xl font-bold text-brand-700">{formatNumber(total)}</span>
            </div>
            {method === "cash" && (
              <div className="flex items-center justify-between">
                <span className="font-semibold text-gray-900">Khách thanh toán</span>
                <NumberField
                  value={given}
                  onChange={(v) => onChange({ cashGiven: v })}
                  className="w-36 text-right text-lg font-semibold border-b border-gray-300 focus:border-brand-600 focus:outline-none py-0.5"
                />
              </div>
            )}
            {method === "cash" && (
              <div className={`flex items-center justify-between text-sm ${cashShort ? "text-red-500" : "text-gray-600"}`}>
                <span>{cashShort ? "Còn thiếu (chọn Ghi nợ nếu khách nợ)" : "Tiền thừa trả khách"}</span>
                <span className="font-semibold">{formatNumber(Math.abs(change))}</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 flex-wrap">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const active = method === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => onChange({ paymentMethod: m.value })}
                  className={`flex items-center gap-1.5 rounded-full border px-3 py-1.5 ${
                    active ? "border-brand-600 bg-brand-50 text-brand-800 font-medium" : "border-gray-200 text-gray-600 hover:bg-gray-50"
                  }`}
                >
                  <Icon size={15} /> {m.label}
                </button>
              );
            })}
          </div>

          {method === "qr" && (
            <div className="rounded-lg bg-gray-50 border border-gray-200 p-3">
              {qrUrl && bank ? (
                <div className="flex gap-3 items-start">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={qrUrl} alt="VietQR" className="w-32 h-32 rounded-md border border-gray-200 bg-white object-contain" />
                  <div className="text-xs text-gray-600 space-y-1.5 min-w-0">
                    <div className="font-semibold text-gray-800 text-sm">{bank.name}</div>
                    <div>Số TK: {bank.account}</div>
                    <button type="button" onClick={() => setShowBigQr(true)} className="text-brand-700 font-medium hover:underline">
                      Hiện mã QR lớn cho khách quét
                    </button>
                    <label className="flex items-center gap-1.5 pt-1 text-gray-700 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={draft.transferReceived}
                        onChange={(e) => onChange({ transferReceived: e.target.checked })}
                        className="accent-brand-600"
                      />
                      Đã nhận được tiền chuyển khoản
                    </label>
                  </div>
                </div>
              ) : (
                <div className="text-xs text-amber-700">
                  Chưa cài đặt tài khoản ngân hàng nhận tiền. Vào <b>Quản lý → Cài đặt</b> để thêm, mã QR sẽ hiện ở đây.
                </div>
              )}
            </div>
          )}

          {method === "debt" && (
            <div className={`rounded-lg border p-3 text-xs ${debtNoCustomer ? "bg-red-50 border-red-200 text-red-600" : "bg-amber-50 border-amber-200 text-amber-700"}`}>
              {debtNoCustomer
                ? "Cần chọn khách hàng ở màn bán hàng để ghi nợ."
                : `Đơn này sẽ được ghi vào công nợ của ${customer?.name}. Công nợ mới: ${formatCurrency(debt + total)}.`}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-gray-500 mb-1">Trạng thái đơn</label>
              <select
                value={status}
                onChange={(e) => onChange({ status: e.target.value as OrderStatus })}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                {STATUS_OPTIONS.map((s) => (
                  <option key={s} value={s}>
                    {ORDER_STATUS_LABEL[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs text-gray-500 mb-1">Loại đơn hàng</label>
              <select
                value={draft.categoryId ?? ""}
                onChange={(e) => onChange({ categoryId: e.target.value || null })}
                className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm bg-white"
              >
                <option value="">Không phân loại</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {mode === "delivery" && (
            <div className="space-y-2 rounded-lg border border-gray-200 p-3">
              <div className="text-xs font-semibold text-gray-600">Thông tin giao hàng</div>
              <input
                value={draft.delivery.name}
                onChange={(e) => onChange({ delivery: { ...draft.delivery, name: e.target.value } })}
                placeholder={customer?.name ? `Người nhận (mặc định: ${customer.name})` : "Người nhận"}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
              />
              <input
                value={draft.delivery.phone}
                onChange={(e) => onChange({ delivery: { ...draft.delivery, phone: e.target.value } })}
                placeholder={customer?.phone ? `Điện thoại (mặc định: ${customer.phone})` : "Điện thoại"}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
              />
              <input
                value={draft.delivery.address}
                onChange={(e) => onChange({ delivery: { ...draft.delivery, address: e.target.value } })}
                placeholder={customer?.address ? `Địa chỉ (mặc định: ${customer.address})` : "Địa chỉ giao hàng"}
                className="w-full border border-gray-300 rounded-md px-2.5 py-1.5 text-sm"
              />
            </div>
          )}

          {overStockCount > 0 && (
            <div className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
              Có {overStockCount} sản phẩm vượt tồn kho — kho sẽ bị âm sau khi bán. Bạn vẫn có thể thanh toán.
            </div>
          )}
          {error && <div className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-md px-3 py-2">{error}</div>}
        </div>

        <div className="p-4 border-t border-gray-200">
          <button
            onClick={onSubmit}
            disabled={!canSubmit}
            className="w-full h-12 rounded-md bg-brand-600 hover:bg-brand-700 disabled:bg-gray-300 text-white font-bold tracking-wide flex items-center justify-center gap-2"
          >
            {submitting && <Loader2 size={18} className="animate-spin" />}
            THANH TOÁN
          </button>
        </div>
      </aside>

      {showBigQr && qrUrl && bank && (
        <div className="fixed inset-0 z-[60] bg-black/70 flex items-center justify-center p-4" onClick={() => setShowBigQr(false)}>
          <div className="bg-white rounded-2xl p-6 text-center max-w-sm w-full" onClick={(e) => e.stopPropagation()}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrUrl} alt="VietQR" className="w-full rounded-lg" />
            <div className="mt-3 text-lg font-bold text-brand-700">{formatCurrency(total)}</div>
            <div className="text-sm text-gray-600">
              {bank.name} · {bank.account}
            </div>
            <button onClick={() => setShowBigQr(false)} className="mt-4 text-sm text-gray-500 hover:text-gray-800">
              Đóng
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function Line({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-700">{label}</span>
      <span className="text-gray-900">{value}</span>
    </div>
  );
}

// Đồng hồ trên ngăn thanh toán (dựng lại mỗi lần ngăn mở nên luôn đúng giờ hiện tại).
function ClockText() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    return () => clearInterval(timer);
  }, []);
  return (
    <span className="text-gray-500">
      {now.toLocaleDateString("vi-VN")} {now.toLocaleTimeString("vi-VN", { hour: "2-digit", minute: "2-digit" })}
    </span>
  );
}
