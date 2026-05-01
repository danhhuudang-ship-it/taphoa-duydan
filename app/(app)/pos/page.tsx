import Topbar from '@/components/Topbar';
import POSClient from './POSClient';

export default function POSPage() {
  return (
    <>
      <Topbar title="Bán hàng" />
      <POSClient />
    </>
  );
}
