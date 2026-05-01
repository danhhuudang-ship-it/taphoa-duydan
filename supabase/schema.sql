-- ====================================================================
-- POS APP — SUPABASE SCHEMA
-- Copy toàn bộ file này, dán vào: Supabase Dashboard → SQL Editor → Run
-- ====================================================================

-- 1) BẢNG ----------------------------------------------------------------

create table if not exists categories (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  icon        text,
  color       text default '#6366f1',
  created_at  timestamptz default now()
);

create table if not exists products (
  id          uuid primary key default gen_random_uuid(),
  sku         text unique not null,
  name        text not null,
  description text,
  category_id uuid references categories(id) on delete set null,
  price       numeric(12,2) not null default 0,
  cost        numeric(12,2) default 0,
  stock       int default 0,
  min_stock   int default 5,
  unit        text default 'cái',
  image_url   text,
  barcode     text,
  active      boolean default true,
  created_at  timestamptz default now()
);

create table if not exists customers (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  phone        text,
  email        text,
  address      text,
  birth_date   date,
  total_spent  numeric(14,2) default 0,
  points       int default 0,
  notes        text,
  created_at   timestamptz default now()
);

create table if not exists orders (
  id              uuid primary key default gen_random_uuid(),
  code            text unique not null,
  customer_id     uuid references customers(id) on delete set null,
  customer_name   text,
  subtotal        numeric(14,2) default 0,
  discount        numeric(14,2) default 0,
  tax             numeric(14,2) default 0,
  total           numeric(14,2) default 0,
  paid            numeric(14,2) default 0,
  payment_method  text default 'cash',
  status          text default 'completed',
  notes           text,
  created_at      timestamptz default now()
);

create table if not exists order_items (
  id           uuid primary key default gen_random_uuid(),
  order_id     uuid references orders(id) on delete cascade,
  product_id   uuid references products(id) on delete restrict,
  product_name text,
  product_sku  text,
  quantity     int not null,
  price        numeric(12,2) not null,
  discount     numeric(12,2) default 0,
  total        numeric(14,2) not null,
  created_at   timestamptz default now()
);

create table if not exists stock_movements (
  id          uuid primary key default gen_random_uuid(),
  product_id  uuid references products(id) on delete cascade,
  type        text not null check (type in ('in','out','adjust')),
  quantity    int not null,
  reason      text,
  created_at  timestamptz default now()
);

-- 2) INDEX ---------------------------------------------------------------
create index if not exists idx_products_category on products(category_id);
create index if not exists idx_products_active   on products(active);
create index if not exists idx_orders_created    on orders(created_at desc);
create index if not exists idx_order_items_order on order_items(order_id);
create index if not exists idx_stock_product     on stock_movements(product_id);

-- 3) RPC: ATOMIC CREATE ORDER -------------------------------------------
create or replace function create_order(
  p_code           text,
  p_customer_id    uuid,
  p_customer_name  text,
  p_items          jsonb,
  p_discount       numeric,
  p_tax            numeric,
  p_payment_method text,
  p_paid           numeric,
  p_notes          text
) returns uuid as $$
declare
  v_order_id  uuid;
  v_subtotal  numeric := 0;
  v_total     numeric := 0;
  v_item      jsonb;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_subtotal := v_subtotal + (v_item->>'quantity')::int * (v_item->>'price')::numeric;
  end loop;

  v_total := v_subtotal - coalesce(p_discount,0) + coalesce(p_tax,0);

  insert into orders(code, customer_id, customer_name, subtotal, discount, tax, total,
                     paid, payment_method, notes, status)
  values (p_code, p_customer_id, p_customer_name, v_subtotal, coalesce(p_discount,0),
          coalesce(p_tax,0), v_total, coalesce(p_paid,v_total), p_payment_method,
          p_notes, 'completed')
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    insert into order_items(order_id, product_id, product_name, product_sku, quantity, price, total)
    values (
      v_order_id,
      (v_item->>'product_id')::uuid,
      v_item->>'product_name',
      v_item->>'product_sku',
      (v_item->>'quantity')::int,
      (v_item->>'price')::numeric,
      (v_item->>'quantity')::int * (v_item->>'price')::numeric
    );

    update products set stock = stock - (v_item->>'quantity')::int
    where id = (v_item->>'product_id')::uuid;

    insert into stock_movements(product_id, type, quantity, reason)
    values ((v_item->>'product_id')::uuid, 'out',
            (v_item->>'quantity')::int, 'Bán: ' || p_code);
  end loop;

  if p_customer_id is not null then
    update customers
    set total_spent = total_spent + v_total,
        points      = points + floor(v_total/10000)::int
    where id = p_customer_id;
  end if;

  return v_order_id;
end;
$$ language plpgsql security definer;

-- 4) RLS — bật RLS với policy thoáng cho user đã đăng nhập --------------
alter table categories      enable row level security;
alter table products        enable row level security;
alter table customers       enable row level security;
alter table orders          enable row level security;
alter table order_items     enable row level security;
alter table stock_movements enable row level security;

do $$
declare
  tbl text;
begin
  foreach tbl in array array['categories','products','customers','orders','order_items','stock_movements'] loop
    execute format('drop policy if exists "auth_all_%1$s" on %1$I;', tbl);
    execute format('create policy "auth_all_%1$s" on %1$I for all to authenticated using (true) with check (true);', tbl);
  end loop;
end $$;

-- 5) SEED DATA ----------------------------------------------------------
insert into categories (name, icon, color) values
  ('Đồ uống',         '🥤', '#06b6d4'),
  ('Đồ ăn nhanh',     '🍔', '#f59e0b'),
  ('Bánh kẹo',        '🍪', '#ec4899'),
  ('Đồ gia dụng',     '🏠', '#8b5cf6'),
  ('Văn phòng phẩm',  '✏️', '#10b981')
on conflict do nothing;

insert into products (sku, name, price, cost, stock, unit, category_id)
select
  'SKU' || lpad(g::text, 4, '0'),
  case (g % 12)
    when 0 then 'Coca-Cola lon 330ml'
    when 1 then 'Pepsi lon 330ml'
    when 2 then 'Trà sữa trân châu'
    when 3 then 'Cà phê đen đá'
    when 4 then 'Mì gói Hảo Hảo'
    when 5 then 'Bánh mì pate'
    when 6 then 'Snack khoai tây'
    when 7 then 'Kẹo dẻo Haribo'
    when 8 then 'Sữa tươi Vinamilk'
    when 9 then 'Nước khoáng Lavie'
    when 10 then 'Bút bi Thiên Long'
    else 'Vở học sinh 200tr'
  end,
  ((g*1000) % 50000) + 8000,
  ((g*700) % 30000) + 5000,
  20 + (g*7) % 80,
  case (g % 4) when 0 then 'lon' when 1 then 'gói' when 2 then 'cái' else 'chai' end,
  (select id from categories order by random() limit 1)
from generate_series(1, 24) g
on conflict (sku) do nothing;

insert into customers (name, phone, email)
values
  ('Khách lẻ',          '',           ''),
  ('Nguyễn Văn An',     '0901234567', 'an.nv@example.com'),
  ('Trần Thị Bình',     '0912345678', 'binh.tt@example.com'),
  ('Lê Hoàng Cường',    '0987654321', 'cuong.lh@example.com')
on conflict do nothing;
