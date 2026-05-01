import Topbar from '@/components/Topbar';
import ReportsClient from './ReportsClient';

export default function ReportsPage() {
  return (
    <>
      <Topbar title="Báo cáo" />
      <div className="p-4 md:p-6"><ReportsClient /></div>
    </>
  );
}
