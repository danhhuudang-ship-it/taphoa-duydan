-- ====================================================================
-- Update reset_all_and_seed để không tạo duplicate khi chạy lại
-- ====================================================================

create or replace function reset_all_and_seed() returns void as $$
begin
  delete from order_items;
  delete from orders;
  delete from stock_movements;
  delete from products;
  delete from customers;
  delete from categories;

  insert into categories (name, icon, color) values
    ('Đồ uống',         '🥤', '#06b6d4'),
    ('Đồ ăn nhanh',     '🍔', '#f59e0b'),
    ('Bánh kẹo',        '🍪', '#ec4899'),
    ('Đồ gia dụng',     '🏠', '#8b5cf6'),
    ('Văn phòng phẩm',  '✏️', '#10b981')
  on conflict (name) do nothing;

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
  from generate_series(1, 24) g
  on conflict (sku) do nothing;

  insert into customers (name, phone, email) values
    ('Khách lẻ',       '',           ''),
    ('Nguyễn Văn An',  '0901234567', 'an.nv@example.com'),
    ('Trần Thị Bình',  '0912345678', 'binh.tt@example.com'),
    ('Lê Hoàng Cường', '0987654321', 'cuong.lh@example.com');
end;
$$ language plpgsql security definer;
