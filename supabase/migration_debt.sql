-- ====================================================================
-- MIGRATION: Công nợ khách hàng (debt)
-- Chạy trong Supabase SQL Editor sau các migration trước
-- ====================================================================

-- 1) Thêm cột debt vào customers
alter table customers
  add column if not exists debt numeric(14,2) default 0;

-- 2) Cập nhật RPC create_order — tự cộng debt khi paid < total
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
  v_order_id    uuid;
  v_subtotal    numeric := 0;
  v_total       numeric := 0;
  v_paid        numeric;
  v_debt_added  numeric;
  v_item        jsonb;
  v_unit_price  numeric;
  v_unit_disc   numeric;
  v_qty         int;
  v_line_total  numeric;
begin
  for v_item in select * from jsonb_array_elements(p_items) loop
    v_unit_price := (v_item->>'price')::numeric;
    v_unit_disc  := coalesce((v_item->>'discount')::numeric, 0);
    v_qty        := (v_item->>'quantity')::int;
    v_subtotal   := v_subtotal + v_qty * (v_unit_price - v_unit_disc);
  end loop;

  v_total := v_subtotal - coalesce(p_discount, 0) + coalesce(p_tax, 0);
  v_paid  := coalesce(p_paid, v_total);
  v_debt_added := greatest(v_total - v_paid, 0);

  insert into orders(code, customer_id, customer_name, subtotal, discount, tax, total,
                     paid, payment_method, notes, status)
  values (p_code, p_customer_id, p_customer_name, v_subtotal, coalesce(p_discount,0),
          coalesce(p_tax,0), v_total, v_paid, p_payment_method, p_notes,
          case when v_debt_added > 0 then 'debt' else 'completed' end)
  returning id into v_order_id;

  for v_item in select * from jsonb_array_elements(p_items) loop
    v_unit_price := (v_item->>'price')::numeric;
    v_unit_disc  := coalesce((v_item->>'discount')::numeric, 0);
    v_qty        := (v_item->>'quantity')::int;
    v_line_total := v_qty * (v_unit_price - v_unit_disc);

    insert into order_items(order_id, product_id, product_name, product_sku,
                            quantity, price, discount, total)
    values (v_order_id, (v_item->>'product_id')::uuid,
            v_item->>'product_name', v_item->>'product_sku',
            v_qty, v_unit_price, v_unit_disc, v_line_total);

    update products set stock = stock - v_qty
    where id = (v_item->>'product_id')::uuid;

    insert into stock_movements(product_id, type, quantity, reason)
    values ((v_item->>'product_id')::uuid, 'out', v_qty, 'Bán: ' || p_code);
  end loop;

  if p_customer_id is not null then
    update customers
    set total_spent = total_spent + v_total,
        points      = points + floor(v_total/10000)::int,
        debt        = debt + v_debt_added
    where id = p_customer_id;
  end if;

  return v_order_id;
end;
$$ language plpgsql security definer;

-- 3) RPC trả nợ
create or replace function pay_debt(
  p_customer_id uuid,
  p_amount numeric
) returns void as $$
begin
  update customers
  set debt = greatest(debt - coalesce(p_amount, 0), 0)
  where id = p_customer_id;
end;
$$ language plpgsql security definer;
