-- ====================================================================
-- MIGRATION: Storage bucket cho ảnh sản phẩm
-- Chạy file này trong Supabase SQL Editor (sau migration_settings.sql)
-- ====================================================================

-- 1) Tạo bucket public 'product-images' --------------------------------
insert into storage.buckets (id, name, public)
values ('product-images', 'product-images', true)
on conflict (id) do nothing;

-- 2) RLS policies cho storage.objects ---------------------------------

-- Cho phép USER ĐĂNG NHẬP upload ảnh vào bucket
drop policy if exists "auth_upload_product_images" on storage.objects;
create policy "auth_upload_product_images" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'product-images');

-- Cho phép USER ĐĂNG NHẬP cập nhật/xóa ảnh
drop policy if exists "auth_update_product_images" on storage.objects;
create policy "auth_update_product_images" on storage.objects
  for update to authenticated
  using (bucket_id = 'product-images');

drop policy if exists "auth_delete_product_images" on storage.objects;
create policy "auth_delete_product_images" on storage.objects
  for delete to authenticated
  using (bucket_id = 'product-images');

-- AI cũng đọc được (vì bucket là public)
drop policy if exists "public_read_product_images" on storage.objects;
create policy "public_read_product_images" on storage.objects
  for select to public
  using (bucket_id = 'product-images');
