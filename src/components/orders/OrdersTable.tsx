"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Loader2, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CheckItem, FilterPanel, FilterSection, FilterSelect, RadioItem } from "@/components/ui/FilterPanel";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { detectPreset, presetRange, type RangePreset } from "@/lib/dates";
import { matchesQuery } from "@/lib/search";
import { deleteOrder } from "@/app/(app)/don-hang/actions";
import {
  ORDER_STATUS_LABEL,
  PAYMENT_METHOD_LABEL,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@/types/db";

const STATUS_COLOR: Record<OrderStatus, "gray" | "purple" | "blue" | "green" | "orange" | "red"> = {
  cho_xac_nhan: "blue",
  dang_xu_ly: "orange",
  dang_giao: "purple",
  hoan_thanh: "green",
  da_huy: "red",
};

const STATUSES: OrderStatus[] = ["cho_xac_nhan", "dang_xu_ly", "dang_giao", "hoan_thanh", "da_huy"];
const METHODS: PaymentMethod[] = ["cash", "qr", "debt"];
const PRESETS: Array<{ key: Exclude<RangePreset, "custom">; label: string }> = [
  { key: "today", label: "Hôm nay" },
  { key: "week", label: "Tuần này" },
  { key: "month", label: "Tháng này" },
  { key: "lastmonth", label: "Tháng trước" },
];
const PAGE_SIZE = 50;

function toggle<T>(set: Set<T>, value: T, on: boolean) {
  const next = new Set(set);
  if (on) next.add(value);
  else next.delete(value);
  return next;
}

export function OrdersTable({
  orders,
  isManager,
  from,
  to,
  initialQuery,
  truncated,
}: {
  orders: Order[];
  isManager: boolean;
  from: string;
  to: string;
  initialQuery: string;
  truncated: boolean;
}) {
  const router = useRouter();
  const [navigating, startNavigation] = useTransition();
  const [statuses, setStatuses] = useState<Set<OrderStatus>>(new Set());
  const [methods, setMethods] = useState<Set<PaymentMethod>>(new Set());
  const [paid, setPaid] = useState<"all" | "paid" | "unpaid">("all");
  const [category, setCategory] = useState("");
  const [seller, setSeller] = useState("");
  const [query, setQuery] = useState(initialQuery);
  const [page, setPage] = useState(1);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [customFrom, setCustomFrom] = useState(from);
  const [customTo, setCustomTo] = useState(to);

  const preset = detectPreset(from, to);

  function goRange(nextFrom: string, nextTo: string) {
    if (!nextFrom || !nextTo || nextFrom > nextTo) return;
    startNavigation(() => router.push(`/don-hang?from=${nextFrom}&to=${nextTo}`));
  }

  const categories = useMemo(() => Array.from(new Set(orders.map((o) => o.order_categories?.name).filter((n): n is string => Boolean(n)))).sort(), [orders]);
  const sellers = useMemo(() => Array.from(new Set(orders.map((o) => o.profiles?.display_name).filter((n): n is string => Boolean(n)))).sort(), [orders]);

  const filtered = useMemo(
    () =>
      orders.filter((o) => {
        if (statuses.size && !statuses.has(o.status)) return false;
        if (methods.size && !methods.has(o.payment_method)) return false;
        if (paid !== "all" && o.payment_status !== paid) return false;
        if (category && o.order_categories?.name !== category) return false;
        if (seller && o.profiles?.display_name !== seller) return false;
        if (query && !matchesQuery(query, o.code, o.customers?.name, o.customers?.phone, o.note)) return false;
        return true;
      }),
    [orders, statuses, methods, paid, category, seller, query]
  );

  const totals = useMemo(() => {
    const active = filtered.filter((o) => o.status !== "da_huy");
    return {
      subtotal: active.reduce((s, o) => s + Number(o.subtotal), 0),
      discount: active.reduce((s, o) => s + Number(o.discount), 0),
      total: active.reduce((s, o) => s + Number(o.total_amount), 0),
    };
  }, [filtered]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  async function handleDelete(o: Order) {
    if (!confirm(`Xoá đơn hàng ${o.code}? Hành động này không thể hoàn tác.`)) return;
    setBusyId(o.id);
    await deleteOrder(o.id);
    setBusyId(null);
    router.refresh();
  }

  function exportCsv() {
    const header = ["Mã đơn", "Thời gian", "Khách hàng", "Điện thoại", "Loại đơn", "Tổng tiền hàng", "Giảm giá", "Khách cần trả", "Thanh toán", "Tình trạng thu tiền", "Trạng thái", "Người bán", "Ghi chú"];
    const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const lines = filtered.map((o) =>
      [
        o.code,
        formatDateTime(o.created_at),
        o.customers?.name ?? "Khách vãng lai",
        o.customers?.phone ?? "",
        o.order_categories?.name ?? "",
        o.subtotal,
        o.discount,
        o.total_amount,
        PAYMENT_METHOD_LABEL[o.payment_method],
        o.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán",
        ORDER_STATUS_LABEL[o.status],
        o.profiles?.display_name ?? "",
        o.note ?? "",
      ]
        .map(esc)
        .join(",")
    );
    const blob = new Blob(["﻿" + [header.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `don-hang_${from}_${to}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  function resetPage<T>(setter: (v: T) => void) {
    return (v: T) => {
      setter(v);
      setPage(1);
    };
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <FilterPanel>
        <FilterSection title="Thời gian">
          {PRESETS.map((p) => (
            <RadioItem key={p.key} label={p.label} checked={preset === p.key} onChange={() => { const r = presetRange(p.key); goRange(r.from, r.to); }} />
          ))}
          <RadioItem label="Tùy chỉnh" checked={preset === "custom"} onChange={() => goRange(customFrom, customTo)} />
          <div className="space-y-1.5 pt-1">
            <input
              type="date"
              value={customFrom}
              onChange={(e) => setCustomFrom(e.target.value)}
              onBlur={() => customFrom !== from && goRange(customFrom, customTo)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
            <input
              type="date"
              value={customTo}
              onChange={(e) => setCustomTo(e.target.value)}
              onBlur={() => customTo !== to && goRange(customFrom, customTo)}
              className="w-full border border-gray-300 rounded-md px-2 py-1.5 text-sm"
            />
          </div>
        </FilterSection>

        <FilterSection title="Trạng thái đơn">
          {STATUSES.map((s) => (
            <CheckItem
              key={s}
              label={ORDER_STATUS_LABEL[s]}
              checked={statuses.has(s)}
              count={orders.filter((o) => o.status === s).length}
              onChange={(on) => resetPage(setStatuses)(toggle(statuses, s, on))}
            />
          ))}
        </FilterSection>

        <FilterSection title="Hình thức thanh toán">
          {METHODS.map((m) => (
            <CheckItem key={m} label={PAYMENT_METHOD_LABEL[m]} checked={methods.has(m)} onChange={(on) => resetPage(setMethods)(toggle(methods, m, on))} />
          ))}
        </FilterSection>

        <FilterSection title="Tình trạng thu tiền">
          <RadioItem label="Tất cả" checked={paid === "all"} onChange={() => resetPage(setPaid)("all")} />
          <RadioItem label="Đã thanh toán" checked={paid === "paid"} onChange={() => resetPage(setPaid)("paid")} />
          <RadioItem label="Chưa thanh toán (nợ)" checked={paid === "unpaid"} onChange={() => resetPage(setPaid)("unpaid")} />
        </FilterSection>

        {categories.length > 0 && (
          <FilterSection title="Loại đơn hàng">
            <FilterSelect value={category} onChange={resetPage(setCategory)}>
              <option value="">Tất cả</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterSelect>
          </FilterSection>
        )}

        {sellers.length > 1 && (
          <FilterSection title="Người bán">
            <FilterSelect value={seller} onChange={resetPage(setSeller)}>
              <option value="">Tất cả</option>
              {sellers.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </FilterSelect>
          </FilterSection>
        )}
      </FilterPanel>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-52 max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => resetPage(setQuery)(e.target.value)}
              placeholder="Tìm theo mã hóa đơn, tên khách, SĐT, ghi chú"
              className="w-full h-10 bg-white border border-gray-300 rounded-md pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          {navigating && <Loader2 size={18} className="animate-spin text-brand-600" />}
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportCsv} className="flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700">
              <Download size={16} /> Xuất file
            </button>
            <Link href="/ban-hang" className="flex items-center gap-1.5 h-10 px-4 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
              <Plus size={16} /> Bán hàng
            </Link>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 bg-brand-50/70 border-b border-gray-200 text-xs font-semibold">
                  <th className="px-3 py-2.5">Mã hóa đơn</th>
                  <th className="px-3 py-2.5">Thời gian</th>
                  <th className="px-3 py-2.5">Khách hàng</th>
                  <th className="px-3 py-2.5">Loại đơn</th>
                  <th className="px-3 py-2.5 text-right">Tổng tiền hàng</th>
                  <th className="px-3 py-2.5 text-right">Giảm giá</th>
                  <th className="px-3 py-2.5 text-right">Khách cần trả</th>
                  <th className="px-3 py-2.5">Thanh toán</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  <th className="px-3 py-2.5">Người bán</th>
                  {isManager && <th className="px-3 py-2.5 w-10" />}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 && (
                  <tr className="bg-gray-50/70 font-semibold text-gray-800 border-b border-gray-200">
                    <td className="px-3 py-2" colSpan={4}>
                      Tổng ({filtered.filter((o) => o.status !== "da_huy").length} đơn, không tính đơn hủy)
                    </td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totals.subtotal)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totals.discount)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totals.total)}</td>
                    <td colSpan={isManager ? 4 : 3} />
                  </tr>
                )}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 11 : 10} className="text-center text-gray-400 py-14">
                      {orders.length === 0 ? "Không có đơn hàng nào trong khoảng thời gian này." : "Không có đơn hàng nào khớp bộ lọc."}
                    </td>
                  </tr>
                )}
                {rows.map((o) => (
                  <tr key={o.id} className="border-b border-gray-100 hover:bg-brand-50/40">
                    <td className="px-3 py-2.5 whitespace-nowrap">
                      <Link href={`/don-hang/${o.id}`} className="font-medium text-brand-700 hover:underline">
                        {o.code}
                      </Link>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600 whitespace-nowrap">{formatDateTime(o.created_at)}</td>
                    <td className="px-3 py-2.5 text-gray-800">
                      <div>{o.customers?.name ?? "Khách vãng lai"}</div>
                      {o.customers?.phone && <div className="text-xs text-gray-400">{o.customers.phone}</div>}
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs">{o.order_categories?.name ?? "—"}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700 whitespace-nowrap">{formatCurrency(o.subtotal)}</td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{Number(o.discount) ? formatCurrency(o.discount) : "0"}</td>
                    <td className="px-3 py-2.5 text-right font-semibold text-gray-900 whitespace-nowrap">{formatCurrency(o.total_amount)}</td>
                    <td className="px-3 py-2.5">
                      <div className="flex flex-col gap-1 items-start">
                        <span className="text-xs text-gray-600">{PAYMENT_METHOD_LABEL[o.payment_method]}</span>
                        <Badge color={o.payment_status === "paid" ? "green" : "orange"}>{o.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</Badge>
                      </div>
                    </td>
                    <td className="px-3 py-2.5">
                      <Badge color={STATUS_COLOR[o.status]}>{ORDER_STATUS_LABEL[o.status]}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-gray-500 text-xs whitespace-nowrap">{o.profiles?.display_name ?? "—"}</td>
                    {isManager && (
                      <td className="px-3 py-2.5">
                        <button onClick={() => handleDelete(o)} disabled={busyId === o.id} className="text-gray-400 hover:text-red-600 disabled:opacity-50" title="Xóa đơn">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-xs text-gray-500 border-t border-gray-100">
            <span>
              Hiển thị {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} đơn
              {truncated && " (chỉ hiện 1000 đơn mới nhất — hãy thu hẹp khoảng thời gian)"}
            </span>
            <div className="flex items-center gap-1">
              <button disabled={safePage <= 1} onClick={() => setPage(safePage - 1)} className="w-7 h-7 rounded border border-gray-200 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50">
                <ChevronLeft size={15} />
              </button>
              <span className="px-2">
                {safePage}/{pageCount}
              </span>
              <button disabled={safePage >= pageCount} onClick={() => setPage(safePage + 1)} className="w-7 h-7 rounded border border-gray-200 disabled:opacity-40 flex items-center justify-center hover:bg-gray-50">
                <ChevronRight size={15} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
