-- Migration 04: Thêm cách tính giá "theo mét dài" (cho ray rèm, thanh nhôm...)
-- Chạy 1 lần trong Supabase SQL Editor.

alter table public.products drop constraint if exists products_pricing_unit_check;
alter table public.products add constraint products_pricing_unit_check check (pricing_unit in ('piece', 'area', 'length'));

create or replace function public.deduct_stock_on_order_item()
returns trigger language plpgsql as $$
declare
  actual_qty numeric(14,2);
begin
  if new.width is not null and new.height is not null then
    actual_qty := new.quantity * new.width * new.height;
  elsif new.height is not null then
    actual_qty := new.quantity * new.height;
  else
    actual_qty := new.quantity;
  end if;

  insert into public.inventory_movements(org_id, product_id, type, quantity, note, related_order_id, created_by)
  select o.org_id, new.product_id, 'out', actual_qty, 'Xuat kho cho don hang ' || o.code, new.order_id, o.created_by
  from public.orders o where o.id = new.order_id and new.product_id is not null;
  return new;
end;
$$;
