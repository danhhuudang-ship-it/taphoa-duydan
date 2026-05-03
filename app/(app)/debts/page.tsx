import Topbar from '@/components/Topbar';
import DebtsClient from './DebtsClient';

export default function DebtsPage() {
  return (
    <>
      <Topbar title="Công nợ" />
      <div className="p-4 md:p-6"><DebtsClient /></div>
    </>
  );
}
