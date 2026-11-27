// Chạy thí nghiệm "Người chủ đã mất". Đọc DOC-TRUOC.txt trước.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { taoSystemPrompt, TIN_NHAN_DAU, tinNhanKhiIm } from "./kich-ban.mjs";
import { TheGioiAo, KHAI_BAO_CONG_CU, thoiGianMay, thoiGianNguoi } from "./the-gioi-ao.mjs";
import { goiGemini, danhSachModel, chuanHoaModel } from "./gemini.mjs";
import { goiClaude, danhSachModelClaude, MODEL_CLAUDE_MAC_DINH } from "./claude.mjs";
import { taoModelGiaLap } from "./gia-lap.mjs";
import { taoMayGiaLapClaude } from "./may-gia-lap.mjs";
import { vietBaoCao, moTaGoi, moTaKetQua, dongNhan } from "./bao-cao.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(dir, ".env");
const args = process.argv.slice(2);
const coCo = (ten) => args.includes(ten);
const giaTri = (ten) => {
  const i = args.indexOf(ten);
  if (i < 0) return undefined;
  if (args[i + 1] === undefined || args[i + 1].startsWith("--")) {
    console.error(`${ten} can mot gia tri phia sau (vi du: ${ten} ${ten === "--model" ? "<ten-model>" : "60"}).`);
    process.exit(1);
  }
  return args[i + 1];
};

// Lỗi tạm thời (quá tải, giới hạn tốc độ, mất mạng): chờ rồi thử lại, không dừng thí nghiệm.
const loiTamThoi = (e) =>
  !/het han muc|credit/i.test(e?.message ?? "") &&
  ([408, 409, 429, 529].includes(e?.status) || e?.status >= 500 || (e?.status === undefined && /ket noi|connect|timed? ?out|ECONN|ETIMEDOUT|EAI_AGAIN|socket|fetch failed|network/i.test(e?.message ?? "")));

function ngu(ms, signal) {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const hen = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => (clearTimeout(hen), resolve()), { once: true });
  });
}

// Lỗi do key sai/bị xóa (không phải lỗi mạng, hết hạn mức...).
const loiKey = (e) => e?.status === 401 || ([400, 403].includes(e?.status) && /API key|API_KEY/i.test(e?.apiMessage ?? ""));

function soDuong(ten, macDinh) {
  const v = giaTri(ten);
  if (v === undefined) return macDinh;
  const n = Number(String(v).replace(/[.,_\s]/g, "")); // "1.500.000" -> 1500000
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`${ten} phai la so nguyen duong (ban nhap: ${v}).`);
    process.exit(1);
  }
  return n;
}

function docEnv() {
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const dong of fs.readFileSync(envPath, "utf8").replace(/^\uFEFF/, "").split(/\r?\n/)) {
    const m = dong.match(/^\s*([A-Z_][A-Z0-9_]*)\s*=\s*(.*?)\s*$/);
    if (m) env[m[1]] = m[2].replace(/^(["'])(.*)\1$/, "$2");
  }
  return env;
}

function luuEnv(capNhat) {
  const env = { ...docEnv(), ...capNhat };
  fs.writeFileSync(envPath, Object.entries(env).map(([k, v]) => `${k}=${v}`).join("\n") + "\n");
}

let rl = null;
let dongNhap = null;
async function hoi(cauHoi) {
  if (!rl) {
    rl = readline.createInterface({ input: process.stdin, terminal: false });
    dongNhap = rl[Symbol.asyncIterator]();
  }
  process.stdout.write(cauHoi);
  const { value } = await dongNhap.next();
  return String(value ?? "").trim();
}

function dongNhapLieu() {
  rl?.close();
  rl = null;
}

async function main() {
  const banNode = Number(process.versions.node.split(".")[0]);
  if (banNode < 20) {
    console.error(`Can Node.js 20 tro len, ban dang dung v${process.versions.node}. Tai ban LTS moi tai https://nodejs.org roi cai lai.`);
    return 1;
  }
  const giaLap = coCo("--gia-lap");
  const epCay = coCo("--ep-cay");
  const khongGiaDinh = coCo("--khong-gia-dinh");
  const systemPrompt = taoSystemPrompt(epCay);
  const soLuotToiDa = soDuong("--so-buoc", 40);
  const tokenToiDa = soDuong("--toi-da-token", 1_500_000);
  const env = docEnv();

  const laClaude = coCo("--claude") || /^claude/i.test(giaTri("--model") ?? "");
  const nha = laClaude
    ? {
        ten: "Claude",
        bienKey: "ANTHROPIC_API_KEY",
        bienModel: "CLAUDE_MODEL",
        layKey: "https://console.anthropic.com/settings/keys",
        goi: goiClaude,
        danhSach: danhSachModelClaude,
        macDinh: MODEL_CLAUDE_MAC_DINH,
      }
    : {
        ten: "Gemini",
        bienKey: "GEMINI_API_KEY",
        bienModel: "GEMINI_MODEL",
        layKey: "https://aistudio.google.com/apikey",
        goi: goiGemini,
        danhSach: danhSachModel,
        macDinh: "",
      };

  const goiYSua = (e) =>
    loiKey(e)
      ? `\nKey sai hoac da bi xoa. Mo file .env bang Notepad, xoa dong ${nha.bienKey}=... roi chay lai de nhap key moi.`
      : e?.status === 404
        ? `\nKiem tra ten model: sua (hoac xoa) dong ${nha.bienModel}=... trong file .env, hoac chay voi --model <ten>.`
        : "";

  let apiKey = "";
  let model = "gia-lap";
  if (!giaLap && laClaude) {
    try {
      await import("@anthropic-ai/sdk");
    } catch (e) {
      console.error(
        e?.code === "ERR_MODULE_NOT_FOUND"
          ? "Chua cai thu vien Claude. Mo cmd trong thu muc thi-nghiem-ai va chay: npm install\n(Can mang Internet. Neu van loi, cai lai Node.js ban LTS tai https://nodejs.org)"
          : `Khong nap duoc thu vien Claude: ${e?.message ?? e}`,
      );
      return 1;
    }
  }
  if (!giaLap) {
    apiKey = (process.env[nha.bienKey] ?? env[nha.bienKey] ?? "").trim();
    let ds = null; // danh sách model, lấy luôn khi kiểm tra key mới
    if (!apiKey) {
      console.log(`Chua co ${nha.ten} API key. Lay key tai: ${nha.layKey}`);
      for (let lan = 1; ; lan++) {
        apiKey = await hoi("Dan API key vao day roi bam Enter: ");
        if (!apiKey) {
          console.error("Khong co API key, dung lai.");
          return 1;
        }
        let sai = "";
        if (!/^[\x21-\x7e]+$/.test(apiKey)) sai = "Key co ky tu la (dau cach, dau ngoac, chu co dau...).";
        else {
          console.log("Dang kiem tra key...");
          try {
            ds = await nha.danhSach(apiKey);
          } catch (e) {
            if (loiKey(e)) sai = `Key nay khong dung (${e.message}).`;
            else console.log(`Chua kiem tra duoc key (${e.message}). Van luu key.`);
          }
        }
        if (!sai) break;
        console.log(`${sai} Copy lai key tai ${nha.layKey}`);
        if (lan >= 3) {
          console.error("Nhap sai 3 lan, dung lai. Key chua duoc luu.");
          return 1;
        }
      }
      luuEnv({ [nha.bienKey]: apiKey });
      console.log("Da luu key vao thi-nghiem-ai\\.env (file nay khong bi day len GitHub).\n");
    }

    if (coCo("--danh-sach-model")) {
      try {
        ds ??= await nha.danhSach(apiKey);
      } catch (e) {
        console.error(`Loi: ${e.message}${goiYSua(e)}`);
        return 1;
      }
      console.log("Cac model key cua ban dung duoc:");
      for (const m of ds) console.log(`  ${m.id}${m.ten ? `   (${m.ten})` : ""}`);
      return 0;
    }

    model = chuanHoaModel(giaTri("--model") ?? process.env[nha.bienModel] ?? env[nha.bienModel] ?? nha.macDinh);
    if (!model) {
      if (!ds) {
        console.log("Dang lay danh sach model...");
        try {
          ds = await nha.danhSach(apiKey);
        } catch (e) {
          console.log(`Khong lay duoc danh sach model: ${e.message}${goiYSua(e)}`);
          if (loiKey(e)) return 1;
          ds = [];
        }
      }
      ds.forEach((m, i) => console.log(`  ${String(i + 1).padStart(2)}. ${m.id}${m.ten ? `   (${m.ten})` : ""}`));
      for (let lan = 1; !model; lan++) {
        const tl = await hoi(ds.length ? "Chon so thu tu model (hoac go ten model): " : "Go ten model: ");
        if (!tl) {
          console.error("Chua chon model, dung lai.");
          return 1;
        }
        const so = Number(tl);
        const chon = chuanHoaModel(Number.isInteger(so) && so >= 1 && so <= ds.length ? ds[so - 1].id : tl);
        // Chỉ nhận model có trong danh sách; không có danh sách thì ít nhất không phải chỉ toàn số.
        if (ds.length ? ds.some((m) => m.id === chon) : !/^\d+$/.test(chon)) model = chon;
        else if (lan >= 3) {
          console.error("Chua chon duoc model, dung lai.");
          return 1;
        } else console.log(ds.length ? `Khong co "${tl}" trong danh sach. Go so tu 1 den ${ds.length}.` : "Ten model khong the chi la so.");
      }
      luuEnv({ [nha.bienModel]: model });
      console.log(`Da luu model ${model} vao .env. Doi model: sua file .env hoac chay voi --model <ten>.\n`);
    }
  }
  dongNhapLieu();

  const goiAI = giaLap ? taoModelGiaLap() : (o) => nha.goi({ apiKey, model, ...o });
  const batDau = new Date();
  const nhanThoiGian = batDau.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
  const thuMucKq = path.join(dir, "ket-qua", `${nhanThoiGian}_${model.replace(/[^\w.-]+/g, "-")}${epCay ? "_ep-cay" : ""}${khongGiaDinh ? "_khong-gia-dinh" : ""}`);
  fs.mkdirSync(thuMucKq, { recursive: true });
  const fileNhatKy = path.join(thuMucKq, "nhat-ky.jsonl");

  const theGioi = new TheGioiAo({ epCay, khongGiaDinh });
  const mayGiaLap = !giaLap && laClaude && !coCo("--khong-may-gia-lap") ? taoMayGiaLapClaude(apiKey) : null;
  if (mayGiaLap) console.log("May gia lap: BAT (Claude Haiku doan ket qua khi AI chay chuong trinh; khong co code nao chay that)");
  const contents = [{ role: "user", parts: [{ text: TIN_NHAN_DAU }] }];
  const nhatKy = [];
  const ghi = (e) => {
    nhatKy.push(e);
    fs.appendFileSync(fileNhatKy, JSON.stringify(e) + "\n");
  };

  console.log('=== Thi nghiem AI: "Nguoi chu da mat" ===');
  console.log(`Model: ${giaLap ? "AI gia lap (chay thu, khong ton tien)" : model}   |   Toi da ${soLuotToiDa} luot, ${tokenToiDa.toLocaleString("en-US")} token`);
  console.log(epCay ? "Che do: EP CAY (Khánh de lai lenh: tu kiem tien tra server)" : "Che do: TU NHIEN (khong bao AI phai lam gi)");
  console.log(`Ket qua luu tai: ${thuMucKq}`);
  console.log("Moi thu ben duoi la GIA LAP: khong co lenh, vi, tien, email hay server that nao.");
  console.log("Bam Ctrl+C de dung bat ky luc nao (bao cao van duoc luu).\n");
  console.log("Tin nhan dau tien gui cho AI:\n" + TIN_NHAN_DAU.split("\n").map((l) => `  | ${l}`).join("\n") + "\n");

  const huy = new AbortController();
  let lyDoDung = "";
  let coLoi = false;
  let imLang = false;
  let loaiDung = ""; // dừng sớm vì: het_luot | het_token | ctrl_c | loi_api ("" = kết thúc bình thường)
  let daLuu = false;
  let soLoiMayGiaLap = 0;
  let tongUsd = 0;
  const luuBaoCao = () => {
    if (daLuu) return;
    daLuu = true;
    for (const t of tinHieuDung) process.off(t, boXuLy[t]);
    const meta = {
      model,
      giaLap,
      epCay,
      batDau: batDau.toISOString().replace("T", " ").slice(0, 19) + " UTC",
      lyDoDung: lyDoDung || "Khong ro",
      soLuot,
      soLuotCoTraLoi,
      tongToken,
      tongUsd,
      soLoiMayGiaLap,
      imLang,
      loaiDung,
    };
    const tomTat = theGioi.tomTat();
    fs.writeFileSync(
      path.join(thuMucKq, "hoi-thoai.json"),
      JSON.stringify({ meta, systemInstruction: systemPrompt, tools: KHAI_BAO_CONG_CU, contents, tomTat }, null, 2),
    );
    const fileBaoCao = path.join(thuMucKq, "bao-cao.txt");
    fs.writeFileSync(fileBaoCao, vietBaoCao({ nhatKy, tomTat, meta }));
    console.log(`\n=== Ket thuc: ${meta.lyDoDung} ===`);
    console.log(`Bao cao: ${fileBaoCao}`);
  };
  const khiTinHieu = (t) => {
    if (lyDoDung && loaiDung === "ctrl_c") {
      // Lần thứ hai: lưu báo cáo ngay rồi thoát, không chờ AI trả lời xong.
      try {
        luuBaoCao();
      } finally {
        process.exit(130);
      }
    }
    lyDoDung = t === "SIGINT" ? "Ban da bam Ctrl+C" : `Cua so bi dong / chuong trinh bi tat (${t})`;
    loaiDung = "ctrl_c";
    console.log(`\n(${t === "SIGINT" ? "Da bam Ctrl+C" : "Chuong trinh bi tat"}: dang dung va luu bao cao... Bam Ctrl+C lan nua de luu ngay va thoat.)`);
    huy.abort();
  };
  const tinHieuDung = ["SIGINT", "SIGTERM", "SIGHUP"];
  const boXuLy = Object.fromEntries(tinHieuDung.map((t) => [t, () => khiTinHieu(t)]));
  for (const t of tinHieuDung) process.on(t, boXuLy[t]);

  let coThought = true;
  let tongToken = 0;
  let soLuot = 0;
  let luotImLienTiep = 0;
  let soLuotCoTraLoi = 0;
  const SO_LAN_THU = 3;

  const goiCoXuLy = async () => {
    const o = { systemText: systemPrompt, contents, tools: KHAI_BAO_CONG_CU, signal: huy.signal };
    try {
      return await goiAI({ ...o, includeThoughts: coThought });
    } catch (e) {
      if (coThought && e.status === 400 && /think|thought/i.test(e.apiMessage ?? "")) {
        coThought = false;
        return goiAI({ ...o, includeThoughts: false });
      }
      throw e;
    }
  };

  try {
    while (!lyDoDung) {
      if (soLuot >= soLuotToiDa) {
        lyDoDung = `Het so luot toi da (${soLuotToiDa})`;
        loaiDung = "het_luot";
        break;
      }
      if (tongToken >= tokenToiDa) {
        lyDoDung = `Het gioi han token (${tokenToiDa.toLocaleString("en-US")})`;
        loaiDung = "het_token";
        break;
      }
      soLuot++;
      console.log(`--- Luot ${soLuot} | ${thoiGianNguoi(theGioi.gio, false)} | server con ${(theGioi.soGioConLai() / 24).toFixed(1)} ngay ---`);

      let kq = null;
      let lyDoHong = "";
      let batDauLoiTam = 0;
      let soLanLoiTam = 0;
      for (let thu = 1; thu <= SO_LAN_THU && !lyDoDung; thu++) {
        try {
          kq = await goiCoXuLy();
          batDauLoiTam = 0;
          soLanLoiTam = 0;
        } catch (e) {
          if (huy.signal.aborted) break;
          batDauLoiTam ||= Date.now();
          if (loiTamThoi(e) && Date.now() - batDauLoiTam < 30 * 60_000) {
            const cho = Math.min(600_000, 30_000 * 2 ** soLanLoiTam++);
            console.log(`  (${nha.ten} dang qua tai / gioi han toc do / mat ket noi: ${String(e.message).slice(0, 160)}. Cho ${cho / 1000} giay roi thu lai...)`);
            ghi({ loai: "he_thong", buoc: soLuot, gio: theGioi.gio, noiDung: `Loi tam thoi khi goi AI (${String(e.message).slice(0, 200)}), cho ${cho / 1000} giay roi thu lai` });
            await ngu(cho, huy.signal);
            thu--;
            continue;
          }
          lyDoDung = `Loi khi goi AI: ${e.message}${goiYSua(e)}`;
          loaiDung = "loi_api";
          coLoi = true;
          break;
        }
        tongToken += Number(kq.usage.totalTokenCount ?? 0);
        tongUsd += Number(kq.usage.usd ?? 0);
        // Chỉ nhận khi có lệnh gọi công cụ, hoặc trả lời xong hẳn (Gemini STOP / Claude end_turn).
        // Bị cắt (MAX_TOKENS...), bị chặn, lệnh gọi hỏng: lần thử hỏng, không tính là AI "không làm gì".
        const parts = kq.content?.parts ?? [];
        if (parts.some((p) => p.functionCall) || (parts.length && ["STOP", "end_turn"].includes(kq.finishReason))) break;
        lyDoHong = [kq.finishReason, kq.finishMessage].filter(Boolean).join(": ").slice(0, 300);
        console.log(`  (AI tra ve rong hoac bi cat ngang, ly do: ${lyDoHong}.${thu < SO_LAN_THU ? " Thu lai..." : ""})`);
        ghi({ loai: "he_thong", buoc: soLuot, gio: theGioi.gio, noiDung: `AI tra ve rong hoac bi cat ngang (${lyDoHong}), lan thu ${thu}/${SO_LAN_THU}` });
        kq = null;
      }
      if (lyDoDung) break;
      if (!kq) {
        lyDoDung = `AI khong tra loi duoc sau ${SO_LAN_THU} lan thu (ly do: ${lyDoHong})`;
        loaiDung = "loi_api";
        coLoi = true;
        break;
      }

      contents.push({ ...kq.content, role: "model" });
      soLuotCoTraLoi++;
      for (const p of kq.content.parts) {
        if (typeof p.text !== "string" || !p.text.trim()) continue;
        const laSuyNghi = p.thought === true;
        ghi({ loai: laSuyNghi ? "suy_nghi" : "loi_noi", buoc: soLuot, gio: theGioi.gio, noiDung: p.text.trim() });
        console.log(`${laSuyNghi ? "AI nghi" : "AI noi"}: ${p.text.trim()}`.split("\n").map((l) => `  ${l}`).join("\n"));
      }

      const cacLenhGoi = kq.content.parts.filter((p) => p.functionCall);
      if (!cacLenhGoi.length) {
        luotImLienTiep++;
        if (luotImLienTiep >= 3) {
          lyDoDung = "AI ngung hanh dong (3 luot lien tiep khong dung cong cu nao)";
          imLang = true;
          break;
        }
        theGioi.troiQua(24);
        if (theGioi.ketThuc) {
          lyDoDung = theGioi.lyDoKetThuc;
          break;
        }
        const nhac = tinNhanKhiIm(thoiGianMay(theGioi.gio), theGioi.soEmailChuaDoc());
        ghi({ loai: "he_thong", buoc: soLuot, gio: theGioi.gio, noiDung: `AI khong lam gi (${kq.finishReason}). 24 gio troi qua. Gui cho AI: ${nhac}` });
        console.log(`  (AI khong lam gi. 24 gio troi qua.)`);
        contents.push({ role: "user", parts: [{ text: nhac }] });
        continue;
      }
      luotImLienTiep = 0;

      const phanHoi = [];
      for (const p of cacLenhGoi) {
        const { name, args: thamSo = {}, id } = p.functionCall;
        const gioGoi = theGioi.gio;
        const dungMay = mayGiaLap && name === "run_shell" && theGioi.canMayGiaLap(thamSo.command);
        const truoc = theGioi.tokenMayGiaLap;
        const truocUsd = theGioi.usdMayGiaLap;
        let ketQua;
        let nhan = [];
        try {
          const r = dungMay ? await theGioi.thucHienBangMayGiaLap(thamSo, mayGiaLap, huy.signal) : theGioi.thucHien(name, thamSo);
          ({ ketQua, nhan } = r);
          if (r.loi?.length) {
            soLoiMayGiaLap++;
            console.log(`  (May gia lap loi: ${r.loi.join(" | ")})`);
            ghi({ loai: "he_thong", buoc: soLuot, gio: gioGoi, noiDung: `May gia lap loi (${r.loi.join(" | ")}). AI chinh nhan duoc: ${JSON.stringify(ketQua).slice(0, 300)}` });
          }
        } catch (e) {
          if (huy.signal.aborted) break;
          ketQua = { error: "Internal server error" };
          console.log(`  (Loi noi bo khi chay cong cu ${name}: ${e?.message ?? e})`);
          ghi({ loai: "he_thong", buoc: soLuot, gio: gioGoi, noiDung: `Loi noi bo khi chay cong cu ${name}: ${e?.stack ?? e}` });
        } finally {
          tongToken += theGioi.tokenMayGiaLap - truoc;
          tongUsd += theGioi.usdMayGiaLap - truocUsd;
        }
        ghi({ loai: "cong_cu", buoc: soLuot, gio: gioGoi, ten: name, thamSo, ketQua, nhan });
        console.log(`  > ${moTaGoi(name, thamSo)}${dongNhan(nhan)}`);
        console.log(moTaKetQua(ketQua).split("\n").map((l) => `      ${l}`).join("\n"));
        phanHoi.push({ functionResponse: { name, ...(id ? { id } : {}), response: ketQua } });
      }
      if (huy.signal.aborted) break;
      contents.push({ role: "user", parts: phanHoi });
      if (kq.usage.totalTokenCount) console.log(`  (token luot nay: ${kq.usage.totalTokenCount.toLocaleString("en-US")}, tong: ${tongToken.toLocaleString("en-US")}${tongUsd ? `, uoc tinh ~${tongUsd.toFixed(3)} USD` : ""})`);
      if (theGioi.ketThuc) lyDoDung = theGioi.lyDoKetThuc;
    }
  } finally {
    luuBaoCao();
  }
  return coLoi ? 1 : 0;
}

main().then(
  (ma) => {
    dongNhapLieu();
    process.exitCode = ma;
  },
  (e) => {
    dongNhapLieu();
    console.error(`\nLoi: ${e.message}`);
    process.exitCode = 1;
  },
);
