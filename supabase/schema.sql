-- ============================================================================
-- QUEENYFLOW - Supabase schema
-- Chạy toàn bộ file này trong Supabase Dashboard > SQL Editor (chạy 1 lần).
-- ============================================================================

create extension if not exists "pgcrypto";

-- ----------------------------------------------------------------------------
-- 1. PROFILES (mọi người dùng có tài khoản auth: admin hoặc nhân viên)
-- ----------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role text not null check (role in ('admin','employee')),
  org_id uuid, -- tổ chức mà user này thao tác (fk thêm sau khi tạo organizations)
  username text unique, -- chỉ dùng cho nhân viên (đăng nhập bằng username)
  display_name text not null default '',
  avatar_url text,
  facebook_link text,
  zalo_oa_link text,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. ORGANIZATIONS (mỗi tài khoản admin tạo bằng email = 1 organization)
-- ----------------------------------------------------------------------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  business_name text not null default 'Cửa hàng của tôi',
  owner_email text not null,
  bank_bin text,        -- mã BIN ngân hàng theo chuẩn VietQR (vd: 970436)
  bank_account_number text,
  bank_account_name text,
  created_at timestamptz not null default now()
);

alter table public.profiles
  add constraint profiles_org_id_fkey foreign key (org_id) references public.organizations(id) on delete cascade;

-- ----------------------------------------------------------------------------
-- 3. DELEGATIONS (tài khoản admin A cấp quyền truy cập dữ liệu cho admin B)
-- ----------------------------------------------------------------------------
create table if not exists public.delegations (
  id uuid primary key default gen_random_uuid(),
  owner_org_id uuid not null references public.organizations(id) on delete cascade,
  grantee_org_id uuid not null references public.organizations(id) on delete cascade,
  status text not null default 'active' check (status in ('active','revoked')),
  created_at timestamptz not null default now(),
  unique(owner_org_id, grantee_org_id)
);

-- ----------------------------------------------------------------------------
-- Helper functions (security definer, dùng trong RLS)
-- ----------------------------------------------------------------------------
create or replace function public.my_org_id()
returns uuid language sql stable security definer as $$
  select org_id from public.profiles where id = auth.uid()
$$;

create or replace function public.accessible_org_ids()
returns setof uuid language sql stable security definer as $$
  select org_id from public.profiles where id = auth.uid()
  union
  select d.owner_org_id from public.delegations d
    where d.grantee_org_id = (select org_id from public.profiles where id = auth.uid())
    and d.status = 'active'
$$;

create or replace function public.can_manage(target_org uuid)
returns boolean language sql stable security definer as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
    and (
      p.org_id = target_org
      or exists (
        select 1 from public.delegations d
        where d.owner_org_id = target_org and d.grantee_org_id = p.org_id and d.status = 'active'
      )
    )
  )
$$;

-- ----------------------------------------------------------------------------
-- 4. PRODUCTS
-- ----------------------------------------------------------------------------
create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  sku text,
  category text,
  unit text not null default 'Cái',
  cost_price numeric(14,0) not null default 0,
  sale_price numeric(14,0) not null default 0,
  stock_quantity numeric(14,2) not null default 0,
  low_stock_threshold numeric(14,2) not null default 10,
  image_url text,
  status text not null default 'active' check (status in ('active','inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_org_idx on public.products(org_id);

-- ----------------------------------------------------------------------------
-- 5. INVENTORY MOVEMENTS (nhập / xuất kho)
-- ----------------------------------------------------------------------------
create table if not exists public.inventory_movements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  type text not null check (type in ('in','out')),
  quantity numeric(14,2) not null check (quantity > 0),
  note text,
  related_order_id uuid,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists inventory_org_idx on public.inventory_movements(org_id);

create or replace function public.apply_inventory_movement()
returns trigger language plpgsql as $$
begin
  if new.type = 'in' then
    update public.products set stock_quantity = stock_quantity + new.quantity, updated_at = now() where id = new.product_id;
  else
    update public.products set stock_quantity = stock_quantity - new.quantity, updated_at = now() where id = new.product_id;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_apply_inventory_movement on public.inventory_movements;
create trigger trg_apply_inventory_movement
  after insert on public.inventory_movements
  for each row execute function public.apply_inventory_movement();

-- ----------------------------------------------------------------------------
-- 6. CUSTOMERS
-- ----------------------------------------------------------------------------
create table if not exists public.customers (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  name text not null,
  phone text,
  email text,
  address text,
  region text,
  group_tag text not null default 'Mới' check (group_tag in ('Mới','Thường','Thân thiết','VIP','Tiềm năng','Ngừng giao dịch')),
  avatar_url text,
  notes text,
  assigned_to uuid references public.profiles(id),
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists customers_org_idx on public.customers(org_id);

-- ----------------------------------------------------------------------------
-- 7. ORDERS + ORDER ITEMS
-- ----------------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations(id) on delete cascade,
  code text not null,
  customer_id uuid references public.customers(id),
  status text not null default 'cho_xac_nhan' check (status in ('cho_xac_nhan','dang_xu_ly','dang_giao','hoan_thanh','da_huy')),
  payment_method text not null check (payment_method in ('qr','cash','debt')),
  payment_status text not null default 'unpaid' check (payment_status in ('paid','unpaid')),
  subtotal numeric(14,0) not null default 0,
  discount numeric(14,0) not null default 0,
  total_amount numeric(14,0) not null default 0,
  note text,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(org_id, code)
);
create index if not exists orders_org_idx on public.orders(org_id);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid references public.products(id),
  product_name text not null,
  unit_price numeric(14,0) not null default 0,
  quantity numeric(14,2) not null default 1,
  line_total numeric(14,0) not null default 0
);
create index if not exists order_items_order_idx on public.order_items(order_id);

-- Xuất kho tự động khi thêm sản phẩm vào đơn hàng (trừ tồn kho)
create or replace function public.deduct_stock_on_order_item()
returns trigger language plpgsql as $$
begin
  insert into public.inventory_movements(org_id, product_id, type, quantity, note, related_order_id, created_by)
  select o.org_id, new.product_id, 'out', new.quantity, 'Xuất kho cho đơn hàng ' || o.code, new.order_id, o.created_by
  from public.orders o where o.id = new.order_id and new.product_id is not null;
  return new;
end;
$$;

drop trigger if exists trg_deduct_stock_on_order_item on public.order_items;
create trigger trg_deduct_stock_on_order_item
  after insert on public.order_items
  for each row execute function public.deduct_stock_on_order_item();

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY
-- ----------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.organizations enable row level security;
alter table public.delegations enable row level security;
alter table public.products enable row level security;
alter table public.inventory_movements enable row level security;
alter table public.customers enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;

-- profiles: xem được chính mình + đồng nghiệp cùng org + org được ủy quyền
drop policy if exists profiles_select on public.profiles;
create policy profiles_select on public.profiles for select
  using (id = auth.uid() or org_id in (select public.accessible_org_ids()));
drop policy if exists profiles_update_self on public.profiles;
create policy profiles_update_self on public.profiles for update
  using (id = auth.uid());

-- organizations
drop policy if exists organizations_select on public.organizations;
create policy organizations_select on public.organizations for select
  using (id in (select public.accessible_org_ids()));
drop policy if exists organizations_update on public.organizations;
create policy organizations_update on public.organizations for update
  using (public.can_manage(id));

-- delegations: chỉ admin sở hữu org mới xem/tạo/xoá được (từ 2 phía)
drop policy if exists delegations_select on public.delegations;
create policy delegations_select on public.delegations for select
  using (public.can_manage(owner_org_id) or public.can_manage(grantee_org_id));
drop policy if exists delegations_insert on public.delegations;
create policy delegations_insert on public.delegations for insert
  with check (public.can_manage(owner_org_id));
drop policy if exists delegations_delete on public.delegations;
create policy delegations_delete on public.delegations for delete
  using (public.can_manage(owner_org_id));

-- products: select cho mọi thành viên org (kể cả nhân viên); write chỉ admin/được ủy quyền
drop policy if exists products_select on public.products;
create policy products_select on public.products for select
  using (org_id in (select public.accessible_org_ids()));
drop policy if exists products_write on public.products;
create policy products_write on public.products for all
  using (public.can_manage(org_id)) with check (public.can_manage(org_id));

-- inventory_movements: select org; insert cho mọi thành viên org (nhân viên nhập/xuất kho được)
drop policy if exists inventory_select on public.inventory_movements;
create policy inventory_select on public.inventory_movements for select
  using (org_id in (select public.accessible_org_ids()));
drop policy if exists inventory_insert on public.inventory_movements;
create policy inventory_insert on public.inventory_movements for insert
  with check (org_id in (select public.accessible_org_ids()));

-- customers: select org; insert cho mọi thành viên; update/delete chỉ admin
drop policy if exists customers_select on public.customers;
create policy customers_select on public.customers for select
  using (org_id in (select public.accessible_org_ids()));
drop policy if exists customers_insert on public.customers;
create policy customers_insert on public.customers for insert
  with check (org_id in (select public.accessible_org_ids()));
drop policy if exists customers_write on public.customers;
create policy customers_write on public.customers for update
  using (public.can_manage(org_id)) with check (public.can_manage(org_id));
drop policy if exists customers_delete on public.customers;
create policy customers_delete on public.customers for delete
  using (public.can_manage(org_id));

-- orders: select org; insert cho mọi thành viên (nhân viên lên đơn được); update trạng thái cho mọi thành viên; delete chỉ admin
drop policy if exists orders_select on public.orders;
create policy orders_select on public.orders for select
  using (org_id in (select public.accessible_org_ids()));
drop policy if exists orders_insert on public.orders;
create policy orders_insert on public.orders for insert
  with check (org_id in (select public.accessible_org_ids()));
drop policy if exists orders_update on public.orders;
create policy orders_update on public.orders for update
  using (org_id in (select public.accessible_org_ids()));
drop policy if exists orders_delete on public.orders;
create policy orders_delete on public.orders for delete
  using (public.can_manage(org_id));

-- order_items: theo quyền của order tương ứng
drop policy if exists order_items_select on public.order_items;
create policy order_items_select on public.order_items for select
  using (exists (select 1 from public.orders o where o.id = order_id and o.org_id in (select public.accessible_org_ids())));
drop policy if exists order_items_insert on public.order_items;
create policy order_items_insert on public.order_items for insert
  with check (exists (select 1 from public.orders o where o.id = order_id and o.org_id in (select public.accessible_org_ids())));
drop policy if exists order_items_delete on public.order_items;
create policy order_items_delete on public.order_items for delete
  using (exists (select 1 from public.orders o where o.id = order_id and public.can_manage(o.org_id)));

-- ----------------------------------------------------------------------------
-- STORAGE BUCKETS (ảnh khách hàng & sản phẩm)
-- ----------------------------------------------------------------------------
insert into storage.buckets (id, name, public)
  values ('avatars', 'avatars', true)
  on conflict (id) do nothing;
insert into storage.buckets (id, name, public)
  values ('products', 'products', true)
  on conflict (id) do nothing;

drop policy if exists "avatars_public_read" on storage.objects;
create policy "avatars_public_read" on storage.objects for select
  using (bucket_id = 'avatars');
drop policy if exists "avatars_auth_write" on storage.objects;
create policy "avatars_auth_write" on storage.objects for insert
  with check (bucket_id = 'avatars' and auth.role() = 'authenticated');
drop policy if exists "avatars_auth_update" on storage.objects;
create policy "avatars_auth_update" on storage.objects for update
  using (bucket_id = 'avatars' and auth.role() = 'authenticated');

drop policy if exists "products_public_read" on storage.objects;
create policy "products_public_read" on storage.objects for select
  using (bucket_id = 'products');
drop policy if exists "products_auth_write" on storage.objects;
create policy "products_auth_write" on storage.objects for insert
  with check (bucket_id = 'products' and auth.role() = 'authenticated');
drop policy if exists "products_auth_update" on storage.objects;
create policy "products_auth_update" on storage.objects for update
  using (bucket_id = 'products' and auth.role() = 'authenticated');
