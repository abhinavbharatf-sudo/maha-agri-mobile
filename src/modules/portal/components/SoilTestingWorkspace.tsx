import React, { useState } from 'react';
import { FlaskConical, MapPin, FileCheck, CheckCircle2, AlertCircle } from 'lucide-react';
import { SoilSample, SoilHealthCard, collectSoilSample, generateSoilHealthCard } from '../../soil/soilTestingService';

export const SoilTestingWorkspace: React.FC = () => {
  const [samples] = useState<SoilSample[]>([
    {
      sample_id: 'SMP_01',
      sample_code: 'SOIL-2026-8841',
      farmer_id: 'FMR_101',
      parcel_id: 'PRC_01',
      collector_officer_id: 'OFF_001',
      collection_latitude: 20.7453,
      collection_longitude: 78.6022,
      collection_date: '2026-07-28',
      status: 'COLLECTED'
    }
  ]);

  const [generatedShc, setGeneratedShc] = useState<SoilHealthCard | null>(null);

  const handleGenerateShc = (sample: SoilSample) => {
    const card = generateSoilHealthCard(sample.sample_id, 6.8, 210, 18, 280, 0.45);
    setGeneratedShc(card);
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      <div className="bg-gradient-to-r from-emerald-900 via-teal-800 to-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <FlaskConical className="w-6 h-6 text-amber-400" />
            <h2 className="text-base font-black tracking-tight">Soil Testing & Health Card System (Chapter 16)</h2>
          </div>
          <p className="text-xs text-teal-100 mt-1 font-medium">
            Geotagged Soil Sample Collection (within 15m), Laboratory NPK Diagnostics & Soil Health Cards (SHC)
          </p>
        </div>
      </div>

      {generatedShc && (
        <div className="p-4 bg-white border border-emerald-300 rounded-xl space-y-2 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="font-mono font-black text-xs text-emerald-800">SOIL HEALTH CARD #{generatedShc.shc_id}</span>
            <span className="bg-emerald-100 text-emerald-800 text-[10px] font-bold px-2 py-0.5 rounded">ISSUED ON {new Date(generatedShc.issued_at).toLocaleDateString()}</span>
          </div>

          <div className="grid grid-cols-4 gap-2 text-center text-xs bg-emerald-50 p-2.5 rounded-lg border border-emerald-100">
            <div><span className="text-[10px] text-slate-500 block">pH Level</span><span className="font-black text-emerald-900">{generatedShc.ph_level}</span></div>
            <div><span className="text-[10px] text-slate-500 block">Nitrogen (N)</span><span className="font-black text-emerald-900">{generatedShc.nitrogen_kg_ha} kg/ha</span></div>
            <div><span className="text-[10px] text-slate-500 block">Phosphorus (P)</span><span className="font-black text-emerald-900">{generatedShc.phosphorus_kg_ha} kg/ha</span></div>
            <div><span className="text-[10px] text-slate-500 block">Potassium (K)</span><span className="font-black text-emerald-900">{generatedShc.potassium_kg_ha} kg/ha</span></div>
          </div>

          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs font-bold text-amber-900 flex items-center space-x-2">
            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
            <span>Dosage Recommendation: {generatedShc.recommendation_text}</span>
          </div>
        </div>
      )}

      {/* Samples Table */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
        <h3 className="font-extrabold text-sm text-slate-900">Geotagged Soil Samples Roster</h3>
        <div className="space-y-2">
          {samples.map(s => (
            <div key={s.sample_id} className="p-3 border border-slate-200 rounded-xl bg-slate-50 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-slate-900">{s.sample_code}</span>
                <p className="text-xs text-slate-500 mt-0.5">Sampled on: {s.collection_date} | Collector: {s.collector_officer_id}</p>
              </div>

              <button
                onClick={() => handleGenerateShc(s)}
                className="bg-emerald-700 hover:bg-emerald-800 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-xs transition-all"
              >
                Generate Soil Health Card
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
