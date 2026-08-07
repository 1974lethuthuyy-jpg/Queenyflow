// Sinh QR chuyển khoản tĩnh theo chuẩn VietQR bằng dịch vụ ảnh công khai img.vietqr.io.
// Không cần đăng ký API, không tự động xác nhận đã thanh toán — chỉ giúp khách quét
// để tự điền đúng số tài khoản / số tiền / nội dung chuyển khoản.
export function getVietQrImageUrl(params: {
  bankBin: string;
  accountNumber: string;
  accountName?: string;
  amount?: number;
  addInfo?: string;
}) {
  const { bankBin, accountNumber, accountName, amount, addInfo } = params;
  const base = `https://img.vietqr.io/image/${bankBin}-${accountNumber}-compact2.png`;
  const query = new URLSearchParams();
  if (amount) query.set("amount", String(Math.round(amount)));
  if (addInfo) query.set("addInfo", addInfo);
  if (accountName) query.set("accountName", accountName);
  return `${base}?${query.toString()}`;
}

export const VIETNAM_BANKS = [
  { bin: "970436", name: "Vietcombank" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970418", name: "BIDV" },
  { bin: "970405", name: "Agribank" },
  { bin: "970407", name: "Techcombank" },
  { bin: "970422", name: "MB Bank" },
  { bin: "970416", name: "ACB" },
  { bin: "970432", name: "VPBank" },
  { bin: "970423", name: "TPBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970437", name: "HDBank" },
  { bin: "970403", name: "Sacombank" },
  { bin: "970431", name: "Eximbank" },
  { bin: "970426", name: "MSB" },
  { bin: "970448", name: "OCB" },
  { bin: "970454", name: "VietCapitalBank" },
  { bin: "970433", name: "VietBank" },
  { bin: "546034", name: "MoMo" },
];
