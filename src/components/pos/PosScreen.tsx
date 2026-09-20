"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Clock,
  Filter,
  ImageIcon,
  LayoutGrid,
  List,
  LogOut,
  Menu,
  PenLine,
  Plus,
  Printer,
  RefreshCw,
  ShoppingBag,
  Truck,
  X,
  Zap,
} from "lucide-react";
import { CustomerModal } from "@/components/customers/CustomerModal";
import { PrintSettingsModal } from "@/components/print/PrintSettingsModal";
import { Receipt } from "@/components/print/Receipt";
import { logout } from "@/app/(auth)/actions";
import { createPosOrder } from "@/app/(pos)/ban-hang/actions";
import { consumedStock, formatNumber, lineTotal } from "@/lib/pricing";
import { printReceipt, usePrintSettings } from "@/lib/print-settings";
import type { ReceiptData } from "@/lib/receipt";
import { useCurrentUser } from "@/lib/user-context";
import type { Customer, OrderCategory, Product } from "@/types/db";
import { PaymentDrawer, defaultStatus } from "./PaymentDrawer";
import { QuickCustomerModal, ShortcutsModal, SuccessDialog } from "./PosDialogs";
import { PosCart } from "./PosCart";
import { CustomerSearchBox, priceSuffix, ProductSearchBox, ProductThumb } from "./PosSearch";
import { usePosDrafts, usePosPrefs, type CartLine, type Draft, type PosMode } from "./pos-state";

const MODES: Array<{ value: PosMode; label: string; icon: typeof Zap; hint: string }> = [
  { value: "quick", label: "Bán nhanh", icon: Zap, hint: "Thanh toán tiền mặt ngay, không qua bước xác nhận" },
  { value: "normal", label: "Bán thường", icon: Clock, hint: "Chọn khách, giảm giá, hình thức thanh toán" },
  { value: "delivery", label: "Bán giao hàng", icon: Truck, hint: "Có thông tin người nhận & địa chỉ giao" },
];

const GRID_PAGE_SIZE = 18;
const LIST_PAGE_SIZE = 24;

export function PosScreen({
  products,
  customers,
  categories,
  customerPrices,
  debtByCustomerId,
}: {
  products: Product[];
  customers: Customer[];
  categories: OrderCategory[];
  customerPrices: Record<string, Record<string, number>>;
  debtByCustomerId: Record<string, number>;
}) {
  const router = useRouter();
  const { profile, activeOrg, activeOrgId, isManager } = useCurrentUser();
  const printSettings = usePrintSettings();
  const { drafts, active, updateActive, setActiveId, addDraft, closeDraft } = usePosDrafts(`qf-pos:${activeOrgId}:${profile.id}`);
  const [prefs, updatePrefs] = usePosPrefs(`qf-pos-prefs:${profile.id}`);

  const productInputRef = useRef<HTMLInputElement | null>(null);
  const customerInputRef = useRef<HTMLInputElement | null>(null);

  const [extraCustomers, setExtraCustomers] = useState<Customer[]>([]);
  const [page, setPage] = useState(1);
  const [mobileTab, setMobileTab] = useState<"products" | "cart">("products");
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [success, setSuccess] = useState<{ receipt: ReceiptData; orderId: string } | null>(null);
  const [printJob, setPrintJob] = useState<{ data: ReceiptData; n: number } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [filterOpen, setFilterOpen] = useState(false);
  const [printSettingsOpen, setPrintSettingsOpen] = useState(false);
  const [shortcutsOpen, setShortcutsOpen] = useState(false);
  const [quickCustomerOpen, setQuickCustomerOpen] = useState(false);
  const [customerInfoOpen, setCustomerInfoOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const filterRef = useRef<HTMLDivElement>(null);

  const allCustomers = useMemo(() => {
    const ids = new Set(customers.map((c) => c.id));
    return [...customers, ...extraCustomers.filter((c) => !ids.has(c.id))];
  }, [customers, extraCustomers]);
  const productMap = useMemo(() => new Map(products.map((p) => [p.id, p])), [products]);
  const categoryNames = useMemo(
    () => Array.from(new Set(products.map((p) => p.category).filter((c): c is string => Boolean(c)))).sort((a, b) => a.localeCompare(b, "vi")),
    [products]
  );

  const draft: Draft = active;
  const lines = useMemo(() => draft.lines.filter((l) => productMap.has(l.productId)), [draft.lines, productMap]);
  const customer = useMemo(() => allCustomers.find((c) => c.id === draft.customerId) ?? null, [allCustomers, draft.customerId]);
  const debt = customer ? debtByCustomerId[customer.id] ?? 0 : 0;

  // Giá đang áp dụng: giá admin sửa tay > giá riêng của khách > giá niêm yết
  const listPriceOf = useCallback(
    (product: Product) => {
      const special = draft.customerId ? customerPrices[draft.customerId]?.[product.id] : undefined;
      return { price: special ?? Number(product.sale_price), custom: special !== undefined };
    },
    [draft.customerId, customerPrices]
  );
  const priceOf = useCallback(
    (line: CartLine, product: Product) => {
      const listed = listPriceOf(product);
      if (line.unitPrice != null && isManager) return { price: line.unitPrice, custom: false };
      return listed;
    },
    [listPriceOf, isManager]
  );

  const money = useMemo(() => {
    let subtotal = 0;
    let itemCount = 0;
    let overStock = 0;
    let missing = 0;
    for (const l of lines) {
      const p = productMap.get(l.productId)!;
      const { price } = priceOf(l, p);
      subtotal += lineTotal({ pricingUnit: p.pricing_unit, quantity: l.quantity, width: l.width, height: l.height, unitPrice: price });
      itemCount += Number(l.quantity) || 0;
      if (consumedStock({ pricingUnit: p.pricing_unit, quantity: l.quantity, width: l.width, height: l.height }) > Number(p.stock_quantity)) overStock++;
      if (!(l.quantity > 0) || (p.pricing_unit === "area" && (!(l.width > 0) || !(l.height > 0))) || (p.pricing_unit === "length" && !(l.height > 0))) missing++;
    }
    const discountAmount = draft.discountPct
      ? Math.round((subtotal * Math.min(Math.max(draft.discount, 0), 100)) / 100)
      : Math.min(Math.max(draft.discount, 0), subtotal);
    return { subtotal, itemCount, overStock, missing, discountAmount, total: subtotal - discountAmount };
  }, [lines, productMap, priceOf, draft.discount, draft.discountPct]);

  const showToast = useCallback((message: string) => {
    setToast(message);
    setTimeout(() => setToast((t) => (t === message ? null : t)), 3200);
  }, []);

  // ---- thao tác giỏ hàng -------------------------------------------------
  function addProduct(product: Product) {
    const isPiece = product.pricing_unit === "piece";
    const key = crypto.randomUUID();
    updateActive((d) => {
      const existing = isPiece ? d.lines.find((l) => l.productId === product.id) : undefined;
      if (existing) {
        return { ...d, lines: d.lines.map((l) => (l.key === existing.key ? { ...l, quantity: Number(l.quantity) + 1 } : l)) };
      }
      return { ...d, lines: [...d.lines, { key, productId: product.id, quantity: 1, width: 0, height: 0, unitPrice: null }] };
    });
    if (!isPiece) setFocusKey(key);
    if (window.matchMedia("(max-width: 1023px)").matches) showToast(`Đã thêm: ${product.name}`);
  }

  function changeLine(key: string, patch: Partial<CartLine>) {
    updateActive((d) => ({ ...d, lines: d.lines.map((l) => (l.key === key ? { ...l, ...patch } : l)) }));
  }
  function removeLine(key: string) {
    updateActive((d) => ({ ...d, lines: d.lines.filter((l) => l.key !== key) }));
  }

  // ---- thanh toán ---------------------------------------------------------
  function requestPayment() {
    if (lines.length === 0) {
      showToast("Chưa có sản phẩm nào trong hóa đơn.");
      return;
    }
    if (money.missing > 0) {
      showToast("Còn sản phẩm chưa nhập đủ số lượng / số đo.");
      setMobileTab("cart");
      return;
    }
    setError(null);
    if (prefs.mode === "quick") {
      void submitOrder(true);
      return;
    }
    setPaymentOpen(true);
  }

  async function submitOrder(quick = false) {
    setSubmitting(true);
    setError(null);
    const method = quick ? "cash" : draft.paymentMethod;
    const result = await createPosOrder({
      customerId: draft.customerId,
      categoryId: draft.categoryId,
      paymentMethod: method,
      transferReceived: draft.transferReceived,
      discount: money.discountAmount,
      status: quick ? "hoan_thanh" : (draft.status ?? defaultStatus(prefs.mode)),
      note: draft.note.trim() || null,
      delivery:
        prefs.mode === "delivery"
          ? {
              name: draft.delivery.name || customer?.name || "",
              phone: draft.delivery.phone || customer?.phone || "",
              address: draft.delivery.address || customer?.address || "",
            }
          : null,
      cashGiven: quick ? null : draft.cashGiven,
      items: lines.map((l) => ({
        productId: l.productId,
        quantity: Number(l.quantity),
        width: productMap.get(l.productId)?.pricing_unit === "area" ? l.width : null,
        height: productMap.get(l.productId)?.pricing_unit === "piece" ? null : l.height,
        unitPrice: isManager ? priceOf(l, productMap.get(l.productId)!).price : undefined,
      })),
    });
    setSubmitting(false);

    if ("error" in result) {
      setError(result.error);
      if (quick) showToast(result.error);
      return;
    }

    closeDraft(draft.id);
    setPaymentOpen(false);
    setSuccess({ receipt: result.receipt, orderId: result.orderId });
    if (printSettings.autoPrint) triggerPrint(result.receipt);
  }

  function triggerPrint(data: ReceiptData) {
    setPrintJob((prev) => ({ data, n: (prev?.n ?? 0) + 1 }));
  }

  useEffect(() => {
    if (printJob) printReceipt(printSettings.paper);
    // chỉ in khi có lệnh in mới (n thay đổi)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [printJob?.n]);

  function testPrint() {
    const sample: ReceiptData = {
      code: "DH-IN-THU",
      createdAt: new Date().toISOString(),
      cashier: profile.display_name || "Thu ngân",
      statusLabel: "Hoàn thành",
      customerName: "Khách hàng mẫu",
      customerPhone: "0900 000 000",
      customerAddress: "Địa chỉ mẫu",
      lines: [
        { name: "Vải rèm mẫu", pricingUnit: "area", quantity: 1, width: 2.4, height: 2.6, unitPrice: 168000, lineTotal: 1048320 },
        { name: "Ray rèm nhôm", pricingUnit: "length", quantity: 2, width: null, height: 3, unitPrice: 78000, lineTotal: 468000 },
        { name: "Móc rèm (bộ)", pricingUnit: "piece", quantity: 3, width: null, height: null, unitPrice: 25000, lineTotal: 75000 },
      ],
      subtotal: 1591320,
      discount: 0,
      total: 1591320,
      paymentMethod: "cash",
      paymentStatus: "paid",
      cashGiven: 1600000,
      note: "Đây là hóa đơn in thử.",
    };
    triggerPrint(sample);
  }

  // ---- phím tắt + đóng menu khi bấm ra ngoài -------------------------------
  const requestPaymentRef = useRef(requestPayment);
  requestPaymentRef.current = requestPayment;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "F3") {
        e.preventDefault();
        productInputRef.current?.focus();
        productInputRef.current?.select();
      } else if (e.key === "F4") {
        e.preventDefault();
        customerInputRef.current?.focus();
      } else if (e.key === "F9") {
        e.preventDefault();
        requestPaymentRef.current();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "n" && !e.shiftKey) {
        e.preventDefault();
        addDraft();
      }
    };
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) setFilterOpen(false);
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [addDraft]);

  // ---- lưới hàng hóa ------------------------------------------------------
  const gridProducts = useMemo(
    () => (prefs.category ? products.filter((p) => p.category === prefs.category) : products),
    [products, prefs.category]
  );
  const pageSize = prefs.view === "grid" ? GRID_PAGE_SIZE : LIST_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(gridProducts.length / pageSize));
  const safePage = Math.min(page, pageCount);
  const pageItems = gridProducts.slice((safePage - 1) * pageSize, safePage * pageSize);

  const bank =
    activeOrg.bank_bin && activeOrg.bank_account_number
      ? { bin: activeOrg.bank_bin, account: activeOrg.bank_account_number, name: activeOrg.bank_account_name }
      : null;

  return (
    <div className="h-dvh flex flex-col bg-[#eef1f5] text-gray-800 overflow-hidden">
      {/* ------------------------------------------------ thanh trên cùng */}
      <header className="bg-brand-600 shrink-0 flex flex-wrap lg:flex-nowrap items-center gap-x-2 pl-2 pr-1 min-h-[52px] lg:h-[52px] text-white">
        <div className="flex-1 lg:flex-none min-w-0 lg:w-[400px] my-2 lg:my-0">
          <ProductSearchBox
            products={products}
            priceOf={listPriceOf}
            onPick={addProduct}
            inputRef={productInputRef}
          />
        </div>

        <div className="order-last basis-full lg:order-none lg:basis-auto lg:flex-1 min-w-0 flex items-end gap-1 overflow-x-auto h-10 lg:h-full lg:self-end lg:pt-2">
          {drafts.map((d) => {
            const isActive = d.id === draft.id;
            const count = d.lines.reduce((s, l) => s + (Number(l.quantity) || 0), 0);
            return (
              <div
                key={d.id}
                className={`group flex items-center gap-1.5 pl-3 pr-1.5 h-[38px] rounded-t-md text-sm whitespace-nowrap cursor-pointer select-none ${
                  isActive ? "bg-[#eef1f5] text-brand-800 font-semibold" : "bg-white/15 hover:bg-white/25 text-white"
                }`}
                onClick={() => setActiveId(d.id)}
              >
                {d.label}
                {count > 0 && (
                  <span className={`text-[11px] rounded-full px-1.5 ${isActive ? "bg-brand-600 text-white" : "bg-white/30"}`}>{formatNumber(count)}</span>
                )}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (d.lines.length > 0 && !confirm(`Đóng "${d.label}"? Các sản phẩm trong hóa đơn này sẽ bị xóa.`)) return;
                    closeDraft(d.id);
                  }}
                  className={`rounded p-0.5 ${isActive ? "text-gray-400 hover:text-red-500" : "text-white/70 hover:text-white"}`}
                  title="Đóng hóa đơn"
                >
                  <X size={14} />
                </button>
              </div>
            );
          })}
          <button
            onClick={addDraft}
            title="Thêm hóa đơn (Ctrl + N)"
            className="self-center ml-1 w-8 h-8 rounded-full flex items-center justify-center text-white/90 hover:bg-white/15 shrink-0"
          >
            <Plus size={20} />
          </button>
        </div>

        <div className="flex items-center gap-0.5 shrink-0">
          <Link href="/don-hang" title="Tra cứu đơn hàng" className="p-2 rounded-md hover:bg-white/15">
            <ShoppingBag size={19} />
          </Link>
          <button onClick={() => router.refresh()} title="Tải lại hàng hóa / khách hàng" className="p-2 rounded-md hover:bg-white/15">
            <RefreshCw size={18} />
          </button>
          <button onClick={() => setPrintSettingsOpen(true)} title="Cài đặt in hóa đơn" className="p-2 rounded-md hover:bg-white/15">
            <Printer size={19} />
          </button>
          <span className="hidden sm:block ml-2 mr-1 text-sm font-medium max-w-32 truncate">{profile.display_name || "Tài khoản"}</span>
          <div className="relative" ref={menuRef}>
            <button onClick={() => setMenuOpen((v) => !v)} className="p-2 rounded-md hover:bg-white/15" title="Menu">
              <Menu size={22} />
            </button>
            {menuOpen && (
              <div className="absolute right-0 top-full mt-2 w-64 bg-white text-gray-800 rounded-xl shadow-2xl border border-gray-200 py-2 z-50 text-sm">
                <MenuLink href="/bao-cao" label="Xem báo cáo cuối ngày" />
                <MenuLink href="/don-hang" label="Tra cứu đơn hàng" />
                <MenuLink href="/khach-hang" label="Khách hàng & công nợ" />
                <MenuButton
                  label="Cài đặt in hóa đơn"
                  onClick={() => {
                    setMenuOpen(false);
                    setPrintSettingsOpen(true);
                  }}
                />
                <MenuButton
                  label="Phím tắt"
                  onClick={() => {
                    setMenuOpen(false);
                    setShortcutsOpen(true);
                  }}
                />
                <MenuLink href="/" label="Quản lý" />
                <form action={logout}>
                  <button type="submit" className="w-full flex items-center gap-2 px-5 py-2.5 text-left hover:bg-gray-50">
                    <LogOut size={16} className="text-gray-500" /> Đăng xuất
                  </button>
                </form>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ------------------------------------------------ thân trang */}
      <div className="flex-1 min-h-0 flex">
        {/* Giỏ hàng (trái) */}
        <section className={`flex-1 min-w-0 flex-col p-3 gap-3 ${mobileTab === "cart" ? "flex" : "hidden"} lg:flex`}>
          <div className="flex-1 min-h-0 rounded-lg bg-[#e6eaf0]/60 border border-gray-200/70 overflow-hidden">
            <PosCart
              lines={lines}
              productMap={productMap}
              priceOf={priceOf}
              canEditPrice={isManager}
              focusKey={focusKey}
              onChange={changeLine}
              onRemove={removeLine}
            />
          </div>

          <div className="shrink-0 bg-white rounded-lg border border-gray-200 px-4 py-3 flex items-center gap-4">
            <PenLine size={16} className="text-gray-400 shrink-0" />
            <input
              value={draft.note}
              onChange={(e) => updateActive((d) => ({ ...d, note: e.target.value }))}
              placeholder="Ghi chú đơn hàng"
              className="flex-1 min-w-0 text-sm focus:outline-none placeholder:text-gray-400"
            />
            <div className="text-sm text-gray-600 whitespace-nowrap">
              Tổng tiền hàng <span className="ml-1 font-semibold text-gray-800">{formatNumber(money.itemCount)}</span>
            </div>
            <div className="text-lg font-bold text-gray-900 min-w-24 text-right">{formatNumber(money.subtotal)}</div>
          </div>
        </section>

        {/* Chọn khách + hàng hóa (phải) */}
        <aside
          className={`w-full lg:w-[500px] xl:w-[600px] shrink-0 flex-col p-3 pl-0 lg:pl-0 ${mobileTab === "products" ? "flex" : "hidden"} lg:flex`}
        >
          <div className="flex-1 min-h-0 bg-white rounded-lg border border-gray-200 flex flex-col overflow-visible lg:ml-0 ml-3">
            <div className="p-3 flex items-center gap-2 shrink-0 relative z-20">
              <div className="flex-1 min-w-0">
                <CustomerSearchBox
                  customers={allCustomers}
                  selected={customer}
                  debt={debt}
                  inputRef={customerInputRef}
                  onSelect={(c) => updateActive((d) => ({ ...d, customerId: c.id }))}
                  onClear={() => updateActive((d) => ({ ...d, customerId: null, paymentMethod: d.paymentMethod === "debt" ? "cash" : d.paymentMethod }))}
                  onOpenInfo={() => setCustomerInfoOpen(true)}
                  onAddNew={() => setQuickCustomerOpen(true)}
                />
              </div>
              <div className="flex items-center gap-0.5 text-gray-500 shrink-0">
                <button
                  onClick={() => updatePrefs({ view: prefs.view === "grid" ? "list" : "grid" })}
                  title={prefs.view === "grid" ? "Xem dạng danh sách" : "Xem dạng lưới"}
                  className="p-2 rounded-md hover:bg-gray-100"
                >
                  {prefs.view === "grid" ? <List size={19} /> : <LayoutGrid size={19} />}
                </button>
                <div className="relative" ref={filterRef}>
                  <button
                    onClick={() => setFilterOpen((v) => !v)}
                    title="Lọc theo danh mục"
                    className={`p-2 rounded-md hover:bg-gray-100 ${prefs.category ? "text-brand-700 bg-brand-50" : ""}`}
                  >
                    <Filter size={19} />
                  </button>
                  {filterOpen && (
                    <div className="absolute right-0 top-full mt-1 w-56 max-h-72 overflow-y-auto bg-white rounded-lg shadow-xl border border-gray-200 py-1 z-50 text-sm text-gray-700">
                      {[null, ...categoryNames].map((name) => (
                        <button
                          key={name ?? "all"}
                          onClick={() => {
                            updatePrefs({ category: name });
                            setPage(1);
                            setFilterOpen(false);
                          }}
                          className={`w-full text-left px-4 py-2 hover:bg-gray-50 ${prefs.category === name ? "text-brand-700 font-semibold" : ""}`}
                        >
                          {name ?? "Tất cả danh mục"}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => updatePrefs({ showImages: !prefs.showImages })}
                  title={prefs.showImages ? "Ẩn ảnh sản phẩm" : "Hiện ảnh sản phẩm"}
                  className={`p-2 rounded-md hover:bg-gray-100 ${prefs.showImages ? "text-brand-700" : ""}`}
                >
                  <ImageIcon size={19} />
                </button>
              </div>
            </div>

            <div className="pos-scroll flex-1 min-h-0 overflow-y-auto px-2 pb-2">
              {pageItems.length === 0 && (
                <div className="py-16 text-center text-sm text-gray-400">
                  {products.length === 0 ? "Chưa có hàng hóa nào. Vào Quản lý → Hàng hóa để thêm." : "Không có hàng hóa trong danh mục này."}
                </div>
              )}
              <div className={prefs.view === "grid" ? "grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-x-1 gap-y-1" : "flex flex-col"}>
                {pageItems.map((p) => {
                  const { price, custom } = listPriceOf(p);
                  const stock = Number(p.stock_quantity);
                  return (
                    <button
                      key={p.id}
                      onClick={() => addProduct(p)}
                      className={`text-left rounded-lg hover:bg-brand-50 active:bg-brand-100 transition flex items-center gap-2.5 p-2 ${
                        prefs.view === "list" ? "border-b border-gray-100 rounded-none" : ""
                      }`}
                    >
                      {prefs.showImages && <ProductThumb product={p} size={prefs.view === "grid" ? 56 : 44} />}
                      <div className="min-w-0 flex-1">
                        <div className={`text-[13px] leading-snug text-gray-800 ${prefs.view === "grid" ? "line-clamp-3" : "truncate"}`}>{p.name}</div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className={`text-sm font-semibold ${custom ? "text-brand-600" : "text-brand-700"}`}>
                            {formatNumber(price)}
                            <span className="text-[10px] font-normal text-gray-400">{priceSuffix(p)}</span>
                          </span>
                          {prefs.view === "list" && (
                            <span className={`text-xs ${stock <= 0 ? "text-red-500" : "text-gray-400"}`}>
                              Tồn {formatNumber(stock)} {p.unit}
                            </span>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="shrink-0 border-t border-gray-100 p-3 flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm text-gray-600">
                <button
                  disabled={safePage <= 1}
                  onClick={() => setPage(safePage - 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center"
                >
                  <ChevronLeft size={16} />
                </button>
                <span className="px-2 tabular-nums">
                  {safePage}/{pageCount}
                </span>
                <button
                  disabled={safePage >= pageCount}
                  onClick={() => setPage(safePage + 1)}
                  className="w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 disabled:opacity-40 flex items-center justify-center"
                >
                  <ChevronRight size={16} />
                </button>
              </div>
              <button
                onClick={requestPayment}
                title="Thanh toán (F9)"
                className="flex-1 h-12 rounded-md bg-brand-600 hover:bg-brand-700 active:bg-brand-800 text-white font-bold tracking-wide flex items-center justify-center gap-3"
              >
                THANH TOÁN
                {money.total > 0 && <span className="text-sm font-medium bg-white/20 rounded px-2 py-0.5">{formatNumber(money.total)}</span>}
              </button>
            </div>
          </div>
        </aside>
      </div>

      {/* ------------------------------------------------ thanh dưới: chế độ bán */}
      <footer className="shrink-0 bg-white border-t border-gray-200 h-14 flex items-center justify-between px-3">
        <div className="flex items-stretch h-full">
          {MODES.map((m) => {
            const Icon = m.icon;
            const isActive = prefs.mode === m.value;
            return (
              <button
                key={m.value}
                onClick={() => updatePrefs({ mode: m.value })}
                title={m.hint}
                className={`flex items-center gap-2 px-4 text-sm font-medium border-t-2 ${
                  isActive ? "border-brand-600 text-brand-800 bg-brand-50/60" : "border-transparent text-gray-600 hover:bg-gray-50"
                }`}
              >
                <span className={`w-7 h-7 rounded-full flex items-center justify-center ${isActive ? "bg-brand-100 text-brand-700" : "bg-gray-100 text-gray-500"}`}>
                  <Icon size={15} />
                </span>
                <span className="hidden sm:inline">{m.label}</span>
              </button>
            );
          })}
        </div>
        <div className="hidden md:block text-xs text-gray-400 truncate max-w-72">
          {activeOrg.business_name} · {isManager ? "Quản trị viên" : "Nhân viên"}
        </div>
        <div className="lg:hidden flex rounded-full bg-gray-100 p-0.5 text-xs font-medium">
          <button onClick={() => setMobileTab("products")} className={`px-3 py-1.5 rounded-full ${mobileTab === "products" ? "bg-brand-600 text-white" : "text-gray-600"}`}>
            Hàng hóa
          </button>
          <button onClick={() => setMobileTab("cart")} className={`px-3 py-1.5 rounded-full ${mobileTab === "cart" ? "bg-brand-600 text-white" : "text-gray-600"}`}>
            Hóa đơn ({formatNumber(money.itemCount)})
          </button>
        </div>
      </footer>

      {toast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-[80] bg-gray-900 text-white text-sm rounded-lg px-4 py-2.5 shadow-lg">{toast}</div>
      )}

      <PaymentDrawer
        open={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        draft={draft}
        mode={prefs.mode}
        customer={customer}
        debt={debt}
        itemCount={money.itemCount}
        subtotal={money.subtotal}
        discountAmount={money.discountAmount}
        total={money.total}
        cashierName={profile.display_name || "Thu ngân"}
        categories={categories}
        bank={bank}
        overStockCount={money.overStock}
        submitting={submitting}
        error={error}
        onChange={(patch) => updateActive((d) => ({ ...d, ...patch }))}
        onSubmit={() => void submitOrder(false)}
      />

      <QuickCustomerModal
        open={quickCustomerOpen}
        onClose={() => setQuickCustomerOpen(false)}
        initialName=""
        onCreated={(c) => {
          setExtraCustomers((prev) => [...prev, c]);
          updateActive((d) => ({ ...d, customerId: c.id }));
          setQuickCustomerOpen(false);
          showToast(`Đã thêm và chọn khách hàng: ${c.name}`);
        }}
      />

      <CustomerModal
        open={customerInfoOpen}
        onClose={() => {
          setCustomerInfoOpen(false);
          router.refresh();
        }}
        customer={customer}
        canEdit={isManager}
        products={products}
      />

      <PrintSettingsModal open={printSettingsOpen} onClose={() => setPrintSettingsOpen(false)} onTestPrint={testPrint} />
      <ShortcutsModal open={shortcutsOpen} onClose={() => setShortcutsOpen(false)} />

      <SuccessDialog
        receipt={success?.receipt ?? null}
        orderId={success?.orderId ?? null}
        onPrint={() => success && triggerPrint(success.receipt)}
        onClose={() => {
          setSuccess(null);
          productInputRef.current?.focus();
        }}
      />

      <Receipt data={printJob?.data ?? null} shopName={activeOrg.business_name} bank={bank} settings={printSettings} />
    </div>
  );
}

function MenuLink({ href, label }: { href: string; label: string }) {
  return (
    <Link href={href} className="block px-5 py-2.5 hover:bg-gray-50">
      {label}
    </Link>
  );
}

function MenuButton({ label, onClick }: { label: string; onClick: () => void }) {
  return (
    <button onClick={onClick} className="w-full text-left px-5 py-2.5 hover:bg-gray-50">
      {label}
    </button>
  );
}
