import { useSyncExternalStore } from "react";

// Cài đặt in lưu ngay trên trình duyệt của máy đang dùng (mỗi máy bán hàng có một bộ riêng).
export type PaperSize = "K80" | "K58" | "A5" | "A4";

export type PrintSettings = {
  paper: PaperSize;
  autoPrint: boolean;
  showQr: boolean;
  shopPhone: string;
  shopAddress: string;
  footer: string;
};

export const PAPER_LABEL: Record<PaperSize, string> = {
  K80: "Máy in bill khổ 80mm (K80)",
  K58: "Máy in bill khổ 58mm (K58)",
  A5: "Giấy A5 (máy in văn phòng)",
  A4: "Giấy A4 (máy in văn phòng)",
};

export const DEFAULT_PRINT_SETTINGS: PrintSettings = {
  paper: "K80",
  autoPrint: false,
  showQr: true,
  shopPhone: "",
  shopAddress: "",
  footer: "Cảm ơn quý khách, hẹn gặp lại!",
};

const KEY = "qf-print-settings";
const listeners = new Set<() => void>();
let cachedRaw: string | null | undefined;
let cachedValue: PrintSettings = DEFAULT_PRINT_SETTINGS;

function read(): PrintSettings {
  let raw: string | null = null;
  try {
    raw = window.localStorage.getItem(KEY);
  } catch {
    return DEFAULT_PRINT_SETTINGS;
  }
  if (raw === cachedRaw) return cachedValue;
  cachedRaw = raw;
  try {
    cachedValue = { ...DEFAULT_PRINT_SETTINGS, ...(raw ? JSON.parse(raw) : {}) };
  } catch {
    cachedValue = DEFAULT_PRINT_SETTINGS;
  }
  return cachedValue;
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  window.addEventListener("storage", callback);
  return () => {
    listeners.delete(callback);
    window.removeEventListener("storage", callback);
  };
}

export function updatePrintSettings(patch: Partial<PrintSettings>) {
  const next = { ...read(), ...patch };
  try {
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // trình duyệt chặn lưu dữ liệu: bỏ qua, dùng mặc định
  }
  listeners.forEach((l) => l());
}

export function usePrintSettings(): PrintSettings {
  return useSyncExternalStore(subscribe, read, () => DEFAULT_PRINT_SETTINGS);
}

// Đặt khổ giấy cho lần in này rồi mở hộp thoại in. Máy in thật được chọn trong hộp thoại của trình duyệt.
export function printReceipt(paper: PaperSize) {
  let style = document.getElementById("print-page-style") as HTMLStyleElement | null;
  if (!style) {
    style = document.createElement("style");
    style.id = "print-page-style";
    document.head.appendChild(style);
  }
  style.textContent =
    paper === "A4"
      ? "@page { size: A4; margin: 12mm; }"
      : paper === "A5"
        ? "@page { size: A5; margin: 10mm; }"
        : "@page { margin: 0; }";

  const images = Array.from(document.querySelectorAll<HTMLImageElement>("#print-area img"));
  Promise.all(
    images.map((img) =>
      img.complete
        ? Promise.resolve()
        : new Promise<void>((resolve) => {
            img.onload = () => resolve();
            img.onerror = () => resolve();
            setTimeout(resolve, 3000);
          })
    )
  ).then(() => setTimeout(() => window.print(), 50));
}
