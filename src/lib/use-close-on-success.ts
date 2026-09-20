import { useEffect, useRef } from "react";

// Đóng cửa sổ (modal) đúng 1 lần sau mỗi lần lưu thành công. Không đóng ngay khi thấy "success" trong
// state vì kết quả cũ vẫn còn đó: mở lại cửa sổ sẽ bị tự đóng ngay.
export function useCloseOnSuccess(state: { success?: string } | null, onClose: () => void, delayMs = 0) {
  const handled = useRef<unknown>(null);

  useEffect(() => {
    if (!state?.success || handled.current === state) return;
    const timer = setTimeout(() => {
      handled.current = state;
      onClose();
    }, delayMs);
    return () => clearTimeout(timer);
  }, [state, onClose, delayMs]);
}
