import { Bell } from 'lucide-react';
export default function CandidateNotifications() {
  return (
    <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
      <Bell className="w-12 h-12 text-primary-200 mx-auto mb-3" />
      <p className="font-bold text-primary-600 text-lg mb-2">Notifications</p>
      <p className="text-primary-500 text-sm">All system notifications regarding your applications will appear here.</p>
    </div>
  );
}
