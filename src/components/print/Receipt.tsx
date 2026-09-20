"use client";

import { useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { formatCurrency, formatDateTime } from "@/lib/format";
import { dimensionLabel, formatNumber } from "@/lib/pricing";
import { PAYMENT_METHOD_LABEL } from "@/types/db";
import type { ReceiptData } from "@/lib/receipt";
import type { PrintSettings } from "@/lib/print-settings";
import { getVietQrImageUrl } from "@/lib/vietqr";

export type ReceiptBank = { bin: string; account: string; name: string | null } | null;

// Hóa đơn để in. Luôn nằm trong #print-area (ẩn trên màn hình, chỉ hiện khi in).
export function Receipt({
  data,
  shopName,
  bank,
  settings,
}: {
  data: ReceiptData | null;
  shopName: string;
  bank: ReceiptBank;
  settings: PrintSettings;
}) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  );
  if (!data || !mounted) return null;

  const narrow = settings.paper === "K80" || settings.paper === "K58";
  const width = settings.paper === "K80" ? "76mm" : settings.paper === "K58" ? "54mm" : "100%";
  const fontSize = settings.paper === "K58" ? "10.5px" : narrow ? "12px" : "13px";
  const change = data.cashGiven != null ? data.cashGiven - data.total : null;
  const showQr =
    settings.showQr && bank && data.paymentMethod === "qr" && data.paymentStatus === "unpaid" && data.total > 0;

  return createPortal(
    <div id="print-area">
      <div style={{ width, fontSize, lineHeight: 1.35, padding: narrow ? "3mm 2mm" : 0, fontFamily: "Arial, sans-serif" }}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "1.35em", fontWeight: 700 }}>{shopName}</div>
          {settings.shopAddress && <div>{settings.shopAddress}</div>}
          {settings.shopPhone && <div>ĐT: {settings.shopPhone}</div>}
          <div style={{ fontWeight: 700, marginTop: 6, fontSize: "1.15em" }}>HÓA ĐƠN BÁN HÀNG</div>
          <div>Số: {data.code}</div>
          <div>{formatDateTime(data.createdAt)}</div>
        </div>

        <div style={{ marginTop: 6, borderTop: "1px dashed #000", paddingTop: 4 }}>
          <div>Thu ngân: {data.cashier}</div>
          <div>Khách hàng: {data.customerName ?? "Khách vãng lai"}</div>
          {data.customerPhone && <div>SĐT: {data.customerPhone}</div>}
          {data.customerAddress && <div>Địa chỉ: {data.customerAddress}</div>}
        </div>

        {narrow ? (
          <div style={{ marginTop: 6, borderTop: "1px dashed #000" }}>
            {data.lines.map((l, i) => {
              const dims = dimensionLabel(l);
              return (
                <div key={i} style={{ padding: "3px 0", borderBottom: "1px dotted #999" }}>
                  <div style={{ fontWeight: 600 }}>
                    {i + 1}. {l.name}
                  </div>
                  {dims && (
                    <div style={{ color: "#333" }}>
                      Kích thước: {dims}
                      {l.pricingUnit === "area" && ` = ${formatNumber((l.width ?? 0) * (l.height ?? 0))} m²`}
                    </div>
                  )}
                  <div style={{ display: "flex", justifyContent: "space-between" }}>
                    <span>
                      {formatNumber(l.quantity)} × {formatCurrency(l.unitPrice)}
                      {l.pricingUnit === "area" ? "/m²" : l.pricingUnit === "length" ? "/m" : ""}
                    </span>
                    <span style={{ fontWeight: 600 }}>{formatCurrency(l.lineTotal)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse", marginTop: 8 }}>
            <thead>
              <tr style={{ borderTop: "1px solid #000", borderBottom: "1px solid #000" }}>
                <th style={{ textAlign: "left", padding: "4px 2px", width: 28 }}>STT</th>
                <th style={{ textAlign: "left", padding: "4px 2px" }}>Sản phẩm</th>
                <th style={{ textAlign: "right", padding: "4px 2px" }}>Kích thước</th>
                <th style={{ textAlign: "right", padding: "4px 2px" }}>SL</th>
                <th style={{ textAlign: "right", padding: "4px 2px" }}>Đơn giá</th>
                <th style={{ textAlign: "right", padding: "4px 2px" }}>Thành tiền</th>
              </tr>
            </thead>
            <tbody>
              {data.lines.map((l, i) => (
                <tr key={i} style={{ borderBottom: "1px dotted #999" }}>
                  <td style={{ padding: "4px 2px" }}>{i + 1}</td>
                  <td style={{ padding: "4px 2px" }}>{l.name}</td>
                  <td style={{ padding: "4px 2px", textAlign: "right" }}>{dimensionLabel(l) || "—"}</td>
                  <td style={{ padding: "4px 2px", textAlign: "right" }}>{formatNumber(l.quantity)}</td>
                  <td style={{ padding: "4px 2px", textAlign: "right" }}>
                    {formatCurrency(l.unitPrice)}
                    {l.pricingUnit === "area" ? "/m²" : l.pricingUnit === "length" ? "/m" : ""}
                  </td>
                  <td style={{ padding: "4px 2px", textAlign: "right", fontWeight: 600 }}>{formatCurrency(l.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}

        <div style={{ marginTop: 6 }}>
          <Row label="Tổng tiền hàng" value={formatCurrency(data.subtotal)} />
          {data.discount > 0 && <Row label="Giảm giá" value={"-" + formatCurrency(data.discount)} />}
          <Row label="TỔNG THANH TOÁN" value={formatCurrency(data.total)} bold big />
          <Row
            label="Hình thức"
            value={`${PAYMENT_METHOD_LABEL[data.paymentMethod]} · ${data.paymentStatus === "paid" ? "Đã thanh toán" : "Chưa thanh toán"}`}
          />
          {data.cashGiven != null && data.paymentMethod === "cash" && (
            <>
              <Row label="Khách đưa" value={formatCurrency(data.cashGiven)} />
              {change != null && change >= 0 && <Row label="Tiền thừa trả khách" value={formatCurrency(change)} />}
            </>
          )}
        </div>

        {data.note && (
          <div style={{ marginTop: 6, borderTop: "1px dashed #000", paddingTop: 4, whiteSpace: "pre-line" }}>
            Ghi chú: {data.note}
          </div>
        )}

        {showQr && bank && (
          <div style={{ marginTop: 8, textAlign: "center" }}>
            <div>Quét mã QR để chuyển khoản</div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              alt="VietQR"
              style={{ width: narrow ? "46mm" : "48mm", margin: "4px auto 0", display: "block" }}
              src={getVietQrImageUrl({
                bankBin: bank.bin,
                accountNumber: bank.account,
                accountName: bank.name ?? undefined,
                amount: data.total,
                addInfo: `Thanh toan ${data.code}`,
              })}
            />
            <div>
              {bank.name} · {bank.account}
            </div>
          </div>
        )}

        {settings.footer && (
          <div style={{ marginTop: 8, textAlign: "center", borderTop: "1px dashed #000", paddingTop: 6 }}>
            {settings.footer}
          </div>
        )}
      </div>
    </div>,
    document.body
  );
}

function Row({ label, value, bold, big }: { label: string; value: string; bold?: boolean; big?: boolean }) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        gap: 8,
        fontWeight: bold ? 700 : 400,
        fontSize: big ? "1.15em" : undefined,
        padding: "1px 0",
      }}
    >
      <span>{label}</span>
      <span style={{ textAlign: "right" }}>{value}</span>
    </div>
  );
}
