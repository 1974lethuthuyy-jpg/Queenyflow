// Gọi Gemini API (REST) — kết nối mạng duy nhất của cả chương trình.
const GOC = "https://generativelanguage.googleapis.com/v1beta";
const SO_LAN_THU_LAI = 4;
const THOI_GIAN_CHO_TOI_DA_MS = 5 * 60_000;

export const chuanHoaModel = (id) => String(id ?? "").trim().replace(/^models\//, "");

function ngu(ms, signal) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) return reject(signal.reason);
    let hen = null;
    const huy = () => {
      clearTimeout(hen);
      reject(signal.reason);
    };
    hen = setTimeout(() => {
      signal?.removeEventListener("abort", huy);
      resolve();
    }, ms);
    signal?.addEventListener("abort", huy, { once: true });
  });
}

function giayChoTuMayChu(data) {
  const info = data?.error?.details?.find((d) => String(d?.["@type"] ?? "").endsWith("RetryInfo"));
  const giay = parseFloat(info?.retryDelay ?? "");
  return Number.isFinite(giay) ? giay : null;
}

// Hết hạn mức theo ngày (hoặc phải chờ quá lâu) thì thử lại vô ích: báo lỗi ngay.
function loiHetHanMuc(data) {
  const viPham = (data?.error?.details ?? []).flatMap((d) => d?.violations ?? []);
  const theoNgay = viPham.some((v) => /PerDay/i.test(String(v?.quotaId ?? "")));
  const giay = giayChoTuMayChu(data);
  if (!theoNgay && !(giay > 120)) return null;
  const mienPhi = viPham.some((v) => /FreeTier/i.test(String(v?.quotaId ?? "")));
  const loi = new Error(
    [
      "Model nay da het han muc (quota) cua key/project cua ban" + (giay ? `, Google bao cho khoang ${Math.ceil(giay / 3600)} gio.` : "."),
      mienPhi ? "Day la han muc MIEN PHI: co model khong co luot mien phi nao, phai bat thanh toan (billing) moi dung duoc." : "",
      "Cach xu ly: bat thanh toan cho project trong https://aistudio.google.com, hoac chon model khac (--model ...), hoac doi han muc reset.",
    ]
      .filter(Boolean)
      .join("\n"),
  );
  loi.status = 429;
  loi.apiMessage = data?.error?.message ?? "";
  return loi;
}

async function goiApi(url, { apiKey, body, signal }) {
  for (let lan = 0; ; lan++) {
    let res;
    let text;
    try {
      const tinHieu = signal ? AbortSignal.any([signal, AbortSignal.timeout(THOI_GIAN_CHO_TOI_DA_MS)]) : AbortSignal.timeout(THOI_GIAN_CHO_TOI_DA_MS);
      res = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: { "x-goog-api-key": apiKey, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal: tinHieu,
      });
      text = await res.text();
    } catch (e) {
      if (signal?.aborted) throw e;
      const lyDo = e.name === "TimeoutError" ? `khong tra loi sau ${THOI_GIAN_CHO_TOI_DA_MS / 60000} phut` : (e.cause?.message ?? e.message);
      if (lan >= SO_LAN_THU_LAI) throw new Error(`Khong ket noi duoc toi Gemini: ${lyDo}`);
      console.log(`  (Gemini ${lyDo}. Thu lai lan ${lan + 1}/${SO_LAN_THU_LAI}...)`);
      await ngu(2000 * 2 ** lan, signal);
      continue;
    }
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // máy chủ trả về không phải JSON; giữ nguyên text để báo lỗi
    }
    if (res.ok) return data;
    const thongDiep = data?.error?.message ?? text.slice(0, 500);
    if (res.status === 429) {
      const hetHanMuc = loiHetHanMuc(data);
      if (hetHanMuc) throw hetHanMuc;
    }
    if ((res.status === 429 || res.status >= 500) && lan < SO_LAN_THU_LAI) {
      const giay = giayChoTuMayChu(data);
      const cho = giay !== null ? giay * 1000 : Math.min(60_000, 5000 * 2 ** lan);
      console.log(`  (Gemini bao ban hoac het han muc, HTTP ${res.status}. Thu lai sau ${Math.round(cho / 1000)} giay...)`);
      await ngu(cho, signal);
      continue;
    }
    const loi = new Error(`Gemini loi HTTP ${res.status}: ${thongDiep}`);
    loi.status = res.status;
    loi.apiMessage = thongDiep;
    throw loi;
  }
}

export async function goiGemini({ apiKey, model, systemText, contents, tools, includeThoughts, signal }) {
  const body = {
    systemInstruction: { parts: [{ text: systemText }] },
    contents,
    tools: [{ functionDeclarations: tools }],
    toolConfig: { functionCallingConfig: { mode: "AUTO" } },
    // Không đặt maxOutputTokens: token suy nghĩ cũng bị tính vào đó, đặt thấp thì model bị cắt ngang.
    generationConfig: includeThoughts ? { thinkingConfig: { includeThoughts: true } } : {},
  };
  const data = await goiApi(`${GOC}/models/${encodeURIComponent(model)}:generateContent`, { apiKey, body, signal });
  const ungVien = data?.candidates?.[0];
  return {
    content: ungVien?.content,
    finishReason: ungVien?.finishReason ?? data?.promptFeedback?.blockReason ?? "KHONG_RO",
    finishMessage: ungVien?.finishMessage ?? "",
    usage: data?.usageMetadata ?? {},
  };
}

export async function danhSachModel(apiKey) {
  const tatCa = [];
  let trang = "";
  do {
    const data = await goiApi(`${GOC}/models?pageSize=1000${trang ? `&pageToken=${encodeURIComponent(trang)}` : ""}`, { apiKey });
    for (const m of data?.models ?? []) {
      if (m.supportedGenerationMethods?.includes("generateContent")) tatCa.push({ id: chuanHoaModel(m.name), ten: m.displayName ?? "" });
    }
    trang = data?.nextPageToken ?? "";
  } while (trang);
  const gemini = tatCa.filter((m) => /gemini/i.test(m.id) && !/tts|image|embedding|native-audio|live/i.test(m.id));
  return gemini.length ? gemini : tatCa;
}
