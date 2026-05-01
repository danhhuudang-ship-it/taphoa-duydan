# 🛒 Sapo POS — Phần mềm bán hàng (Next.js + Supabase)

App POS hoàn chỉnh phong cách KiotViet/Misa/Tendoo — Next.js 14 + Tailwind + Framer Motion + Supabase.

Tính năng:
- 🔐 Đăng nhập / đăng ký (Supabase Auth)
- 📊 Dashboard với biểu đồ doanh thu, top sản phẩm, cảnh báo tồn kho
- 🛍️ POS bán hàng — phím tắt **F2**, 3 phương thức thanh toán, in hóa đơn
- 📦 Quản lý sản phẩm + upload ảnh trực tiếp (Supabase Storage)
- 👥 Quản lý khách hàng, công nợ, tích điểm
- 🧾 Lịch sử đơn hàng + báo cáo 7/14/30 ngày
- ⚙️ Trang Cài đặt: tên shop, địa chỉ, SĐT, **Telegram bot** auto thông báo, **reset đơn / reset toàn bộ**
- 📱 **Mobile-first** — bottom nav, cart bottom sheet
- 🎨 Glassmorphism + hover-glow theo chuột

---

## 🚀 Quick start (5 phút)

### 1. Tạo Supabase project + chạy schema

a. Lên https://supabase.com/dashboard → **New project**
b. Vào **SQL Editor** → chạy lần lượt 3 file (mỗi file = 1 query mới):

| Lần | File | Mô tả |
|---|---|---|
| 1 | `supabase/schema.sql` | Tạo bảng + dữ liệu mẫu |
| 2 | `supabase/migration_settings.sql` | Bảng settings + reset functions |
| 3 | `supabase/migration_storage.sql` | Bucket lưu ảnh sản phẩm |

c. **Authentication → Sign In / Providers → Email** → tắt **Confirm email**

### 2. Lấy ENV
**Settings → API**:
- `Project URL` → `NEXT_PUBLIC_SUPABASE_URL`
- `anon public` key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### 3. Chạy local
```bash
cp .env.example .env.local       # rồi sửa 2 biến trong file
npm install
npm run dev
# → http://localhost:3000
```

---

## ☁️ Deploy lên Vercel

**Bước 1 — Tạo repo GitHub & push code**

Nếu **chưa có Git**, mở Terminal trong thư mục project:

```bash
git init
git add .
git commit -m "Initial commit"
```

Tạo repo trên GitHub:
1. Vào https://github.com/new
2. Đặt tên (vd: `sapo-pos`) → Create repository
3. Copy 2 lệnh GitHub gợi ý, paste vào Terminal:
```bash
git branch -M main
git remote add origin https://github.com/<username>/sapo-pos.git
git push -u origin main
```

> **Quan trọng:** file `.env.local` đã được liệt kê trong `.gitignore` → sẽ **không** bị push lên GitHub. ENV sẽ cấu hình riêng trên Vercel.

**Bước 2 — Import vào Vercel**

1. Vào https://vercel.com → đăng nhập bằng GitHub
2. Bấm **Add New → Project**
3. Chọn repo `sapo-pos` vừa tạo → **Import**
4. Phần **Environment Variables**, thêm 2 biến:

| Name | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL Supabase của bạn |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key Supabase |

5. Bấm **Deploy** → đợi ~2 phút.

**Bước 3 — Cấu hình Supabase chấp nhận domain Vercel**

Vercel sẽ cấp URL dạng `https://sapo-pos-xxx.vercel.app`. Cần báo Supabase rằng domain này được phép gọi API.

1. Supabase Dashboard → **Authentication → URL Configuration**
2. **Site URL**: thay bằng URL Vercel của bạn (vd: `https://sapo-pos.vercel.app`)
3. **Redirect URLs**: thêm `https://sapo-pos.vercel.app/**`
4. Save

> Lúc dev local thì để URL = `http://localhost:3000`. Lúc deploy đổi sang URL Vercel.

**Bước 4 — Update sau này**

Mỗi lần code thay đổi, chỉ cần:
```bash
git add .
git commit -m "Update something"
git push
```
Vercel sẽ **tự động build & deploy lại** trong 1-2 phút.

---

## 📷 Upload ảnh sản phẩm — hướng dẫn để ảnh đẹp & rõ

### Cách upload trong app

1. Vào **Sản phẩm & Kho** → bấm icon ✏️ trên 1 sản phẩm (hoặc **+ Thêm sản phẩm**)
2. Khu vực "Ảnh sản phẩm" có ô lớn → **click hoặc kéo thả ảnh** vào
3. Đợi vài giây → ảnh sẽ hiển thị preview → bấm **Lưu**

### Tips để ảnh đẹp (rất quan trọng!)

| Chỉ tiêu | Khuyến nghị | Lý do |
|---|---|---|
| **Kích thước** | 800×800px (hình vuông) | Giao diện POS hiển thị ô vuông |
| **Định dạng** | JPG hoặc WebP | Nhẹ, load nhanh |
| **Dung lượng** | 100KB – 500KB | App giới hạn tối đa 5MB. Càng nhẹ load càng nhanh trên mobile |
| **Background** | Trắng / mờ / xóa nền | Trông gọn gàng, đồng bộ |
| **Ánh sáng** | Sáng đều, không tối | Nhìn rõ chi tiết sản phẩm |
| **Crop** | Sản phẩm ở giữa, có khoảng trống xung quanh | Không bị viền cắt mất |

### Công cụ miễn phí để xử lý ảnh

| Công cụ | Dùng để | Link |
|---|---|---|
| **remove.bg** | Xóa nền tự động | https://www.remove.bg |
| **TinyPNG** | Nén ảnh giữ chất lượng | https://tinypng.com |
| **Canva** | Crop + thêm nền + watermark | https://www.canva.com |
| **Squoosh** (Google) | Convert sang WebP, nén tối ưu | https://squoosh.app |

**Workflow đề xuất:**
1. Chụp sản phẩm bằng điện thoại — đặt trên giấy trắng, ánh sáng tự nhiên
2. Vào https://www.remove.bg → xóa nền → tải về
3. Vào https://www.canva.com → tạo canvas 800×800 → đặt ảnh vào giữa → export JPG
4. Vào https://tinypng.com → nén lại
5. Upload vào app

Mất ~2 phút cho 1 ảnh, nhưng kết quả đẹp gấp nhiều lần ảnh chụp thô.

---

## 📱 Telegram Bot — auto thông báo đơn

1. Telegram → tìm **@BotFather** → `/newbot` → đặt tên → nhận **Bot Token**
2. Tìm bot vừa tạo → bấm **Start**
3. Mở: `https://api.telegram.org/bot<TOKEN>/getUpdates` → tìm `"chat":{"id":...}` → đó là **Chat ID**
4. Trong app → **Cài đặt** → dán Token + Chat ID → bật toggle → **Lưu** → **Gửi tin thử**

Sau đó mỗi đơn POS sẽ tự động báo về Telegram.

---

## 🗄️ Xem & quản lý database

Trong Supabase Dashboard, sidebar trái:
- **Table Editor** — sửa dữ liệu trực quan như Excel
- **SQL Editor** — chạy lệnh SQL bất kỳ
- **Database → Functions** — xem RPC: `create_order`, `reset_orders`, `reset_all_and_seed`
- **Storage → product-images** — xem/xoá ảnh đã upload
- **Authentication → Users** — quản lý tài khoản đăng nhập

---

## 🔄 Reset cuối tháng

Vào **Cài đặt → Vùng nguy hiểm**:
- **Reset đơn hàng** — xóa đơn + reset doanh thu, giữ SP/khách
- **Reset toàn bộ** — xóa tất cả + nạp lại 24 SP demo

Cả 2 đều có dialog xác nhận.

---

## ⌨️ Phím tắt

- **F2** — mở thanh toán nhanh trong POS
- **Esc** — đóng modal

---

## 📁 Cấu trúc project

```
.
├── app/
│   ├── (app)/
│   │   ├── dashboard/      # tổng quan
│   │   ├── pos/            # bán hàng (mobile drawer + desktop sidebar)
│   │   ├── products/       # CRUD + upload ảnh
│   │   ├── customers/
│   │   ├── orders/
│   │   ├── reports/
│   │   ├── settings/       # tên shop, telegram, reset
│   │   └── layout.tsx
│   ├── api/telegram/       # API gửi telegram bot
│   ├── login/
│   └── globals.css
├── components/
│   ├── Sidebar.tsx         # desktop sidebar
│   ├── BottomNav.tsx       # mobile bottom nav
│   ├── Topbar.tsx
│   ├── BackgroundFX.tsx
│   ├── ImageUploader.tsx   # upload Supabase Storage
│   └── ...
├── lib/
│   ├── supabase/
│   ├── types.ts
│   └── utils.ts
├── supabase/
│   ├── schema.sql                  # ⭐ chạy trước
│   ├── migration_settings.sql      # ⭐ chạy thứ 2
│   └── migration_storage.sql       # ⭐ chạy thứ 3
├── middleware.ts
└── package.json
```

Tổng ~50 files, ~3000 LOC.

---

Made with ❤️ — Next.js 14 · Tailwind · Framer Motion · Supabase · Recharts
