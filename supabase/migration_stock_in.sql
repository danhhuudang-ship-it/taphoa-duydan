-- ====================================================================
-- MIGRATION: Nhập hàng có hạn sử dụng + giá vốn trung bình
-- Chạy trong Supabase SQL Editor
-- ====================================================================

-- 1) Bảng các lô nhập hàng
create table if not exists stock_batches (
  id            uuid primary key default gen_random_uuid(),
  product_id    uuid references products(id) on delete cascade,
  quantity      int not null,
  cost          numeric(12,2) not null,
  expiry_date   date,
  note          text,
  created_at    timestamptz default now()
);

create index if not exists idx_stock_batches_product on stock_batches(product_id);
create index if not exists idx_stock_batches_expiry  on stock_batches(expiry_date)
  where expiry_date is not null;

alter table stock_batches enable row level security;
drop policy if exists "auth_all_stock_batches" on stock_batches;
create policy "auth_all_stock_batches" on stock_batches
  for all to authenticated using (true) with check (true);

-- 2) RPC nhập hàng: insert batch + update product stock & WEIGHTED AVERAGE cost
create or replace function stock_in(
  p_product_id  uuid,
  p_quantity    int,
  p_cost        numeric,
  p_expiry_date date,
  p_note        text
) returns void as $$
declare
  v_old_stock int;
  v_old_cost  numeric;
  v_new_stock int;
  v_new_cost  numeric;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Số lượng phải > 0';
  end if;
  if p_cost is null or p_cost < 0 then
    raise exception 'Giá vốn không hợp lệ';
  end if;

  select stock, coalesce(cost, 0)
    into v_old_stock, v_old_cost
  from products where id = p_product_id;

  v_new_stock := coalesce(v_old_stock, 0) + p_quantity;

  -- Giá vốn trung bình có trọng số
  if v_new_stock > 0 then
    v_new_cost := ((coalesce(v_old_stock, 0) * v_old_cost) + (p_quantity * p_cost)) / v_new_stock;
  else
    v_new_cost := p_cost;
  end if;

  insert into stock_batches(product_id, quantity, cost, expiry_date, note)
  values (p_product_id, p_quantity, p_cost, p_expiry_date, p_note);

  update products
  set stock = v_new_stock,
      cost  = round(v_new_cost::numeric, 2)
  where id = p_product_id;

  insert into stock_movements(product_id, type, quantity, reason)
  values (p_product_id, 'in', p_quantity,
          'Nhập hàng' ||
          case when p_expiry_date is not null then ' · HSD: ' || to_char(p_expiry_date, 'DD/MM/YYYY') else '' end ||
          case when p_note is not null and length(p_note) > 0 then ' · ' || p_note else '' end);
end;
$$ language plpgsql security definer;

-- 3) View báo cáo cận date: SP còn tồn + có lô sắp hết hạn trong 30 ngày
create or replace view expiring_products as
select
  p.id            as product_id,
  p.sku,
  p.name,
  p.stock         as current_stock,
  p.image_url,
  p.unit,
  c.name          as category_name,
  c.icon          as category_icon,
  sb.expiry_date,
  sb.quantity     as batch_quantity,
  (sb.expiry_date - current_date) as days_left
from stock_batches sb
join products p on p.id = sb.product_id
left join categories c on c.id = p.category_id
where sb.expiry_date is not null
  and sb.expiry_date >= current_date
  and sb.expiry_date <= (current_date + interval '30 days')
order by sb.expiry_date asc;

grant select on expiring_products to authenticated;
