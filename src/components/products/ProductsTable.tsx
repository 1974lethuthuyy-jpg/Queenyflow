"use client";

import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Download, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CheckItem, FilterPanel, FilterSection, RadioItem } from "@/components/ui/FilterPanel";
import { formatCurrency } from "@/lib/format";
import { formatNumber } from "@/lib/pricing";
import { matchesQuery } from "@/lib/search";
import { toDisplayImageUrl } from "@/lib/supabase/proxy-url";
import { deleteProduct } from "@/app/(app)/san-pham/actions";
import { ProductModal } from "./ProductModal";
import type { PricingUnit, Product } from "@/types/db";

const PRICING_LABEL: Record<PricingUnit, string> = { piece: "Theo cái/bộ", area: "Theo m² (dài × rộng)", length: "Theo mét dài" };
const PRICE_SUFFIX: Record<PricingUnit, string> = { piece: "", area: "/m²", length: "/m" };
const PAGE_SIZE = 50;

export function ProductsTable({ products, isManager }: { products: Product[]; isManager: boolean }) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string | null>(null);
  const [stockFilter, setStockFilter] = useState<"all" | "low" | "in" | "out">("all");
  const [units, setUnits] = useState<Set<PricingUnit>>(new Set());
  const [status, setStatus] = useState<"active" | "inactive" | "all">("active");
  const [page, setPage] = useState(1);

  const categories = useMemo(() => {
    const counts = new Map<string, number>();
    for (const p of products) if (p.category) counts.set(p.category, (counts.get(p.category) ?? 0) + 1);
    return Array.from(counts.entries()).sort((a, b) => a[0].localeCompare(b[0], "vi"));
  }, [products]);

  const filtered = useMemo(
    () =>
      products.filter((p) => {
        if (status !== "all" && p.status !== status) return false;
        if (category && p.category !== category) return false;
        if (units.size && !units.has(p.pricing_unit)) return false;
        const stock = Number(p.stock_quantity);
        if (stockFilter === "low" && !(stock > 0 && stock <= Number(p.low_stock_threshold))) return false;
        if (stockFilter === "in" && !(stock > 0)) return false;
        if (stockFilter === "out" && !(stock <= 0)) return false;
        if (query && !matchesQuery(query, p.name, p.sku, p.category)) return false;
        return true;
      }),
    [products, status, category, units, stockFilter, query]
  );

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const reset = <T,>(setter: (v: T) => void) => (v: T) => {
    setter(v);
    setPage(1);
  };

  function openCreate() {
    setEditing(null);
    setModalOpen(true);
  }
  function openEdit(p: Product) {
    setEditing(p);
    setModalOpen(true);
  }
  async function handleDelete(p: Product) {
    if (!confirm(`Xoá sản phẩm "${p.name}"? Hành động này không thể hoàn tác.`)) return;
    setBusyId(p.id);
    await deleteProduct(p.id);
    setBusyId(null);
  }

  function exportCsv() {
    const esc = (v: string | number | null | undefined) => `"${String(v ?? "").replace(/"/g, '""')}"`;
    const header = ["Mã hàng", "Tên hàng", "Danh mục", "Cách tính giá", "Đơn vị", "Giá vốn", "Giá bán", "Tồn kho", "Trạng thái"];
    const lines = filtered.map((p) =>
      [p.sku, p.name, p.category, PRICING_LABEL[p.pricing_unit], p.unit, p.cost_price, p.sale_price, p.stock_quantity, p.status === "active" ? "Đang kinh doanh" : "Ngừng kinh doanh"].map(esc).join(",")
    );
    const blob = new Blob(["﻿" + [header.map(esc).join(","), ...lines].join("\r\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hang-hoa.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="flex flex-col lg:flex-row gap-4 items-start">
      <FilterPanel>
        <FilterSection title="Danh mục">
          <RadioItem label="Tất cả" checked={category === null} onChange={() => reset(setCategory)(null)} />
          {categories.map(([name, count]) => (
            <label key={name} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer">
              <input type="radio" checked={category === name} onChange={() => reset(setCategory)(name)} className="w-4 h-4 accent-brand-600" />
              <span className="flex-1">{name}</span>
              <span className="text-xs text-gray-400">{count}</span>
            </label>
          ))}
        </FilterSection>
        <FilterSection title="Tồn kho">
          <RadioItem label="Tất cả" checked={stockFilter === "all"} onChange={() => reset(setStockFilter)("all")} />
          <RadioItem label="Sắp hết hàng" checked={stockFilter === "low"} onChange={() => reset(setStockFilter)("low")} />
          <RadioItem label="Còn hàng" checked={stockFilter === "in"} onChange={() => reset(setStockFilter)("in")} />
          <RadioItem label="Hết hàng / âm kho" checked={stockFilter === "out"} onChange={() => reset(setStockFilter)("out")} />
        </FilterSection>
        <FilterSection title="Cách tính giá">
          {(Object.keys(PRICING_LABEL) as PricingUnit[]).map((u) => (
            <CheckItem
              key={u}
              label={PRICING_LABEL[u]}
              checked={units.has(u)}
              onChange={(on) => {
                const next = new Set(units);
                if (on) next.add(u);
                else next.delete(u);
                reset(setUnits)(next);
              }}
            />
          ))}
        </FilterSection>
        <FilterSection title="Trạng thái">
          <RadioItem label="Đang kinh doanh" checked={status === "active"} onChange={() => reset(setStatus)("active")} />
          <RadioItem label="Ngừng kinh doanh" checked={status === "inactive"} onChange={() => reset(setStatus)("inactive")} />
          <RadioItem label="Tất cả" checked={status === "all"} onChange={() => reset(setStatus)("all")} />
        </FilterSection>
      </FilterPanel>

      <div className="flex-1 min-w-0 w-full">
        <div className="flex flex-wrap items-center gap-2 mb-3">
          <div className="relative flex-1 min-w-52 max-w-xl">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => reset(setQuery)(e.target.value)}
              placeholder="Tìm theo tên hàng, mã hàng, danh mục"
              className="w-full h-10 bg-white border border-gray-300 rounded-md pl-9 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button onClick={exportCsv} className="flex items-center gap-1.5 h-10 px-3 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-sm font-medium text-gray-700">
              <Download size={16} /> Xuất file
            </button>
            {isManager && (
              <button onClick={openCreate} className="flex items-center gap-1.5 h-10 px-4 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold">
                <Plus size={16} /> Hàng hóa
              </button>
            )}
          </div>
        </div>

        <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-gray-600 bg-brand-50/70 border-b border-gray-200 text-xs font-semibold">
                  <th className="px-3 py-2.5">Hàng hóa</th>
                  <th className="px-3 py-2.5">Danh mục</th>
                  <th className="px-3 py-2.5">Cách tính giá</th>
                  <th className="px-3 py-2.5 text-right">Giá vốn</th>
                  <th className="px-3 py-2.5 text-right">Giá bán</th>
                  <th className="px-3 py-2.5 text-right">Tồn kho</th>
                  <th className="px-3 py-2.5">Trạng thái</th>
                  {isManager && <th className="px-3 py-2.5 w-20" />}
                </tr>
              </thead>
              <tbody>
                {filtered.length === 0 && (
                  <tr>
                    <td colSpan={isManager ? 8 : 7} className="text-center text-gray-400 py-14">
                      {products.length === 0 ? "Chưa có hàng hóa nào." : "Không có hàng hóa nào khớp bộ lọc."}
                    </td>
                  </tr>
                )}
                {rows.map((p) => {
                  const stock = Number(p.stock_quantity);
                  const low = stock <= Number(p.low_stock_threshold);
                  return (
                    <tr key={p.id} className="border-b border-gray-100 hover:bg-brand-50/40">
                      <td className="px-3 py-2.5">
                        <div className="flex items-center gap-2.5">
                          <div className="w-10 h-10 rounded-md bg-brand-50 border border-brand-100 overflow-hidden flex items-center justify-center shrink-0">
                            {p.image_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={toDisplayImageUrl(p.image_url)} alt={p.name} className="w-full h-full object-cover" />
                            ) : (
                              <Package size={16} className="text-brand-300" />
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-gray-800">{p.name}</div>
                            <div className="text-xs text-gray-400">{p.sku || "—"}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-2.5 text-gray-600">{p.category || "—"}</td>
                      <td className="px-3 py-2.5 text-xs text-gray-500">{PRICING_LABEL[p.pricing_unit]}</td>
                      <td className="px-3 py-2.5 text-right text-gray-600">
                        {formatCurrency(p.cost_price)}
                        <span className="text-gray-400 text-xs">{PRICE_SUFFIX[p.pricing_unit]}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right text-gray-900 font-medium">
                        {formatCurrency(p.sale_price)}
                        <span className="text-gray-400 font-normal text-xs">{PRICE_SUFFIX[p.pricing_unit]}</span>
                      </td>
                      <td className="px-3 py-2.5 text-right">
                        {low ? (
                          <Badge color={stock <= 0 ? "red" : "orange"}>
                            {formatNumber(stock)} {p.unit}
                          </Badge>
                        ) : (
                          <span className="text-gray-700">
                            {formatNumber(stock)} {p.unit}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5">
                        <Badge color={p.status === "active" ? "green" : "gray"}>{p.status === "active" ? "Đang kinh doanh" : "Ngừng kinh doanh"}</Badge>
                      </td>
                      {isManager && (
                        <td className="px-3 py-2.5">
                          <div className="flex items-center gap-2">
                            <button onClick={() => openEdit(p)} className="text-gray-400 hover:text-brand-700" title="Sửa">
                              <Pencil size={16} />
                            </button>
                            <button onClick={() => handleDelete(p)} disabled={busyId === p.id} className="text-gray-400 hover:text-red-600 disabled:opacity-50" title="Xóa">
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between px-4 py-2.5 text-xs text-gray-500 border-t border-gray-100">
            <span>
              Hiển thị {filtered.length === 0 ? 0 : (safePage - 1) * PAGE_SIZE + 1}–{Math.min(safePage * PAGE_SIZE, filtered.length)} / {filtered.length} hàng hóa
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

      <ProductModal open={modalOpen} onClose={() => setModalOpen(false)} product={editing} />
    </div>
  );
}
