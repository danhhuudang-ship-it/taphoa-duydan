-- ====================================================================
-- MIGRATION: Settings + Reset functions
-- Chạy file này trong Supabase SQL Editor (sau khi đã chạy schema.sql)
-- ====================================================================

-- 1) BẢNG SETTINGS (singleton — luôn có duy nhất 1 dòng id=1) --------
create table if not exists settings (
  id                 int primary key default 1,
  shop_name          text default 'Tạp Hoá Duy Đan',
  shop_address       text default '',
  shop_phone         text default '',
  telegram_bot_token text default '',
  telegram_chat_id   text default '',
  telegram_enabled   boolean default false,
  updated_at         timestamptz default now(),
  constraint settings_singleton check (id = 1)
);

insert into settings (id, shop_name) values (1, 'Tạp Hoá Duy Đan')
on conflict (id) do nothing;

-- RLS cho settings: chỉ user đăng nhập mới đọc/sửa
alter table settings enable row level security;
drop policy if exists "auth_all_settings" on settings;
create policy "auth_all_settings" on settings
  for all to authenticated using (true) with check (true);


-- 2) RESET ĐƠN HÀNG + DOANH THU (giữ SP & KH) -----------------------
create or replace function reset_orders() returns void as $$
begin
  delete from order_items;
  delete from orders;
  delete from stock_movements where reason like 'Bán:%';
  update customers set total_spent = 0, points = 0;
end;
$$ language plpgsql security definer;


-- 3) RESET TOÀN BỘ + NẠP LẠI DEMO ----------------------------------
create or replace function reset_all_and_seed() returns void as $$
begin
  -- Xoá dữ liệu (theo thứ tự khoá ngoại)
  delete from order_items;
  delete from orders;
  delete from stock_movements;
  delete from products;
  delete from categories;
  delete from customers;

  -- Seed danh mục
  insert into categories (name, icon, color) values
    ('Đồ uống',         '🥤', '#06b6d4'),
    ('Đồ ăn nhanh',     '🍔', '#f59e0b'),
    ('Bánh kẹo',        '🍪', '#ec4899'),
    ('Đồ gia dụng',     '🏠', '#8b5cf6'),
    ('Văn phòng phẩm',  '✏️', '#10b981');

  -- Seed sản phẩm
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
    ((g*700)  % 30000) + 5000,
    20 + (g*7) % 80,
    case (g % 4) when 0 then 'lon' when 1 then 'gói' when 2 then 'cái' else 'chai' end,
    (select id from categories order by random() limit 1)
  from generate_series(1, 24) g;

  -- Seed khách hàng
  insert into customers (name, phone, email) values
    ('Khách lẻ',       '',           ''),
    ('Nguyễn Văn An',  '0901234567', 'an.nv@example.com'),
    ('Trần Thị Bình',  '0912345678', 'binh.tt@example.com'),
    ('Lê Hoàng Cường', '0987654321', 'cuong.lh@example.com');
end;
$$ language plpgsql security definer;
