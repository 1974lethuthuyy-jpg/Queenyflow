// Ngày giờ theo múi giờ Việt Nam (UTC+7), không phụ thuộc múi giờ của máy chủ (Vercel chạy giờ UTC).
const VN_OFFSET = "+07:00";

export function todayVN(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(new Date());
}

export function startOfDayVN(date: string): string {
  return new Date(`${date}T00:00:00${VN_OFFSET}`).toISOString();
}

export function endOfDayVN(date: string): string {
  return new Date(`${date}T23:59:59.999${VN_OFFSET}`).toISOString();
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00${VN_OFFSET}`);
  d.setUTCDate(d.getUTCDate() + days);
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Ho_Chi_Minh" }).format(d);
}

export type RangePreset = "today" | "week" | "month" | "lastmonth" | "custom";

export function presetRange(preset: Exclude<RangePreset, "custom">, today = todayVN()): { from: string; to: string } {
  const [y, m] = today.split("-").map(Number);
  if (preset === "today") return { from: today, to: today };
  if (preset === "week") {
    // Tuần bắt đầu từ thứ Hai
    const dow = new Date(`${today}T12:00:00${VN_OFFSET}`).getUTCDay();
    const back = dow === 0 ? 6 : dow - 1;
    return { from: addDays(today, -back), to: today };
  }
  if (preset === "month") return { from: `${y}-${String(m).padStart(2, "0")}-01`, to: today };
  const lastM = m === 1 ? 12 : m - 1;
  const lastY = m === 1 ? y - 1 : y;
  const lastDay = new Date(Date.UTC(lastY, lastM, 0)).getUTCDate();
  const mm = String(lastM).padStart(2, "0");
  return { from: `${lastY}-${mm}-01`, to: `${lastY}-${mm}-${String(lastDay).padStart(2, "0")}` };
}

export function detectPreset(from: string, to: string, today = todayVN()): RangePreset {
  for (const p of ["today", "week", "month", "lastmonth"] as const) {
    const r = presetRange(p, today);
    if (r.from === from && r.to === to) return p;
  }
  return "custom";
}
