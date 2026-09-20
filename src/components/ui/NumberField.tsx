"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Ô nhập số kiểu bán hàng: khi không nhập hiển thị có dấu phân cách nghìn (387.450),
// khi đang nhập cho gõ tự do. decimals=0: tiền; decimals>0: số đo (chấp nhận cả "2,4" và "2.4").
export function NumberField({
  value,
  onChange,
  decimals = 0,
  placeholder,
  className = "",
  title,
  disabled,
  autoFocus,
  listId,
  onEnter,
}: {
  value: number | null;
  onChange: (value: number) => void;
  decimals?: number;
  placeholder?: string;
  className?: string;
  title?: string;
  disabled?: boolean;
  autoFocus?: boolean;
  listId?: string;
  onEnter?: () => void;
}) {
  const [focused, setFocused] = useState(false);
  const [text, setText] = useState("");
  const innerRef = useRef<HTMLInputElement | null>(null);

  // Bôi đen toàn bộ số ngay sau khi vào ô (trước khi người dùng kịp gõ) để gõ đè số mới.
  useLayoutEffect(() => {
    if (focused) innerRef.current?.select();
  }, [focused]);

  const formatted =
    value == null || Number.isNaN(value)
      ? ""
      : new Intl.NumberFormat("vi-VN", { maximumFractionDigits: Math.max(decimals, 0) }).format(value);

  function parse(raw: string) {
    if (decimals === 0) {
      const digits = raw.replace(/[^\d]/g, "");
      return digits ? Number(digits) : 0;
    }
    const cleaned = raw.replace(/[^\d.,]/g, "");
    const firstSep = cleaned.search(/[.,]/);
    if (firstSep === -1) return cleaned ? Number(cleaned) : 0;
    const intPart = cleaned.slice(0, firstSep).replace(/[^\d]/g, "");
    const fracPart = cleaned.slice(firstSep + 1).replace(/[^\d]/g, "");
    return Number(`${intPart || "0"}.${fracPart}`);
  }

  return (
    <input
      ref={innerRef}
      autoFocus={autoFocus}
      type="text"
      inputMode={decimals > 0 ? "decimal" : "numeric"}
      list={listId}
      value={focused ? text : formatted}
      placeholder={placeholder}
      title={title}
      disabled={disabled}
      onFocus={() => {
        setText(value ? String(value).replace(".", ",") : "");
        setFocused(true);
      }}
      onBlur={() => setFocused(false)}
      onChange={(e) => {
        setText(e.target.value);
        onChange(parse(e.target.value));
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter" && onEnter) {
          e.preventDefault();
          onEnter();
        }
      }}
      className={className}
    />
  );
}
