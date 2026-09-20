"use client";

import { Printer } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import {
  PAPER_LABEL,
  updatePrintSettings,
  usePrintSettings,
  type PaperSize,
} from "@/lib/print-settings";

const PAPERS: PaperSize[] = ["K80", "K58", "A5", "A4"];

export function PrintSettingsModal({
  open,
  onClose,
  onTestPrint,
}: {
  open: boolean;
  onClose: () => void;
  onTestPrint: () => void;
}) {
  const settings = usePrintSettings();

  return (
    <Modal open={open} onClose={onClose} title="Cài đặt in hóa đơn" width="max-w-xl">
      <div className="space-y-5 text-sm">
        <div>
          <div className="font-medium text-gray-700 mb-2">Khổ giấy</div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PAPERS.map((p) => (
              <label
                key={p}
                className={`flex items-center gap-2 border rounded-lg px-3 py-2 cursor-pointer ${
                  settings.paper === p ? "border-brand-600 bg-brand-50 text-brand-800" : "border-gray-200 text-gray-600"
                }`}
              >
                <input
                  type="radio"
                  name="paper"
                  checked={settings.paper === p}
                  onChange={() => updatePrintSettings({ paper: p })}
                  className="accent-brand-600"
                />
                {PAPER_LABEL[p]}
              </label>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block font-medium text-gray-700 mb-1">Số điện thoại cửa hàng</label>
            <input
              value={settings.shopPhone}
              onChange={(e) => updatePrintSettings({ shopPhone: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
          <div>
            <label className="block font-medium text-gray-700 mb-1">Địa chỉ cửa hàng</label>
            <input
              value={settings.shopAddress}
              onChange={(e) => updatePrintSettings({ shopAddress: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
            />
          </div>
        </div>

        <div>
          <label className="block font-medium text-gray-700 mb-1">Lời cảm ơn cuối hóa đơn</label>
          <input
            value={settings.footer}
            onChange={(e) => updatePrintSettings({ footer: e.target.value })}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-brand-500"
          />
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={settings.autoPrint}
              onChange={(e) => updatePrintSettings({ autoPrint: e.target.checked })}
              className="accent-brand-600 w-4 h-4"
            />
            Tự mở hộp thoại in ngay sau khi thanh toán
          </label>
          <label className="flex items-center gap-2 text-gray-700">
            <input
              type="checkbox"
              checked={settings.showQr}
              onChange={(e) => updatePrintSettings({ showQr: e.target.checked })}
              className="accent-brand-600 w-4 h-4"
            />
            In mã QR chuyển khoản trên hóa đơn chưa thanh toán
          </label>
        </div>

        <div className="rounded-lg bg-brand-50 border border-brand-100 p-3 text-xs text-gray-600 space-y-1.5">
          <div className="font-semibold text-brand-800">Chọn máy in ở đâu?</div>
          <p>
            Trình duyệt không cho web tự chọn máy in. Khi bấm <b>In hóa đơn</b>, Windows sẽ hiện hộp thoại
            <b> chọn máy in</b> — chọn máy in đang kết nối ở đó (nhớ chọn đúng khổ giấy đã đặt ở trên).
          </p>
          <p>
            <b>Muốn in thẳng, không hiện hộp thoại</b> (tiện cho máy in bill): đặt máy in bill làm máy in mặc định của
            Windows, rồi bấm chuột phải vào biểu tượng Chrome/Edge dùng để bán hàng → Properties → ở ô <b>Target</b> thêm
            vào cuối: <code className="bg-white px-1 rounded border">--kiosk-printing</code>
          </p>
          <p className="text-gray-400">Cài đặt này lưu riêng trên từng máy tính bán hàng.</p>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={onTestPrint}
            className="flex items-center gap-2 border border-gray-300 hover:bg-gray-50 rounded-lg px-4 py-2 font-medium text-gray-700"
          >
            <Printer size={16} /> In thử
          </button>
          <button onClick={onClose} className="bg-brand-600 hover:bg-brand-700 text-white rounded-lg px-5 py-2 font-medium">
            Xong
          </button>
        </div>
      </div>
    </Modal>
  );
}
