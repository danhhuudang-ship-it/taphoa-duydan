import Topbar from '@/components/Topbar';
import ProductsClient from './ProductsClient';

export default function ProductsPage() {
  return (
    <>
      <Topbar title="Sản phẩm & Kho" />
      <div className="p-4 md:p-6"><ProductsClient /></div>
    </>
  );
}
