import { AlertCircle } from 'lucide-react';
export default function HRVacancyManager() {
  return (
    <div className="bg-white rounded-2xl border border-primary-100 p-12 text-center">
      <AlertCircle className="w-12 h-12 text-primary-200 mx-auto mb-3" />
      <p className="font-bold text-primary-600 text-lg mb-2">Vacancy Manager</p>
      <p className="text-primary-500 text-sm">Coming soon — district-wise vacancy grid, seat allocation, fill-rate tracking.</p>
    </div>
  );
}
