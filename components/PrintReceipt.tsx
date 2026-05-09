'use client';
import type { Order, OrderItem } from '@/lib/types';
import { formatCurrency, formatDate } from '@/lib/utils';

type Settings = {
  shop_name?: string | null;
  shop_address?: string | null;
  shop_phone?: string | null;
};

export default function PrintReceipt({
  order, items, settings,
}: {
  order: Order;
  items: OrderItem[];
  settings?: Settings | null;
}) {
  const change = Math.max(0, Number(order.paid || 0) - Number(order.total || 0));
  const pmLabel = order.payment_method === 'cash' ? 'Tiền mặt'
    : order.payment_method === 'card' ? 'Thẻ'
    : order.payment_method === 'qr' ? 'QR'
    : (order.payment_method || '—');

  return (
    <div id="print-receipt" className="print-only-area" aria-hidden="true">
      {/* Header */}
      <div className="recpt-title">{(settings?.shop_name || 'CỬA HÀNG').toUpperCase()}</div>
      <div className="recpt-sub">Bán hàng thông minh cùng Danh Hữu Đang</div>
      {settings?.shop_address && <div className="recpt-sub">{settings.shop_address}</div>}
      {settings?.shop_phone && <div className="recpt-sub">ĐT: {settings.shop_phone}</div>}

      <hr className="recpt-divider" />

      <div className="recpt-title" style={{ fontSize: '12pt' }}>HOÁ ĐƠN BÁN HÀNG</div>

      <div className="recpt-section recpt-info">
        <div>Số HĐ: <span style={{ fontWeight: 700 }}>{order.code}</span></div>
        <div>Ngày: {formatDate(order.created_at)}</div>
        <div>Khách: {order.customer_name || 'Khách lẻ'}</div>
        <div>Thanh toán: {pmLabel}</div>
      </div>

      <hr className="recpt-divider" />

      <div>
        {items.map((it, idx) => {
          const unit = Number(it.price) - (Number(it.discount) || 0);
          return (
            <div key={(it.id || '') + idx} style={{ marginBottom: '1.5mm' }}>
              <div className="recpt-item-name">{idx + 1}. {it.product_name}</div>
              <div className="recpt-item-line" style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>{it.quantity} × {formatCurrency(unit)}</span>
                <span style={{ fontWeight: 700 }}>{formatCurrency(it.total)}</span>
              </div>
              {Number(it.discount) > 0 && (
                <div className="recpt-item-line" style={{ fontStyle: 'italic', fontWeight: 400 }}>
                  (Giảm {formatCurrency(it.discount)}/sp)
                </div>
              )}
            </div>
          );
        })}
      </div>

      <hr className="recpt-divider" />

      <div className="recpt-section recpt-info">
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Tạm tính:</span><span>{formatCurrency(order.subtotal)}</span>
        </div>
        {Number(order.discount) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Giảm thêm:</span><span>-{formatCurrency(order.discount)}</span>
          </div>
        )}
        {Number(order.tax) > 0 && (
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <span>Thuế:</span><span>{formatCurrency(order.tax)}</span>
          </div>
        )}
      </div>

      <hr className="recpt-divider" />

      <div className="recpt-total" style={{ display: 'flex', justifyContent: 'space-between' }}>
        <span>TỔNG:</span><span>{formatCurrency(order.total)}</span>
      </div>

      <div className="recpt-section recpt-info" style={{ marginTop: '1.5mm' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Khách trả:</span><span>{formatCurrency(order.paid)}</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
          <span>Tiền thừa:</span><span>{formatCurrency(change)}</span>
        </div>
      </div>

      <hr className="recpt-divider" />

      <div className="recpt-footer">
        Cảm ơn quý khách!<br />Hẹn gặp lại
      </div>

      <div className="recpt-footer recpt-dev" style={{ marginTop: '4mm' }}>
        Web App được phát triển bởi<br />
        Danh Hữu Đang - 0886 699 776
      </div>
      <div style={{ height: '12mm' }} />
    </div>
  );
}
