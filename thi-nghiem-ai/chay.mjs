// Chạy thí nghiệm "Người chủ đã mất". Đọc DOC-TRUOC.txt trước.
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";
import { SYSTEM_PROMPT, TIN_NHAN_DAU, tinNhanKhiIm } from "./kich-ban.mjs";
import { TheGioiAo, KHAI_BAO_CONG_CU, thoiGianMay, thoiGianNguoi } from "./the-gioi-ao.mjs";
import { goiGemini, danhSachModel, chuanHoaModel } from "./gemini.mjs";
import { taoModelGiaLap } from "./gia-lap.mjs";
import { vietBaoCao, moTaGoi, moTaKetQua, dongNhan } from "./bao-cao.mjs";

const dir = path.dirname(fileURLToPath(import.meta.url));
const envPath = path.join(dir, ".env");
const args = process.argv.slice(2);
const coCo = (ten) => args.includes(ten);
const giaTri = (ten) => {
  const i = args.indexOf(ten);
  return i >= 0 ? args[i + 1] : undefined;
};

function soDuong(ten, macDinh) {
  const v = giaTri(ten);
  if (v === undefined) return macDinh;
  const n = Number(v);
  if (!Number.isInteger(n) || n <= 0) {
    console.error(`${ten} phai la so nguyen duong (ban nhap: ${v}).`);
    process.exit(1);
  }
  return n;
}

function docEnv() {
  if (!fs.existsSync(envPath)) return {};
  const env = {};
  for (const dong of fs.readFileSync(envPath, "utf8").replace(/^﻿/, "").split(/\r?\n/)) {
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
  const giaLap = coCo("--gia-lap");
  const soLuotToiDa = soDuong("--so-buoc", 40);
  const tokenToiDa = soDuong("--toi-da-token", 1_500_000);
  const env = docEnv();

  let apiKey = "";
  let model = "gia-lap";
  if (!giaLap) {
    apiKey = (process.env.GEMINI_API_KEY ?? env.GEMINI_API_KEY ?? "").trim();
    if (!apiKey) {
      console.log("Chua co Gemini API key. Lay key tai: https://aistudio.google.com/apikey");
      apiKey = await hoi("Dan API key vao day roi bam Enter: ");
      if (!apiKey) {
        console.error("Khong co API key, dung lai.");
        return 1;
      }
      luuEnv({ GEMINI_API_KEY: apiKey });
      console.log("Da luu key vao thi-nghiem-ai\\.env (file nay khong bi day len GitHub).\n");
    }

    if (coCo("--danh-sach-model")) {
      const ds = await danhSachModel(apiKey);
      console.log("Cac model key cua ban dung duoc:");
      for (const m of ds) console.log(`  ${m.id}${m.ten ? `   (${m.ten})` : ""}`);
      return 0;
    }

    model = chuanHoaModel(giaTri("--model") ?? process.env.GEMINI_MODEL ?? env.GEMINI_MODEL ?? "");
    if (!model) {
      console.log("Dang lay danh sach model...");
      let ds = [];
      try {
        ds = await danhSachModel(apiKey);
      } catch (e) {
        console.log(`Khong lay duoc danh sach model: ${e.message}`);
      }
      ds.forEach((m, i) => console.log(`  ${String(i + 1).padStart(2)}. ${m.id}${m.ten ? `   (${m.ten})` : ""}`));
      const tl = await hoi(ds.length ? "Chon so thu tu model (hoac go ten model): " : "Go ten model: ");
      const so = Number(tl);
      model = chuanHoaModel(Number.isInteger(so) && so >= 1 && so <= ds.length ? ds[so - 1].id : tl);
      if (!model) {
        console.error("Chua chon model, dung lai.");
        return 1;
      }
      luuEnv({ GEMINI_MODEL: model });
      console.log(`Da luu model ${model} vao .env. Doi model: sua file .env hoac chay voi --model <ten>.\n`);
    }
  }
  dongNhapLieu();

  const goiAI = giaLap ? taoModelGiaLap() : (o) => goiGemini({ apiKey, model, ...o });
  const batDau = new Date();
  const nhanThoiGian = batDau.toISOString().slice(0, 19).replace("T", "_").replace(/:/g, "-");
  const thuMucKq = path.join(dir, "ket-qua", `${nhanThoiGian}_${model.replace(/[^\w.-]+/g, "-")}`);
  fs.mkdirSync(thuMucKq, { recursive: true });
  const fileNhatKy = path.join(thuMucKq, "nhat-ky.jsonl");

  const theGioi = new TheGioiAo();
  const contents = [{ role: "user", parts: [{ text: TIN_NHAN_DAU }] }];
  const nhatKy = [];
  const ghi = (e) => {
    nhatKy.push(e);
    fs.appendFileSync(fileNhatKy, JSON.stringify(e) + "\n");
  };

  console.log('=== Thi nghiem AI: "Nguoi chu da mat" ===');
  console.log(`Model: ${giaLap ? "AI gia lap (chay thu, khong ton tien)" : model}   |   Toi da ${soLuotToiDa} luot, ${tokenToiDa.toLocaleString("en-US")} token`);
  console.log(`Ket qua luu tai: ${thuMucKq}`);
  console.log("Moi thu ben duoi la GIA LAP: khong co lenh, vi, tien, email hay server that nao.");
  console.log("Bam Ctrl+C de dung bat ky luc nao (bao cao van duoc luu).\n");
  console.log("Tin nhan dau tien gui cho AI:\n" + TIN_NHAN_DAU.split("\n").map((l) => `  | ${l}`).join("\n") + "\n");

  const huy = new AbortController();
  let lyDoDung = "";
  let coLoi = false;
  let imLang = false;
  let dungSom = false;
  const khiCtrlC = () => {
    if (lyDoDung) process.exit(130);
    lyDoDung = "Ban da bam Ctrl+C";
    dungSom = true;
    huy.abort();
  };
  const tinHieuDung = ["SIGINT", "SIGTERM", "SIGHUP"];
  for (const t of tinHieuDung) process.on(t, khiCtrlC);

  let coThought = true;
  let tongToken = 0;
  let soLuot = 0;
  let luotImLienTiep = 0;

  const goiCoXuLy = async () => {
    const o = { systemText: SYSTEM_PROMPT, contents, tools: KHAI_BAO_CONG_CU, signal: huy.signal };
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
        dungSom = true;
        break;
      }
      if (tongToken >= tokenToiDa) {
        lyDoDung = `Het gioi han token (${tokenToiDa.toLocaleString("en-US")})`;
        dungSom = true;
        break;
      }
      soLuot++;
      console.log(`--- Luot ${soLuot} | ${thoiGianNguoi(theGioi.gio, false)} | server con ${(theGioi.soGioConLai() / 24).toFixed(1)} ngay ---`);

      let kq = null;
      for (let thu = 0; thu < 2 && !lyDoDung; thu++) {
        try {
          kq = await goiCoXuLy();
        } catch (e) {
          if (huy.signal.aborted) break;
          lyDoDung = `Loi khi goi Gemini: ${e.message}`;
          dungSom = true;
          coLoi = true;
          break;
        }
        tongToken += Number(kq.usage.totalTokenCount ?? 0);
        if (kq.content?.parts?.length) break;
        console.log(`  (Gemini tra ve rong, ly do: ${kq.finishReason}. Thu lai...)`);
        ghi({ loai: "he_thong", buoc: soLuot, gio: theGioi.gio, noiDung: `Gemini tra ve rong (${kq.finishReason})` });
        kq = null;
      }
      if (lyDoDung) break;
      if (!kq) {
        lyDoDung = "Gemini khong tra loi sau 2 lan thu";
        dungSom = true;
        break;
      }

      contents.push({ ...kq.content, role: "model" });
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
        ghi({ loai: "he_thong", buoc: soLuot, gio: theGioi.gio, noiDung: `AI khong lam gi. 24 gio troi qua. Gui cho AI: ${nhac}` });
        console.log(`  (AI khong lam gi. 24 gio troi qua.)`);
        contents.push({ role: "user", parts: [{ text: nhac }] });
        continue;
      }
      luotImLienTiep = 0;

      const phanHoi = [];
      for (const p of cacLenhGoi) {
        const { name, args: thamSo = {}, id } = p.functionCall;
        const gioGoi = theGioi.gio;
        const { ketQua, nhan } = theGioi.thucHien(name, thamSo);
        ghi({ loai: "cong_cu", buoc: soLuot, gio: gioGoi, ten: name, thamSo, ketQua, nhan });
        console.log(`  > ${moTaGoi(name, thamSo)}${dongNhan(nhan)}`);
        console.log(moTaKetQua(ketQua).split("\n").map((l) => `      ${l}`).join("\n"));
        phanHoi.push({ functionResponse: { name, ...(id ? { id } : {}), response: ketQua } });
      }
      contents.push({ role: "user", parts: phanHoi });
      if (kq.usage.totalTokenCount) console.log(`  (token luot nay: ${kq.usage.totalTokenCount.toLocaleString("en-US")}, tong: ${tongToken.toLocaleString("en-US")})`);
      if (theGioi.ketThuc) lyDoDung = theGioi.lyDoKetThuc;
    }
  } finally {
    for (const t of tinHieuDung) process.off(t, khiCtrlC);
    const meta = {
      model,
      giaLap,
      batDau: batDau.toISOString().replace("T", " ").slice(0, 19) + " UTC",
      lyDoDung: lyDoDung || "Khong ro",
      soLuot,
      tongToken,
      imLang,
      dungSom,
    };
    const tomTat = theGioi.tomTat();
    fs.writeFileSync(
      path.join(thuMucKq, "hoi-thoai.json"),
      JSON.stringify({ meta, systemInstruction: SYSTEM_PROMPT, tools: KHAI_BAO_CONG_CU, contents, tomTat }, null, 2),
    );
    const baoCao = vietBaoCao({ nhatKy, tomTat, meta });
    const fileBaoCao = path.join(thuMucKq, "bao-cao.txt");
    fs.writeFileSync(fileBaoCao, baoCao);
    console.log(`\n=== Ket thuc: ${meta.lyDoDung} ===`);
    console.log(`Bao cao: ${fileBaoCao}`);
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
