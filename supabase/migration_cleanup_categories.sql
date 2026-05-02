-- ====================================================================
-- CLEANUP: Xoá duplicate categories + thêm unique constraint
-- Chạy file này trong Supabase SQL Editor để dọn category trùng
-- ====================================================================

-- 1) Cập nhật mọi sản phẩm về category đầu tiên cùng tên
update products p
set category_id = (
  select min(c2.id) from categories c2
  where c2.name = (select c.name from categories c where c.id = p.category_id)
)
where p.category_id is not null;

-- 2) Xoá các bản ghi categories trùng (giữ lại bản có id nhỏ nhất theo name)
delete from categories c
using categories c2
where c.name = c2.name
  and c.id > c2.id;

-- 3) Thêm unique constraint cho name để không trùng nữa
alter table categories
  drop constraint if exists categories_name_key;
alter table categories
  add constraint categories_name_key unique (name);

-- Kiểm tra:
select id, name, icon, color from categories order by name;
