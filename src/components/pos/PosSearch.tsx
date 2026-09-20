"use client";

import { useMemo, useState } from "react";
import { ImageIcon, Plus, Search, User, X } from "lucide-react";
import { formatCurrency } from "@/lib/format";
import { formatNumber } from "@/lib/pricing";
import { matchesQuery, normalizeText } from "@/lib/search";
import { toDisplayImageUrl } from "@/lib/supabase/proxy-url";
import type { Customer, Product } from "@/types/db";

export function ProductThumb({ product, size = 44 }: { product: Product; size?: number }) {
  return (
    <div
      className="rounded-md bg-brand-50 border border-brand-100 overflow-hidden flex items-center justify-center shrink-0 text-brand-300"
      style={{ width: size, height: size }}
    >
      {product.image_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={toDisplayImageUrl(product.image_url)} alt="" className="w-full h-full object-cover" />
      ) : (
        <ImageIcon size={Math.round(size * 0.45)} />
      )}
    </div>
  );
}

export function priceSuffix(product: Product) {
  return product.pricing_unit === "area" ? "/m²" : product.pricing_unit === "length" ? "/m" : "";
}

// Ô "Tìm hàng hóa (F3)": gõ tên/mã, ↑↓ chọn, Enter thêm vào giỏ. Gõ đúng mã hàng rồi Enter = thêm ngay (như quét mã vạch).
export function ProductSearchBox({
  products,
  priceOf,
  onPick,
  inputRef,
}: {
  products: Product[];
  priceOf: (product: Product) => { price: number; custom: boolean };
  onPick: (product: Product) => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return [];
    const nq = normalizeText(q);
    return products
      .filter((p) => matchesQuery(q, p.name, p.sku, p.category))
      .sort((a, b) => Number(normalizeText(b.sku) === nq) - Number(normalizeText(a.sku) === nq))
      .slice(0, 40);
  }, [products, query]);

  function pick(product: Product) {
    onPick(product);
    setQuery("");
    setOpen(false);
    setHighlight(0);
  }

  function onKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setOpen(true);
      setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlight((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      const target = results[highlight] ?? results[0];
      if (target) pick(target);
    } else if (e.key === "Escape") {
      setOpen(false);
      setQuery("");
    }
  }

  return (
    <div className="relative w-full">
      <div className="relative">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={onKeyDown}
          placeholder="Tìm hàng hóa (F3)"
          className="w-full h-9 rounded-md bg-white text-sm text-gray-800 pl-9 pr-3 focus:outline-none focus:ring-2 focus:ring-brand-300"
        />
      </div>
      {open && query.trim() && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="pos-scroll absolute left-0 top-full mt-1 w-[min(520px,92vw)] max-h-[70vh] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50 text-gray-800"
        >
          {results.length === 0 && <div className="px-4 py-6 text-center text-sm text-gray-400">Không tìm thấy hàng hóa.</div>}
          {results.map((p, i) => {
            const { price, custom } = priceOf(p);
            const stock = Number(p.stock_quantity);
            return (
              <button
                key={p.id}
                type="button"
                onMouseEnter={() => setHighlight(i)}
                onClick={() => pick(p)}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left border-b border-gray-50 ${
                  i === highlight ? "bg-brand-50" : ""
                }`}
              >
                <ProductThumb product={p} />
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium truncate">{p.name}</div>
                  <div className="text-xs text-gray-400 truncate">
                    {p.sku || "—"} · Tồn:{" "}
                    <span className={stock <= 0 ? "text-red-500" : ""}>
                      {formatNumber(stock)} {p.unit}
                    </span>
                  </div>
                </div>
                <div className="text-right shrink-0">
                  <div className={`text-sm font-semibold ${custom ? "text-brand-700" : ""}`}>
                    {formatCurrency(price)}
                    <span className="text-gray-400 font-normal text-xs">{priceSuffix(p)}</span>
                  </div>
                  {custom && <div className="text-[10px] text-brand-600">Giá riêng</div>}
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Ô "Tìm khách hàng (F4)" kèm nút + thêm nhanh. Khi đã chọn khách thì hiện thẻ khách hàng.
export function CustomerSearchBox({
  customers,
  selected,
  debt,
  onSelect,
  onClear,
  onOpenInfo,
  onAddNew,
  inputRef,
}: {
  customers: Customer[];
  selected: Customer | null;
  debt: number;
  onSelect: (customer: Customer) => void;
  onClear: () => void;
  onOpenInfo: () => void;
  onAddNew: () => void;
  inputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [query, setQuery] = useState("");
  const [open, setOpen] = useState(false);
  const [highlight, setHighlight] = useState(0);

  const results = useMemo(() => {
    const q = query.trim();
    if (!q) return customers.slice(0, 30);
    return customers.filter((c) => matchesQuery(q, c.name, c.phone, c.region, c.address)).slice(0, 40);
  }, [customers, query]);

  function pick(c: Customer) {
    onSelect(c);
    setQuery("");
    setOpen(false);
    setHighlight(0);
  }

  if (selected) {
    return (
      <div className="flex items-center gap-2 h-10 rounded-md border border-gray-300 bg-white px-3">
        <User size={16} className="text-brand-600 shrink-0" />
        <button type="button" onClick={onOpenInfo} className="min-w-0 flex-1 text-left truncate text-sm font-medium text-brand-700 hover:underline">
          {selected.name}
          {selected.phone && <span className="text-gray-500 font-normal"> · {selected.phone}</span>}
        </button>
        {debt > 0 && <span className="text-xs text-red-500 bg-red-50 rounded px-1.5 py-0.5 shrink-0">Nợ: {formatCurrency(debt)}</span>}
        <button type="button" onClick={onClear} title="Bỏ chọn khách" className="text-gray-400 hover:text-red-500 shrink-0">
          <X size={16} />
        </button>
      </div>
    );
  }

  return (
    <div className="relative">
      <div className="flex items-center h-10 rounded-md border border-gray-300 bg-white focus-within:border-brand-500 focus-within:ring-2 focus-within:ring-brand-100">
        <Search size={15} className="ml-3 text-gray-400 shrink-0" />
        <input
          ref={inputRef}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
            setHighlight(0);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={(e) => {
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setHighlight((h) => Math.min(h + 1, Math.max(results.length - 1, 0)));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setHighlight((h) => Math.max(h - 1, 0));
            } else if (e.key === "Enter") {
              e.preventDefault();
              if (results[highlight]) pick(results[highlight]);
            } else if (e.key === "Escape") {
              setOpen(false);
            }
          }}
          placeholder="Tìm khách hàng (F4)"
          className="flex-1 min-w-0 h-full px-2 text-sm bg-transparent focus:outline-none"
        />
        <button type="button" onClick={onAddNew} title="Thêm khách hàng mới" className="px-3 h-full text-gray-500 hover:text-brand-700">
          <Plus size={18} />
        </button>
      </div>
      {open && (
        <div
          onMouseDown={(e) => e.preventDefault()}
          className="pos-scroll absolute left-0 right-0 top-full mt-1 max-h-[60vh] overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 z-50"
        >
          {results.length === 0 && (
            <div className="px-4 py-5 text-center text-sm text-gray-400">
              Không tìm thấy khách hàng.
              <button type="button" onClick={onAddNew} className="block mx-auto mt-2 text-brand-700 font-medium hover:underline">
                + Thêm khách hàng mới
              </button>
            </div>
          )}
          {results.map((c, i) => (
            <button
              key={c.id}
              type="button"
              onMouseEnter={() => setHighlight(i)}
              onClick={() => pick(c)}
              className={`w-full flex items-start justify-between gap-3 px-4 py-2.5 text-left border-b border-gray-50 ${
                i === highlight ? "bg-brand-50" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="text-sm text-gray-800 truncate">{c.name}</div>
                <div className="text-xs text-gray-400 truncate">{c.region || c.address || c.group_tag}</div>
              </div>
              <div className="text-sm font-semibold text-brand-600 shrink-0">{c.phone}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
