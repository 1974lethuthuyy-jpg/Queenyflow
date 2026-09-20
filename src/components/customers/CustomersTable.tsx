"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ChevronLeft, ChevronRight, Download, Plus, Search, Trash2, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CheckItem, FilterPanel, FilterSection, FilterSelect, RadioItem } from "@/components/ui/FilterPanel";
import { formatCurrency } from "@/lib/format";
import { matchesQuery } from "@/lib/search";
import { toDisplayImageUrl } from "@/lib/supabase/proxy-url";
import { deleteCustomer } from "@/app/(app)/khach-hang/actions";
import { CustomerModal } from "./CustomerModal";
import type { Customer, CustomerGroup, Product } from "@/types/db";

const GROUPS: CustomerGroup[] = ["Mới", "Thường", "Thân thiết", "VIP", "Tiềm năng", "Ngừng giao dịch"];
const GROUP_COLOR: Record<CustomerGroup, "gray" | "purple" | "blue" | "green" | "orange" | "red"> = {
  Mới: "blue",
  Thường: "gray",
  "Thân thiết": "green",
  VIP: "purple",
  "Tiềm năng": "orange",
  "Ngừng giao dịch": "red",
};
const PAGE_SIZE = 50;

export function CustomersTable({
  customers,
  isManager,
  debtByCustomerId = {},
  soldByCustomerId = {},
  products = [],
}: {
  customers: Customer[];
  isManager: boolean;
  debtByCustomerId?: Record<string, number>;
  soldByCustomerId?: Record<string, number>;
  products?: Product[];
}) {
  const router = useRouter();
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<Customer | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [groups, setGroups] = useState<Set<CustomerGroup>>(new Set());
  const [region, setRegion] = useState("");
  const [debtFilter, setDebtFilter] = useState<"all" | "debt" | "clear">("all");
  const [page, setPage] = useState(1);

  const regions = useMemo(() => Array.from(new Set(customers.map((c) => c.region).filter((r): r is string => Boolean(r)))).sort((a, b) => a.localeCompare(b, "vi")), [customers]);

  const filtered = useMemo(
    () =>
      customers.filter((c) => {
        if (groups.size && !groups.has(c.group_tag)) return false;
        if (region && c.region !== region) return false;
        const debt = debtByCustomerId[c.id] ?? 0;
        if (debtFilter === "debt" && debt <= 0) return false;
        if (debtFilter === "clear" && debt > 0) return false;
        if (query && !matchesQuery(query, c.name, c.phone, c.email, c.region, c.address)) return false;
        return true;
      }),
    [customers, groups, region, debtFilter, query, debtByCustomerId]
  );

  const totals = useMemo(
    () => ({
      debt: filtered.reduce((s, c) => s + (debtByCustomerId[c.id] ?? 0), 0),
      sold: filtered.reduce((s, c) => s + (soldByCustomerId[c.id] ?? 0), 0),
    }),
    [filtered, debtByCustomerId, soldByCustomerId]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function open(c: Customer | null) {
    setSelected(c);
    setModalOpen(true);
  }

  async function handleDelete(c: Customer) {
    if (!confirm(`Xoá khách hàng "${c.name}"?`)) return;
    setBusyId(c.id);
    await deleteCustomer(c.id);
    setBusyId(null);
  }

  function exportCsv() {
    const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Tên khách hàng", "Điện thoại", "Email", "Khu vực", "Địa chỉ", "Nhóm", "Nợ hiện tại", "Tổng bán"];
    const lines = filtered.map((c) =>
      [c.name, c.phone, c.email, c.region, c.address, c.group_tag, debtByCustomerId[c.id] ?? 0, soldByCustomerId[c.id] ?? 0].map(esc).join(",")
    );
    const blob = new Blob(["﻿" + [header.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "khach-hang.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <FilterPanel>
        <FilterSection title="Nhóm khách hàng">
          {GROUPS.map((g) => (
            <CheckItem
              key={g}
              label={g}
              checked={groups.has(g)}
              count={customers.filter((c) => c.group_tag === g).length}
              onChange={(on) => {
                const next = new Set(groups);
                if (on) next.add(g);
                else next.delete(g);
                setGroups(next);
                setPage(1);
              }}
            />
          ))}
        </FilterSection>
        <FilterSection title="Công nợ">
          <RadioItem label="Tất cả" checked={debtFilter === "all"} onChange={() => { setDebtFilter("all"); setPage(1); }} />
          <RadioItem label="Đang nợ" checked={debtFilter === "debt"} onChange={() => { setDebtFilter("debt"); setPage(1); }} />
          <RadioItem label="Không nợ" checked={debtFilter === "clear"} onChange={() => { setDebtFilter("clear"); setPage(1); }} />
        </FilterSection>
        {regions.length > 0 && (
          <FilterSection title="Khu vực">
            <FilterSelect value={region} onChange={(v) => { setRegion(v); setPage(1); }}>
              <option value="">Tất cả khu vực</option>
              {regions.map((r) => (
                <option key={r} value={r}>
                  {r}
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
              onChange={(e) => {
                setQuery(e.target.value);
                setPage(1);
              }}
              placeholder="Tìm theo tên, số điện thoại, khu vực, địa chỉ"
              className="w-full h-10 bg-white border border-gray-300 rounded-md pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportCsv} className="flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700">
              <Download size={16} /> Xuất file
            </button>
            <button onClick={() => open(null)} className="flex items-center gap-1.5 h-10 px-4 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
              <Plus size={16} /> Khách hàng
            </button>
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 bg-brand-50/70 border-b border-gray-200 text-xs font-semibold">
                  <th className="px-3 py-2.5">Khách hàng</th>
                  <th className="px-3 py-2.5">Điện thoại</th>
                  <th className="px-3 py-2.5">Khu vực</th>
                  <th className="px-3 py-2.5">Nhóm</th>
                  <th className="px-3 py-2.5 text-right">Nợ hiện tại</th>
                  <th className="px-3 py-2.5 text-right">Tổng bán</th>
                  {isManager && <th className="px-3 py-2.5 w-10" />}
                </tr>
              </thead>
              <tbody>
                {filtered.length > 0 && (
                  <tr className="bg-gray-50/70 font-semibold text-gray-800 border-b border-gray-200">
                    <td className="px-3 py-2" colSpan={4}>
                      Tổng ({filtered.length} khách hàng)
                    </td>
                    <td className="px-3 py-2 text-right text-red-500">{formatCurrency(totals.debt)}</td>
                    <td className="px-3 py-2 text-right">{formatCurrency(totals.sold)}</td>
                    {isManager && <td />}
                  </tr>
                )}
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 7 : 6} className="text-center text-gray-400 py-14">
                      {customers.length === 0 ? "Chưa có khách hàng nào." : "Không tìm thấy khách hàng phù hợp."}
                    </td>
                  </tr>
                )}
                {rows.map((c) => (
                  <tr key={c.id} className="border-b border-gray-100 hover:bg-brand-50/40">
                    <td className="px-3 py-2.5 cursor-pointer" onClick={() => open(c)}>
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-full bg-brand-50 border border-brand-100 overflow-hidden flex items-center justify-center shrink-0">
                          {c.avatar_url ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img src={toDisplayImageUrl(c.avatar_url)} alt={c.name} className="w-full h-full object-cover" />
                          ) : (
                            <User size={16} className="text-brand-300" />
                          )}
                        </div>
                        <div>
                          <div className="font-medium text-brand-800">{c.name}</div>
                          {c.email && <div className="text-xs text-gray-400">{c.email}</div>}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-2.5 text-gray-600">{c.phone || "—"}</td>
                    <td className="px-3 py-2.5 text-gray-600">{c.region || "—"}</td>
                    <td className="px-3 py-2.5">
                      <Badge color={GROUP_COLOR[c.group_tag]}>{c.group_tag}</Badge>
                    </td>
                    <td className="px-3 py-2.5 text-right">
                      {debtByCustomerId[c.id] ? <span className="text-red-500 font-medium">{formatCurrency(debtByCustomerId[c.id])}</span> : <span className="text-gray-400">0</span>}
                    </td>
                    <td className="px-3 py-2.5 text-right text-gray-700">{formatCurrency(soldByCustomerId[c.id] ?? 0)}</td>
                    {isManager && (
                      <td className="px-3 py-2.5">
                        <button onClick={() => handleDelete(c)} disabled={busyId === c.id} className="text-gray-400 hover:text-red-600 disabled:opacity-50" title="Xóa khách hàng">
                          <Trash2 size={16} />
                        </button>
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 border-t border-gray-100">
            <span>
              Hiển thị {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} khách hàng
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

      <CustomerModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          router.refresh();
        }}
        customer={selected}
        canEdit={isManager}
        products={products}
      />
    </div>
  );
}
