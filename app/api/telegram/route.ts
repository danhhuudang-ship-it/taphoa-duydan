import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';

export const runtime = 'nodejs';

type ItemPayload = { name: string; qty: number; price: number; total: number };

function formatVND(n: number) {
  return new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(n);
}

function buildMessage(opts: {
  shopName?: string;
  shopAddress?: string;
  shopPhone?: string;
  code?: string;
  customer?: string;
  items?: ItemPayload[];
  subtotal?: number;
  discount?: number;
  total?: number;
  paid?: number;
  paymentMethod?: string;
}) {
  const lines: string[] = [];
  lines.push(`🔔 *${opts.shopName || 'Cửa hàng'}* — Đơn mới`);
  if (opts.code) lines.push(`📄 Mã: \`${opts.code}\``);
  if (opts.customer) lines.push(`👤 Khách: ${opts.customer}`);
  if (opts.items?.length) {
    lines.push(`\n🛒 Chi tiết:`);
    for (const it of opts.items) {
      lines.push(`• ${it.name} × ${it.qty} = ${formatVND(it.total)}`);
    }
  }
  if (opts.subtotal != null) lines.push(`\n💰 Tạm tính: ${formatVND(opts.subtotal)}`);
  if (opts.discount) lines.push(`🏷 Giảm: -${formatVND(opts.discount)}`);
  if (opts.total != null) lines.push(`*Tổng: ${formatVND(opts.total)}*`);
  if (opts.paymentMethod) {
    const pm = opts.paymentMethod === 'cash' ? '💵 Tiền mặt' : opts.paymentMethod === 'card' ? '💳 Thẻ' : '📱 QR';
    lines.push(`Phương thức: ${pm}`);
  }
  if (opts.shopPhone || opts.shopAddress) {
    lines.push('');
    if (opts.shopAddress) lines.push(`📍 ${opts.shopAddress}`);
    if (opts.shopPhone)   lines.push(`☎️ ${opts.shopPhone}`);
  }
  return lines.join('\n');
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const supabase = createClient();

    // Yêu cầu đăng nhập
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 });

    const { data: settings, error } = await supabase
      .from('settings').select('*').eq('id', 1).maybeSingle();
    if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
    if (!settings?.telegram_bot_token || !settings?.telegram_chat_id) {
      return NextResponse.json({ ok: false, error: 'Chưa cấu hình Bot Token / Chat ID' }, { status: 400 });
    }

    // Build message
    const text = body.test
      ? `🟢 *${settings.shop_name || 'Cửa hàng'}* đã kết nối Telegram thành công!\nĐây là tin nhắn thử.`
      : buildMessage({
          shopName:    settings.shop_name,
          shopAddress: settings.shop_address,
          shopPhone:   settings.shop_phone,
          code:        body.code,
          customer:    body.customer,
          items:       body.items,
          subtotal:    body.subtotal,
          discount:    body.discount,
          total:       body.total,
          paid:        body.paid,
          paymentMethod: body.paymentMethod,
        });

    // Gọi Telegram Bot API
    const tgUrl = `https://api.telegram.org/bot${settings.telegram_bot_token}/sendMessage`;
    const tgRes = await fetch(tgUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: settings.telegram_chat_id,
        text,
        parse_mode: 'Markdown',
      }),
    });
    const tgJson = await tgRes.json();
    if (!tgJson.ok) {
      return NextResponse.json({ ok: false, error: tgJson.description || 'telegram error' }, { status: 502 });
    }
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    return NextResponse.json({ ok: false, error: e.message || 'server error' }, { status: 500 });
  }
}
