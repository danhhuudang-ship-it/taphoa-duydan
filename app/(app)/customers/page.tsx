import Topbar from '@/components/Topbar';
import CustomersClient from './CustomersClient';

export default function CustomersPage() {
  return (
    <>
      <Topbar title="Khách hàng" />
      <div className="p-4 md:p-6"><CustomersClient /></div>
    </>
  );
}
