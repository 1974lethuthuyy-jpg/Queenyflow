// Tìm kiếm tiếng Việt không phân biệt dấu / hoa thường: gõ "rem" vẫn ra "Rèm", "dinh" ra "Đinh".
export function normalizeText(value: string | null | undefined) {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim();
}

// Mọi từ trong ô tìm kiếm đều phải xuất hiện (theo bất kỳ thứ tự nào) trong các trường được truyền vào.
export function matchesQuery(query: string, ...fields: Array<string | number | null | undefined>) {
  const tokens = normalizeText(query).split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return true;
  const haystack = normalizeText(fields.map((f) => (f == null ? "" : String(f))).join(" "));
  return tokens.every((t) => haystack.includes(t));
}
