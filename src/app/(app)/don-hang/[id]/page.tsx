import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { OrderActions } from "@/components/orders/OrderActions";
import { OrderPrint } from "@/components/orders/OrderPrint";
import { Badge } from "@/components/ui/Badge";
import { getVietQrImageUrl } from "@/lib/vietqr";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { dimensionLabel, formatNumber } from "@/lib/pricing";
import { receiptFromOrder } from "@/lib/receipt";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type Order, type OrderStatus } from "@/types/db";

const STATUS_COLOR: Record<OrderStatus, "gray" | "purple" | "blue" | "green" | "orange" | "red"> = {
  cho_xac_nhan: "blue",
  dang_xu_ly: "orange",
  dang_giao: "purple",
  hoan_thanh: "green",
  da_huy: "red",
};

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentUser();
  if (!current) redirect("/dang-nhap");
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, customers(*), order_items(*), order_categories(name), profiles(display_name)")
    .eq("id", id)
    .eq("org_id", current.activeOrgId)
    .single<Order>();

  if (!order) notFound();

  const org = current.activeOrg!;
  const bank =
    org.bank_bin && org.bank_account_number
      ? { bin: org.bank_bin, account: org.bank_account_number, name: org.bank_account_name }
      : null;
  const showQr = order.payment_method === "qr" && order.payment_status === "unpaid" && bank;
  const items = order.order_items ?? [];
  const receipt = receiptFromOrder(order, order.profiles?.display_name ?? "—");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Link href="/don-hang" className="w-9 h-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50 flex items-center justify-center text-gray-600" title="Về danh sách đơn hàng">
            <ArrowLeft size={17} />
          </Link>
          <div>
            <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2 flex-wrap">
              Hóa đơn {order.code}
              <Badge color={STATUS_COLOR[order.status]}>{ORDER_STATUS_LABEL[order.status]}</Badge>
            </h1>
            <p className="text-sm text-gray-500">Tạo lúc {formatDateTime(order.created_at)}</p>
          </div>
        </div>
        <OrderPrint receipt={receipt} shopName={org.business_name} bank={bank} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 items-start">
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4 text-sm">
            <Info label="Khách hàng" value={order.customers?.name ?? "Khách vãng lai"} sub={[order.customers?.phone, order.customers?.address].filter(Boolean).join(" · ")} />
            <Info label="Người bán" value={order.profiles?.display_name ?? "—"} sub={order.order_categories?.name ? `Loại đơn: ${order.order_categories.name}` : undefined} />
            {order.note && (
              <div className="sm:col-span-2">
                <div className="text-xs text-gray-400 mb-0.5">Ghi chú</div>
                <div className="text-gray-700 whitespace-pre-line">{order.note}</div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-600 bg-brand-50/70 border-b border-gray-200 text-xs font-semibold">
                    <th className="px-4 py-2.5 w-10">#</th>
                    <th className="px-4 py-2.5">Sản phẩm</th>
                    <th className="px-4 py-2.5 text-right">Kích thước</th>
                    <th className="px-4 py-2.5 text-right">Đơn giá</th>
                    <th className="px-4 py-2.5 text-right">SL</th>
                    <th className="px-4 py-2.5 text-right">Thành tiền</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={it.id} className="border-b border-gray-100 last:border-0">
                      <td className="px-4 py-2.5 text-gray-400">{i + 1}</td>
                      <td className="px-4 py-2.5 text-gray-800">{it.product_name}</td>
                      <td className="px-4 py-2.5 text-right text-gray-500 text-xs">
                        {dimensionLabel(it) || "—"}
                        {it.width && it.height ? ` = ${formatNumber(Number(it.width) * Number(it.height))} m²` : ""}
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">
                        {formatCurrency(it.unit_price)}
                        <span className="text-gray-400 text-xs">{it.width && it.height ? "/m²" : it.height ? "/m" : ""}</span>
                      </td>
                      <td className="px-4 py-2.5 text-right text-gray-600">{formatNumber(Number(it.quantity))}</td>
                      <td className="px-4 py-2.5 text-right font-medium text-gray-900">{formatCurrency(it.line_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="bg-white rounded-lg border border-gray-200 p-5 text-sm space-y-2.5">
            <Row label="Tổng tiền hàng" value={formatCurrency(order.subtotal)} />
            <Row label="Giảm giá" value={Number(order.discount) > 0 ? `-${formatCurrency(order.discount)}` : "0đ"} />
            <div className="flex items-center justify-between pt-2.5 border-t border-gray-100">
              <span className="font-semibold text-gray-900">Khách cần trả</span>
              <span className="text-xl font-bold text-brand-700">{formatCurrency(order.total_amount)}</span>
            </div>
            <Row label="Hình thức" value={PAYMENT_METHOD_LABEL[order.payment_method]} />
            <div className="flex items-center justify-between">
              <span className="text-gray-500">Tình trạng</span>
              <Badge color={order.payment_status === "paid" ? "green" : "orange"}>{order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}</Badge>
            </div>

            {showQr && bank && (
              <div className="pt-3 border-t border-gray-100 flex flex-col items-center">
                <p className="text-xs text-gray-500 mb-2">Quét mã QR để chuyển khoản</p>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getVietQrImageUrl({
                    bankBin: bank.bin,
                    accountNumber: bank.account,
                    accountName: bank.name ?? undefined,
                    amount: order.total_amount,
                    addInfo: `Thanh toan ${order.code}`,
                  })}
                  alt="VietQR"
                  className="w-48 h-auto rounded-lg border border-gray-100"
                />
                <p className="text-xs text-gray-400 mt-2">
                  {bank.name} · {bank.account}
                </p>
              </div>
            )}
            {order.payment_method === "qr" && !bank && (
              <p className="text-xs text-amber-600 pt-2">Chưa thiết lập tài khoản ngân hàng nhận thanh toán. Vào mục Cài đặt để cập nhật.</p>
            )}
          </div>

          <div className="bg-white rounded-lg border border-gray-200 p-5">
            <div className="text-sm font-semibold text-gray-800 mb-3">Xử lý đơn hàng</div>
            <OrderActions order={order} isManager={current.isManager} />
          </div>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <div className="text-xs text-gray-400 mb-0.5">{label}</div>
      <div className="font-medium text-gray-800">{value}</div>
      {sub && <div className="text-xs text-gray-500 mt-0.5">{sub}</div>}
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-500">{label}</span>
      <span className="text-gray-800">{value}</span>
    </div>
  );
}
