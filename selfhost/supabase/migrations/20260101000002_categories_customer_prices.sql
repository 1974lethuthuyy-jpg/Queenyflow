-- Migration 02: Loại đơn hàng (tự đặt tên) + Giá riêng theo từng khách hàng
-- Chạy 1 lần trong Supabase SQL Editor (sau khi đã chạy schema.sql).

create table if not exists public.order_categories (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique(org_id, name)
);

alter table public.orders add column if not exists category_id uuid references public.order_categories(id);

create table if not exists public.customer_prices (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  price numeric(14,0) not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, product_id)
);
create index if not exists customer_prices_customer_idx on public.customer_prices(customer_id);

alter table public.order_categories enable row level security;
alter table public.customer_prices enable row level security;

drop policy if exists order_categories_select on public.order_categories;
create policy order_categories_select on public.order_categories for select
  using (org_id in (select public.accessible_org_ids()));
drop policy if exists order_categories_write on public.order_categories;
create policy order_categories_write on public.order_categories for all
  using (public.can_manage(org_id)) with check (public.can_manage(org_id));

drop policy if exists customer_prices_select on public.customer_prices;
create policy customer_prices_select on public.customer_prices for select
  using (org_id in (select public.accessible_org_ids()));
drop policy if exists customer_prices_write on public.customer_prices;
create policy customer_prices_write on public.customer_prices for all
  using (public.can_manage(org_id)) with check (public.can_manage(org_id));
