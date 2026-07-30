import { Settings } from 'lucide-react';
export default function CandidateSettings() {
  return (
    <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
      <Settings className="w-12 h-12 text-primary-200 mx-auto mb-3" />
      <p className="font-bold text-primary-600 text-lg mb-2">Settings</p>
      <p className="text-primary-500 text-sm">Notification preferences and account settings coming soon.</p>
    </div>
  );
}
