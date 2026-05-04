# 📦 Hướng dẫn tách dữ liệu POS khỏi app cầm đồ

Bạn có 2 app dùng chung 1 Supabase project, các bảng đang lộn xộn trong schema `public`.
Có **3 cách giải quyết** từ tốt nhất → đơn giản nhất:

---

## ✅ Cách 1 (KHUYÊN DÙNG): Tạo Supabase project MỚI riêng cho POS

**Ưu điểm:**
- Hoàn toàn tách biệt, không ảnh hưởng app cầm đồ
- Limits riêng (500MB DB miễn phí mỗi project)
- Backup/restore độc lập
- Dễ phân quyền nếu sau này thuê người khác quản lý

**Cách làm:**

1. Vào https://supabase.com/dashboard → bấm **New project**
2. Đặt tên: `pos-taphoa-duydan` → tạo
3. Đợi ~1 phút khởi tạo
4. Vào **SQL Editor**, chạy lần lượt **TẤT CẢ** các file migration trong thư mục `supabase/` của repo này (theo thứ tự):
   - `schema.sql`
   - `migration_settings.sql`
   - `migration_storage.sql`
   - `migration_item_discount.sql`
   - `migration_cleanup_categories.sql`
   - `migration_reset_v2.sql`
   - `migration_debt.sql`
   - `migration_customer_profits.sql`
5. Vào **Project Settings → API**, copy:
   - `Project URL` (mới)
   - `anon public key` (mới)
6. Trong Vercel Dashboard → project taphoa-duydan → **Settings → Environment Variables** → cập nhật:
   - `NEXT_PUBLIC_SUPABASE_URL` = URL mới
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY` = anon key mới
7. Trigger redeploy: **Deployments → bấm 3 chấm trên deployment mới nhất → Redeploy**
8. Vào **Authentication → URL Configuration** trong project mới, set Site URL = `https://taphoa-duydan.vercel.app`, Redirect URLs = `https://taphoa-duydan.vercel.app/**`
9. Vào **Authentication → Sign In / Providers → Email** → tắt Confirm email
10. Đăng ký lại tài khoản admin

> **Dữ liệu cũ:** Nếu muốn copy SP/khách hàng từ project cũ qua, dùng Table Editor → export CSV → import vào project mới.

---

## ⚙️ Cách 2: Đổi schema sang `pos.*` trong cùng project

Giữ 1 project nhưng tách các bảng POS sang schema riêng `pos`. Pawnshop tables vẫn ở `public`.

**Bước 1 — chạy SQL migration sau:**

```sql
-- Tạo schema pos
create schema if not exists pos;
grant usage on schema pos to authenticated;

-- Move các bảng POS sang schema pos
alter table public.categories       set schema pos;
alter table public.products         set schema pos;
alter table public.customers        set schema pos;
alter table public.orders           set schema pos;
alter table public.order_items      set schema pos;
alter table public.stock_movements  set schema pos;
alter table public.settings         set schema pos;

-- Hàm RPC cũng cần move
alter function public.create_order(text, uuid, text, jsonb, numeric, numeric, text, numeric, text)  set schema pos;
alter function public.reset_orders()                                                                  set schema pos;
alter function public.reset_all_and_seed()                                                            set schema pos;
alter function public.pay_debt(uuid, numeric)                                                         set schema pos;

-- Cấp quyền truy cập
grant select, insert, update, delete on all tables in schema pos to authenticated;
grant execute on all functions in schema pos to authenticated;
alter default privileges in schema pos
  grant select, insert, update, delete on tables to authenticated;
```

**Bước 2 — update Supabase JS client để dùng schema `pos`:**

Trong `lib/supabase/client.ts`:

```ts
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { db: { schema: 'pos' } }   // ← thêm dòng này
  );
}
```

Tương tự cho `lib/supabase/server.ts` và `middleware.ts`.

> Sau bước này, mọi `supabase.from('products')` sẽ tự trỏ tới `pos.products`.

**Lưu ý:** view `customer_profits` và bucket `product-images` (Storage) cũng phải cập nhật theo. Bucket Storage là độc lập với schema, không cần đổi.

---

## 🪶 Cách 3: Đổi tên bảng POS với prefix `pos_`

Đơn giản nhất nhưng cần update mọi query trong code.

```sql
alter table categories       rename to pos_categories;
alter table products         rename to pos_products;
alter table customers        rename to pos_customers;
alter table orders           rename to pos_orders;
alter table order_items      rename to pos_order_items;
alter table stock_movements  rename to pos_stock_movements;
alter table settings         rename to pos_settings;
```

→ Sau đó **find & replace** trong code: `from('products')` → `from('pos_products')`, etc.

---

## So sánh

| Tiêu chí | Cách 1 (project mới) | Cách 2 (schema) | Cách 3 (prefix) |
|---|---|---|---|
| Tách biệt | ⭐⭐⭐ Hoàn toàn | ⭐⭐ Trong cùng DB | ⭐ Cùng schema |
| Code cần sửa | 0 (chỉ ENV) | ~3 file lib/ | Mọi query |
| Backup riêng | ✅ Có | ❌ Chung | ❌ Chung |
| Free tier | 2 project x 500MB | 1 project x 500MB | 1 project x 500MB |
| Risk vỡ app cầm đồ | 0 | Thấp | Trung bình |

**Khuyên dùng Cách 1** trừ khi bạn muốn tiết kiệm số lượng project.
