// Gọi Claude (Anthropic API) bằng SDK chính thức. Cùng giao diện với gemini.mjs:
// vòng lặp trong chay.mjs giữ hội thoại theo dạng Gemini, file này đổi qua lại.
// SDK chỉ được nạp khi chọn Claude (cần "npm install" trong thư mục này).

const MAC_DINH = "claude-sonnet-5";

// Giá ước tính (USD / 1 triệu token): [vào, ra]. Đọc cache = 0,1 x giá vào, ghi cache = 1,25 x giá vào.
// Claude Haiku 5.5: prompt trên 100K token tính giá cao hơn.
const BANG_GIA = [
  [/haiku-5-5/, [0.1, 0.5], [0.5, 2.5]],
  [/sonnet-5/, [2, 10]],
  [/opus-5-5/, [4, 20]],
  [/opus/, [5, 25]],
  [/haiku-4-5/, [1, 5]],
];

function uocTinhUsd(model, u) {
  const dong = BANG_GIA.find(([re]) => re.test(model));
  if (!dong) return 0;
  const tongVao = (u.input_tokens ?? 0) + (u.cache_read_input_tokens ?? 0) + (u.cache_creation_input_tokens ?? 0);
  const [vao, ra] = dong[2] && tongVao > 100_000 ? dong[2] : dong[1];
  return ((u.input_tokens ?? 0) * vao + (u.cache_creation_input_tokens ?? 0) * vao * 1.25 + (u.cache_read_input_tokens ?? 0) * vao * 0.1 + (u.output_tokens ?? 0) * ra) / 1e6;
}

export const MODEL_CLAUDE_MAC_DINH = MAC_DINH;

let khach = null;
async function layKhach(apiKey) {
  let Anthropic;
  try {
    ({ default: Anthropic } = await import("@anthropic-ai/sdk"));
  } catch (e) {
    if (e?.code === "ERR_MODULE_NOT_FOUND") throw new Error("Chua cai thu vien Claude. Mo cmd trong thu muc thi-nghiem-ai va chay: npm install");
    throw new Error(`Khong nap duoc thu vien Claude (can Node.js 20 tro len): ${e?.message ?? e}`);
  }
  if (!khach || khach.key !== apiKey) khach = { key: apiKey, Anthropic, client: new Anthropic({ apiKey, maxRetries: 4, timeout: 5 * 60_000 }) };
  return khach;
}

function doiCongCu(tools) {
  return tools.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.parameters ?? { type: "object", properties: {} },
  }));
}

// Hội thoại dạng Gemini -> messages của Anthropic. Lượt của model giữ nguyên khối gốc (_claude)
// để gửi trả lại y nguyên, kể cả khối thinking.
function doiHoiThoai(contents) {
  return contents.map((c) => {
    if (c.role === "model") return { role: "assistant", content: c._claude };
    const content = c.parts.map((p) =>
      p.functionResponse
        ? {
            type: "tool_result",
            tool_use_id: p.functionResponse.id,
            content: JSON.stringify(p.functionResponse.response),
            ...(p.functionResponse.response?.error ? { is_error: true } : {}),
          }
        : { type: "text", text: p.text ?? "" },
    );
    return { role: "user", content };
  });
}

function loiDeHieu(e, Anthropic) {
  let thongDiep = e.message;
  if (e instanceof Anthropic.AuthenticationError) thongDiep = "API key Claude sai hoac da bi xoa.";
  else if (e instanceof Anthropic.PermissionDeniedError) thongDiep = `Key khong co quyen dung model nay: ${e.message}`;
  else if (e instanceof Anthropic.NotFoundError) thongDiep = `Khong co model nay (kiem tra ten model): ${e.message}`;
  else if (e instanceof Anthropic.RateLimitError) thongDiep = `Vuot gioi han toc do hoac het credit: ${e.message}`;
  else if (e instanceof Anthropic.BadRequestError && /credit balance/i.test(e.message))
    thongDiep = "Tai khoan API het tien (credit). Nap them o console.anthropic.com > Billing.";
  else if (e instanceof Anthropic.APIConnectionError) thongDiep = `Khong ket noi duoc toi Claude: ${e.message}`;
  else if (e?.status === 529 || /overloaded/i.test(e.message)) thongDiep = `Claude dang qua tai (HTTP ${e.status ?? 529}), thu lai sau: ${e.message}`;
  else if (e instanceof Anthropic.InternalServerError) thongDiep = `May chu Claude loi tam thoi (HTTP ${e.status}): ${e.message}`;
  const loi = new Error(`Claude: ${thongDiep}`);
  loi.status = e.status;
  loi.apiMessage = e.message;
  return loi;
}

export async function goiClaude({ apiKey, model, systemText, contents, tools, includeThoughts, signal }) {
  const { Anthropic, client } = await layKhach(apiKey);
  let tl;
  try {
    tl = await client.messages.create(
      {
        model,
        max_tokens: 16000,
        // Lưu cache phần hội thoại cũ: lượt sau chỉ trả 1/10 giá cho phần đó.
        cache_control: { type: "ephemeral" },
        system: systemText,
        tools: doiCongCu(tools),
        messages: doiHoiThoai(contents),
        thinking: includeThoughts ? { type: "adaptive", display: "summarized" } : { type: "adaptive" },
      },
      { signal },
    );
  } catch (e) {
    if (e instanceof Anthropic.APIUserAbortError) throw e;
    throw loiDeHieu(e, Anthropic);
  }

  if (tl.stop_reason === "refusal") {
    const lyDo = tl.stop_details?.category ? ` (loai: ${tl.stop_details.category})` : "";
    throw new Error(`Claude tu choi tiep tuc${lyDo}. ${tl.stop_details?.explanation ?? ""}`.trim());
  }
  // Bị cắt ở max_tokens thì lệnh gọi công cụ có thể dở dang: bỏ đi, không chạy.
  const khoi = tl.stop_reason === "max_tokens" ? tl.content.filter((b) => b.type !== "tool_use") : tl.content;

  const parts = [];
  for (const b of khoi) {
    if (b.type === "thinking" && b.thinking) parts.push({ text: b.thinking, thought: true });
    else if (b.type === "text") parts.push({ text: b.text });
    else if (b.type === "tool_use") parts.push({ functionCall: { name: b.name, args: b.input, id: b.id } });
  }
  return {
    content: { role: "model", parts, _claude: khoi },
    finishReason: tl.stop_reason,
    // Token "quy đổi": token đọc từ cache chỉ tính 1/10 (đúng tỉ lệ giá), để --toi-da-token phản ánh chi phí.
    usage: {
      totalTokenCount: Math.round(
        (tl.usage?.input_tokens ?? 0) + (tl.usage?.cache_creation_input_tokens ?? 0) + (tl.usage?.cache_read_input_tokens ?? 0) * 0.1 + (tl.usage?.output_tokens ?? 0),
      ),
      cacheRead: tl.usage?.cache_read_input_tokens ?? 0,
      usd: uocTinhUsd(model, tl.usage ?? {}),
    },
  };
}

export async function danhSachModelClaude(apiKey) {
  const { Anthropic, client } = await layKhach(apiKey);
  const ds = [];
  try {
    for await (const m of client.models.list()) ds.push({ id: m.id, ten: m.display_name ?? "" });
  } catch (e) {
    throw loiDeHieu(e, Anthropic);
  }
  return ds;
}
