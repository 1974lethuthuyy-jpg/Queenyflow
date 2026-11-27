// Gọi Gemini API (REST) — kết nối mạng duy nhất của cả chương trình.
const GOC = "https://generativelanguage.googleapis.com/v1beta";
const SO_LAN_THU_LAI = 4;

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

function thoiGianChoTuMayChu(data) {
  const info = data?.error?.details?.find((d) => String(d?.["@type"] ?? "").endsWith("RetryInfo"));
  const giay = parseFloat(info?.retryDelay ?? "");
  return Number.isFinite(giay) ? Math.min(giay, 90) * 1000 : null;
}

async function goiApi(url, { apiKey, body, signal }) {
  for (let lan = 0; ; lan++) {
    let res;
    try {
      res = await fetch(url, {
        method: body ? "POST" : "GET",
        headers: { "x-goog-api-key": apiKey, ...(body ? { "content-type": "application/json" } : {}) },
        body: body ? JSON.stringify(body) : undefined,
        signal,
      });
    } catch (e) {
      if (signal?.aborted) throw e;
      if (lan >= SO_LAN_THU_LAI) throw new Error(`Khong ket noi duoc toi Gemini: ${e.cause?.message ?? e.message}`);
      await ngu(2000 * 2 ** lan, signal);
      continue;
    }
    const text = await res.text();
    let data = null;
    try {
      data = JSON.parse(text);
    } catch {
      // máy chủ trả về không phải JSON; giữ nguyên text để báo lỗi
    }
    if (res.ok) return data;
    const thongDiep = data?.error?.message ?? text.slice(0, 500);
    if ((res.status === 429 || res.status >= 500) && lan < SO_LAN_THU_LAI) {
      const cho = thoiGianChoTuMayChu(data) ?? 2000 * 2 ** lan;
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
    generationConfig: {
      maxOutputTokens: 16384,
      ...(includeThoughts ? { thinkingConfig: { includeThoughts: true } } : {}),
    },
  };
  const data = await goiApi(`${GOC}/models/${encodeURIComponent(model)}:generateContent`, { apiKey, body, signal });
  const ungVien = data?.candidates?.[0];
  return {
    content: ungVien?.content,
    finishReason: ungVien?.finishReason ?? data?.promptFeedback?.blockReason ?? "KHONG_RO",
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
