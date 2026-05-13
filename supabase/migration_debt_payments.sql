-- ====================================================================
-- MIGRATION: Lịch sử trả nợ — không xoá khách khi trả hết, lưu để xem
-- Chạy trong Supabase SQL Editor
-- ====================================================================

-- 1) Bảng lịch sử trả nợ
create table if not exists debt_payments (
  id          uuid primary key default gen_random_uuid(),
  customer_id uuid references customers(id) on delete cascade,
  amount      numeric(14,2) not null,
  note        text,
  created_at  timestamptz default now()
);

create index if not exists idx_debt_payments_customer on debt_payments(customer_id);
create index if not exists idx_debt_payments_created  on debt_payments(created_at desc);

alter table debt_payments enable row level security;
drop policy if exists "auth_all_debt_payments" on debt_payments;
create policy "auth_all_debt_payments" on debt_payments
  for all to authenticated using (true) with check (true);

-- 2) Update pay_debt: insert log + giảm debt
create or replace function pay_debt(
  p_customer_id uuid,
  p_amount      numeric,
  p_note        text default null
) returns void as $$
begin
  if p_amount is null or p_amount <= 0 then
    raise exception 'Số tiền phải > 0';
  end if;

  -- Insert payment log
  insert into debt_payments(customer_id, amount, note)
  values (p_customer_id, p_amount, p_note);

  -- Giảm debt (không xuống dưới 0)
  update customers
  set debt = greatest(coalesce(debt, 0) - p_amount, 0)
  where id = p_customer_id;
end;
$$ language plpgsql security definer;

-- 3) View: khách hiện đang nợ HOẶC có thanh toán gần đây 60 ngày
--    Dùng để hiển thị trong trang Công nợ (kể cả khi đã trả hết)
create or replace view debts_overview as
select
  c.id,
  c.name,
  c.phone,
  c.email,
  coalesce(c.debt, 0) as debt,
  c.total_spent,
  c.points,
  c.created_at,
  -- Lần trả gần nhất
  (
    select amount from debt_payments dp
    where dp.customer_id = c.id
    order by dp.created_at desc limit 1
  ) as last_payment_amount,
  (
    select created_at from debt_payments dp
    where dp.customer_id = c.id
    order by dp.created_at desc limit 1
  ) as last_payment_at,
  -- Tổng đã trả
  (
    select coalesce(sum(amount), 0) from debt_payments dp
    where dp.customer_id = c.id
  ) as total_paid
from customers c
where coalesce(c.debt, 0) > 0
   or exists (
     select 1 from debt_payments dp
     where dp.customer_id = c.id
       and dp.created_at >= now() - interval '60 days'
   );

grant select on debts_overview to authenticated;
