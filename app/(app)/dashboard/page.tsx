import Topbar from '@/components/Topbar';
import DashboardClient from './DashboardClient';

export default function DashboardPage() {
  return (
    <>
      <Topbar title="Tổng quan" />
      <div className="p-4 md:p-8">
        <DashboardClient />
      </div>
    </>
  );
}
