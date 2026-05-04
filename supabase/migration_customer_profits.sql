-- ====================================================================
-- MIGRATION: Tính lãi từ mỗi khách hàng
-- profit = (giá bán - giảm) * SL - (giá vốn * SL)
-- Chạy trong Supabase SQL Editor
-- ====================================================================

create or replace view customer_profits as
select
  c.id,
  c.name,
  c.phone,
  c.email,
  c.address,
  c.total_spent,
  c.points,
  coalesce(c.debt, 0) as debt,
  c.notes,
  c.created_at,

  -- Số đơn đã mua
  count(distinct o.id) filter (where o.status in ('completed', 'debt')) as order_count,

  -- Tổng doanh thu thực tế từ khách (= sum of order totals)
  coalesce(sum(distinct o.total) filter (where o.status in ('completed', 'debt')), 0) as revenue,

  -- Tổng giá vốn của tất cả SP đã bán cho khách
  coalesce(sum(oi.quantity * coalesce(p.cost, 0)), 0) as total_cost,

  -- Lãi gộp = doanh thu - giá vốn (chưa trừ giảm giá đơn)
  coalesce(sum(oi.total), 0) - coalesce(sum(oi.quantity * coalesce(p.cost, 0)), 0) as profit
from customers c
left join orders o
  on o.customer_id = c.id
 and o.status in ('completed', 'debt')
left join order_items oi on oi.order_id = o.id
left join products p on p.id = oi.product_id
group by c.id;

-- Cấp quyền cho user đăng nhập đọc view này
grant select on customer_profits to authenticated;
