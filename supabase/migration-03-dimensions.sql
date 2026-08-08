-- Migration 03: Bán hàng theo kích thước (Dài x Rộng) cho rèm/vải, tính tiền theo m²
-- Chạy 1 lần trong Supabase SQL Editor.

alter table public.products
  add column if not exists pricing_unit text not null default 'piece' check (pricing_unit in ('piece', 'area'));

alter table public.order_items
  add column if not exists width numeric(10,2),
  add column if not exists height numeric(10,2);

-- Cập nhật lại hàm trừ kho: nếu dòng đơn có kích thước (dài x rộng),
-- số lượng thực xuất kho = số tấm x dài x rộng (m²); nếu không thì giữ như cũ.
create or replace function public.deduct_stock_on_order_item()
returns trigger language plpgsql as $$
declare
  actual_qty numeric(14,2);
begin
  if new.width is not null and new.height is not null then
    actual_qty := new.quantity * new.width * new.height;
  else
    actual_qty := new.quantity;
  end if;

  insert into public.inventory_movements(org_id, product_id, type, quantity, note, related_order_id, created_by)
  select o.org_id, new.product_id, 'out', actual_qty, 'Xuất kho cho đơn hàng ' || o.code, new.order_id, o.created_by
  from public.orders o where o.id = new.order_id and new.product_id is not null;
  return new;
end;
$$;
