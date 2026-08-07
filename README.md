# Queeny Flow

Ứng dụng quản trị bán hàng & CSKH: sản phẩm, kho, khách hàng, đơn hàng kèm hóa đơn và QR thanh toán ngân hàng, quản lý nhân viên và ủy quyền truy cập giữa các tài khoản admin.

## Công nghệ

- [Next.js](https://nextjs.org) (App Router) + TypeScript + Tailwind CSS
- [Supabase](https://supabase.com) (Postgres, Auth, Storage)

## Thiết lập

1. Tạo project tại [supabase.com](https://supabase.com).
2. Vào **SQL Editor**, chạy toàn bộ nội dung [supabase/schema.sql](supabase/schema.sql) một lần.
3. Copy `.env.local.example` thành `.env.local`, điền `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (lấy trong Project Settings > API).
4. Chạy:

```bash
npm install
npm run dev
```

Mở [http://localhost:3000](http://localhost:3000).

## Triển khai

Deploy trên [Vercel](https://vercel.com): import repo này, thêm đúng 3 biến môi trường ở bước 3 vào phần Environment Variables của project trên Vercel.
