-- ====================================================================
-- CLEANUP: Xoá duplicate categories + thêm unique constraint
-- An toàn cho cả project mới (không có dup) lẫn project cũ
-- ====================================================================

-- 1) Cập nhật mọi sản phẩm về category đầu tiên cùng tên
--    Dùng ORDER BY ... LIMIT 1 thay vì min() vì PG không có min(uuid)
update products p
set category_id = (
  select c2.id
  from categories c2
  where c2.name = (select c.name from categories c where c.id = p.category_id)
  order by c2.id
  limit 1
)
where p.category_id is not null;

-- 2) Xoá các bản ghi categories trùng (giữ lại bản có ctid nhỏ nhất theo name)
--    ctid là physical row id, luôn so sánh được
delete from categories c
using categories c2
where c.name = c2.name
  and c.ctid > c2.ctid;

-- 3) Thêm unique constraint cho name để không trùng nữa
alter table categories
  drop constraint if exists categories_name_key;
alter table categories
  add constraint categories_name_key unique (name);

-- Kiểm tra:
select id, name, icon, color from categories order by name;
