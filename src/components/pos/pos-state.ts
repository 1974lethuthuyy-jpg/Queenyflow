import { useCallback, useEffect, useRef, useState } from "react";
import type { OrderStatus, PaymentMethod } from "@/types/db";

export type PosMode = "quick" | "normal" | "delivery";

export type CartLine = {
  key: string;
  productId: string;
  quantity: number;
  // Số đo (m). Chỉ dùng cho hàng tính theo m² hoặc theo mét dài.
  width: number;
  height: number;
  // null = tự động theo giá niêm yết / giá riêng của khách; có số = admin đã sửa giá tay
  unitPrice: number | null;
};

export type Delivery = { name: string; phone: string; address: string };

export type Draft = {
  id: string;
  label: string;
  lines: CartLine[];
  customerId: string | null;
  categoryId: string | null;
  note: string;
  discount: number;
  discountPct: boolean;
  paymentMethod: PaymentMethod;
  transferReceived: boolean;
  status: OrderStatus | null;
  cashGiven: number | null;
  delivery: Delivery;
};

export function newDraft(no: number): Draft {
  return {
    id: crypto.randomUUID(),
    label: `Hóa đơn ${no}`,
    lines: [],
    customerId: null,
    categoryId: null,
    note: "",
    discount: 0,
    discountPct: false,
    paymentMethod: "cash",
    transferReceived: true,
    status: null,
    cashGiven: null,
    delivery: { name: "", phone: "", address: "" },
  };
}

type Stored = { drafts: Draft[]; activeId: string; nextNo: number };

function readStored(key: string): Stored | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    if (!Array.isArray(parsed.drafts) || parsed.drafts.length === 0) return null;
    return parsed;
  } catch {
    return null;
  }
}

// Nhiều hóa đơn nháp chạy song song (như tab), tự lưu trên trình duyệt nên tải lại trang không mất giỏ hàng.
export function usePosDrafts(storageKey: string) {
  const [state, setState] = useState<Stored>(() => ({ drafts: [newDraft(1)], activeId: "", nextNo: 2 }));
  const [hydrated, setHydrated] = useState(false);
  const initialized = useRef(false);

  // Đọc localStorage chỉ có thể làm sau khi trang đã chạy trên trình duyệt (server không có localStorage).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    const stored = readStored(storageKey);
    setState((prev) => {
      if (stored) {
        const activeId = stored.drafts.some((d) => d.id === stored.activeId) ? stored.activeId : stored.drafts[0].id;
        return { drafts: stored.drafts, activeId, nextNo: stored.nextNo || stored.drafts.length + 1 };
      }
      return { ...prev, activeId: prev.drafts[0].id };
    });
    initialized.current = true;
    setHydrated(true);
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(storageKey, JSON.stringify(state));
    } catch {
      // bỏ qua nếu trình duyệt chặn lưu
    }
  }, [state, hydrated, storageKey]);

  const active = state.drafts.find((d) => d.id === state.activeId) ?? state.drafts[0];

  const updateActive = useCallback((fn: (draft: Draft) => Draft) => {
    setState((s) => {
      const id = s.drafts.some((d) => d.id === s.activeId) ? s.activeId : s.drafts[0].id;
      return { ...s, drafts: s.drafts.map((d) => (d.id === id ? fn(d) : d)) };
    });
  }, []);

  const setActiveId = useCallback((id: string) => setState((s) => ({ ...s, activeId: id })), []);

  const addDraft = useCallback(() => {
    setState((s) => {
      const draft = newDraft(s.nextNo);
      return { drafts: [...s.drafts, draft], activeId: draft.id, nextNo: s.nextNo + 1 };
    });
  }, []);

  // Đóng một hóa đơn nháp; nếu là hóa đơn cuối cùng thì làm trống thay vì xóa.
  const closeDraft = useCallback((id: string) => {
    setState((s) => {
      if (s.drafts.length <= 1) {
        const draft = newDraft(s.nextNo);
        return { drafts: [draft], activeId: draft.id, nextNo: s.nextNo + 1 };
      }
      const index = s.drafts.findIndex((d) => d.id === id);
      const drafts = s.drafts.filter((d) => d.id !== id);
      const activeId = s.activeId === id ? drafts[Math.max(0, index - 1)].id : s.activeId;
      return { ...s, drafts, activeId };
    });
  }, []);

  return { drafts: state.drafts, active, hydrated, updateActive, setActiveId, addDraft, closeDraft };
}

export type PosPrefs = {
  mode: PosMode;
  view: "grid" | "list";
  showImages: boolean;
  category: string | null;
};

const DEFAULT_PREFS: PosPrefs = { mode: "normal", view: "grid", showImages: true, category: null };

export function usePosPrefs(storageKey: string) {
  const [prefs, setPrefs] = useState<PosPrefs>(DEFAULT_PREFS);

  // Đọc localStorage chỉ làm được sau khi mount (server không có localStorage).
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(storageKey);
      if (raw) setPrefs({ ...DEFAULT_PREFS, ...JSON.parse(raw) });
    } catch {
      // dùng mặc định
    }
  }, [storageKey]);
  /* eslint-enable react-hooks/set-state-in-effect */

  const update = useCallback(
    (patch: Partial<PosPrefs>) => {
      setPrefs((prev) => {
        const next = { ...prev, ...patch };
        try {
          window.localStorage.setItem(storageKey, JSON.stringify(next));
        } catch {
          // bỏ qua
        }
        return next;
      });
    },
    [storageKey]
  );

  return [prefs, update] as const;
}
