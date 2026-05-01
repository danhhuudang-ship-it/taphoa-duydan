import Topbar from '@/components/Topbar';
import SettingsClient from './SettingsClient';

export default function SettingsPage() {
  return (
    <>
      <Topbar title="Cài đặt" />
      <div className="p-4 md:p-6"><SettingsClient /></div>
    </>
  );
}
