export type Role = "admin" | "employee";

export type Profile = {
  id: string;
  role: Role;
  org_id: string;
  username: string | null;
  display_name: string;
  avatar_url: string | null;
  facebook_link: string | null;
  zalo_oa_link: string | null;
  created_at: string;
};

export type Organization = {
  id: string;
  business_name: string;
  owner_email: string;
  bank_bin: string | null;
  bank_account_number: string | null;
  bank_account_name: string | null;
  created_at: string;
};

export type Delegation = {
  id: string;
  owner_org_id: string;
  grantee_org_id: string;
  status: "active" | "revoked";
  created_at: string;
  organizations?: { business_name: string; owner_email: string };
};

export type ProductStatus = "active" | "inactive";

export type Product = {
  id: string;
  org_id: string;
  name: string;
  sku: string | null;
  category: string | null;
  unit: string;
  cost_price: number;
  sale_price: number;
  stock_quantity: number;
  low_stock_threshold: number;
  image_url: string | null;
  status: ProductStatus;
  created_at: string;
  updated_at: string;
};

export type InventoryMovement = {
  id: string;
  org_id: string;
  product_id: string;
  type: "in" | "out";
  quantity: number;
  note: string | null;
  related_order_id: string | null;
  created_by: string | null;
  created_at: string;
  products?: { name: string; unit: string };
};

export type CustomerGroup = "Mới" | "Thường" | "Thân thiết" | "VIP" | "Tiềm năng" | "Ngừng giao dịch";

export type Customer = {
  id: string;
  org_id: string;
  name: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  region: string | null;
  group_tag: CustomerGroup;
  avatar_url: string | null;
  notes: string | null;
  assigned_to: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
};

export type OrderStatus = "cho_xac_nhan" | "dang_xu_ly" | "dang_giao" | "hoan_thanh" | "da_huy";
export type PaymentMethod = "qr" | "cash" | "debt";
export type PaymentStatus = "paid" | "unpaid";

export type OrderItem = {
  id: string;
  order_id: string;
  product_id: string | null;
  product_name: string;
  unit_price: number;
  quantity: number;
  line_total: number;
};

export type Order = {
  id: string;
  org_id: string;
  code: string;
  customer_id: string | null;
  status: OrderStatus;
  payment_method: PaymentMethod;
  payment_status: PaymentStatus;
  subtotal: number;
  discount: number;
  total_amount: number;
  note: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  customers?: Customer | null;
  order_items?: OrderItem[];
};

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  cho_xac_nhan: "Chờ xác nhận",
  dang_xu_ly: "Đang xử lý",
  dang_giao: "Đang giao",
  hoan_thanh: "Hoàn thành",
  da_huy: "Đã hủy",
};

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  qr: "QR ngân hàng",
  cash: "Tiền mặt",
  debt: "Ghi nợ",
};
