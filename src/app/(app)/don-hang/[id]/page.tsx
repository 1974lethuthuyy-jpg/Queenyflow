import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getCurrentUser } from "@/lib/session";
import { OrderActions } from "@/components/orders/OrderActions";
import { PrintButton } from "@/components/orders/PrintButton";
import { getVietQrImageUrl } from "@/lib/vietqr";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { ORDER_STATUS_LABEL, PAYMENT_METHOD_LABEL, type Order } from "@/types/db";

export default async function OrderDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const current = await getCurrentUser();
  const supabase = await createClient();

  const { data: order } = await supabase
    .from("orders")
    .select("*, customers(*), order_items(*), order_categories(name)")
    .eq("id", id)
    .eq("org_id", current!.activeOrgId)
    .single<Order>();

  if (!order) notFound();

  const org = current!.activeOrg!;
  const showQr =
    order.payment_method === "qr" &&
    order.payment_status === "unpaid" &&
    org.bank_bin &&
    org.bank_account_number;

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between flex-wrap gap-3 print:hidden">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">Hóa đơn {order.code}</h1>
          <p className="text-sm text-gray-500">Tạo lúc {formatDateTime(order.created_at)}</p>
        </div>
        <div className="flex items-center gap-3">
          <PrintButton />
          <OrderActions order={order} isManager={current!.isManager} />
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-8 print:border-none print:shadow-none">
        <div className="flex items-start justify-between border-b border-gray-100 pb-4 mb-4">
          <div>
            <div className="font-bold text-lg text-purple-700">{org.business_name}</div>
            <div className="text-xs text-gray-400">Hóa đơn bán hàng</div>
          </div>
          <div className="text-right">
            <div className="font-semibold text-gray-800">{order.code}</div>
            <div className="text-xs text-gray-400">{formatDateTime(order.created_at)}</div>
            <div className="text-xs text-gray-400 mt-1">{ORDER_STATUS_LABEL[order.status]}</div>
            {order.order_categories?.name && (
              <div className="text-xs text-purple-600 mt-1">{order.order_categories.name}</div>
            )}
          </div>
        </div>

        <div className="mb-4 text-sm">
          <div className="text-gray-400 mb-1">Khách hàng</div>
          <div className="font-medium text-gray-800">{order.customers?.name ?? "Khách vãng lai"}</div>
          {order.customers?.phone && <div className="text-gray-500">{order.customers.phone}</div>}
          {order.customers?.address && <div className="text-gray-500">{order.customers.address}</div>}
        </div>

        <table className="w-full text-sm mb-4">
          <thead>
            <tr className="text-left text-gray-400 border-b border-gray-100">
              <th className="py-2 font-medium">Sản phẩm</th>
              <th className="py-2 font-medium text-right">Đơn giá</th>
              <th className="py-2 font-medium text-right">SL</th>
              <th className="py-2 font-medium text-right">Thành tiền</th>
            </tr>
          </thead>
          <tbody>
            {(order.order_items ?? []).map((it) => (
              <tr key={it.id} className="border-b border-gray-50">
                <td className="py-2 text-gray-700">{it.product_name}</td>
                <td className="py-2 text-right text-gray-600">{formatCurrency(it.unit_price)}</td>
                <td className="py-2 text-right text-gray-600">{it.quantity}</td>
                <td className="py-2 text-right font-medium text-gray-800">{formatCurrency(it.line_total)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex justify-end">
          <div className="w-64 space-y-1.5 text-sm">
            <div className="flex justify-between text-gray-500">
              <span>Tạm tính</span>
              <span>{formatCurrency(order.subtotal)}</span>
            </div>
            <div className="flex justify-between text-gray-500">
              <span>Giảm giá</span>
              <span>-{formatCurrency(order.discount)}</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-800 border-t border-gray-100 pt-1.5">
              <span>Tổng cộng</span>
              <span>{formatCurrency(order.total_amount)}</span>
            </div>
            <div className="flex justify-between text-gray-500 pt-1">
              <span>Thanh toán</span>
              <span>{PAYMENT_METHOD_LABEL[order.payment_method]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Trạng thái</span>
              <span className={order.payment_status === "paid" ? "text-green-600 font-medium" : "text-orange-600 font-medium"}>
                {order.payment_status === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}
              </span>
            </div>
          </div>
        </div>

        {order.note && (
          <div className="mt-4 text-sm text-gray-500 border-t border-gray-100 pt-3">
            <span className="text-gray-400">Ghi chú: </span>
            {order.note}
          </div>
        )}

        {showQr && (
          <div className="mt-6 border-t border-gray-100 pt-5 flex flex-col items-center">
            <p className="text-sm text-gray-600 mb-2">Quét mã QR để chuyển khoản thanh toán</p>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={getVietQrImageUrl({
                bankBin: org.bank_bin!,
                accountNumber: org.bank_account_number!,
                accountName: org.bank_account_name ?? undefined,
                amount: order.total_amount,
                addInfo: `Thanh toan ${order.code}`,
              })}
              alt="VietQR"
              className="w-56 h-auto rounded-lg border border-gray-100"
            />
            <p className="text-xs text-gray-400 mt-2">
              {org.bank_account_name} · {org.bank_account_number}
            </p>
          </div>
        )}

        {order.payment_method === "qr" && !org.bank_bin && (
          <p className="mt-6 text-sm text-amber-600 border-t border-gray-100 pt-4">
            Chưa thiết lập tài khoản ngân hàng nhận thanh toán. Vào mục Cài đặt để cập nhật.
          </p>
        )}
      </div>
    </div>
  );
}
