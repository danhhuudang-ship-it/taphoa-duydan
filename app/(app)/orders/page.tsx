import Topbar from '@/components/Topbar';
import OrdersClient from './OrdersClient';

export default function OrdersPage() {
  return (
    <>
      <Topbar title="Đơn hàng" />
      <div className="p-4 md:p-6"><OrdersClient /></div>
    </>
  );
}
