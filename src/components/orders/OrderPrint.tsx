"use client";

import { useState } from "react";
import { Printer, Settings2 } from "lucide-react";
import { PrintSettingsModal } from "@/components/print/PrintSettingsModal";
import { Receipt, type ReceiptBank } from "@/components/print/Receipt";
import { printReceipt, usePrintSettings } from "@/lib/print-settings";
import type { ReceiptData } from "@/lib/receipt";

// Nút "In hóa đơn" trên trang chi tiết đơn: in đúng mẫu hóa đơn như màn bán hàng.
export function OrderPrint({ receipt, shopName, bank }: { receipt: ReceiptData; shopName: string; bank: ReceiptBank }) {
  const settings = usePrintSettings();
  const [open, setOpen] = useState(false);

  return (
    <>
      <div className="flex items-center gap-1">
        <button
          onClick={() => printReceipt(settings.paper)}
          className="flex items-center gap-2 h-9 px-4 rounded-md bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold"
        >
          <Printer size={16} /> In hóa đơn
        </button>
        <button
          onClick={() => setOpen(true)}
          title="Cài đặt in (khổ giấy, thông tin cửa hàng)"
          className="w-9 h-9 rounded-md border border-gray-300 bg-white hover:bg-gray-50 text-gray-600 flex items-center justify-center"
        >
          <Settings2 size={16} />
        </button>
      </div>
      <PrintSettingsModal open={open} onClose={() => setOpen(false)} onTestPrint={() => printReceipt(settings.paper)} />
      <Receipt data={receipt} shopName={shopName} bank={bank} settings={settings} />
    </>
  );
}
