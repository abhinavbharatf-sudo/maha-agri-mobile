import React, { useState } from 'react';
import { Send, ShieldAlert, Activity, CheckCircle, RefreshCw, Zap, AlertTriangle } from 'lucide-react';
import { DroneUnit, FlightTelemetryPayload, processFlightTelemetry, checkAirspaceGeofence } from '../../drone/droneService';

export const DroneFleetWorkspace: React.FC = () => {
  const [drones] = useState<DroneUnit[]>([
    {
      drone_id: 'DRN_001',
      entrepreneur_id: 'EDP_101',
      uin_number: 'UIN-2026-DRN-0045',
      drone_model: 'Agri-Flyer 10L Hexacopter',
      payload_capacity_liters: 10.00,
      total_flight_hours: 34.50,
      status: 'AVAILABLE'
    },
    {
      drone_id: 'DRN_002',
      entrepreneur_id: 'EDP_102',
      uin_number: 'UIN-2026-DRN-0092',
      drone_model: 'Precision Spray Pro 15L',
      payload_capacity_liters: 15.00,
      total_flight_hours: 52.00,
      status: 'MAINTENANCE_DUE'
    }
  ]);

  const [telemetryResult, setTelemetryResult] = useState<string | null>(null);

  const handleSimulateFlight = (drone: DroneUnit, soc: number, isRedZone: boolean) => {
    const payload: FlightTelemetryPayload = {
      drone_id: drone.drone_id,
      pilot_rpl_number: 'RPL-2026-9901',
      latitude: isRedZone ? 21.0922 : 20.7453,
      longitude: isRedZone ? 79.0472 : 78.6022,
      altitude_meters: 3.2,
      speed_ms: 4.0,
      battery_soc_percent: soc,
      spray_rate_liters_acre: 2.5
    };

    const res = processFlightTelemetry(payload);
    setTelemetryResult(`[Status: ${res.status}] ${res.message}`);
  };

  return (
    <div className="space-y-4 bg-slate-50 p-4 rounded-2xl border border-slate-200">
      {/* Header */}
      <div className="bg-gradient-to-r from-teal-900 via-emerald-800 to-slate-900 text-white p-4 rounded-xl flex items-center justify-between shadow-md">
        <div>
          <div className="flex items-center space-x-2">
            <Send className="w-6 h-6 text-amber-400" />
            <h2 className="text-base font-black tracking-tight">EDP-AGRI Drone Fleet Operations (Chapter 12)</h2>
          </div>
          <p className="text-xs text-teal-100 mt-1 font-medium">
            DGCA Remote Pilot License (RPL), 1-Hz IoT Telemetry, Airspace Geofencing & 50h AMC Lock Engine
          </p>
        </div>
      </div>

      {telemetryResult && (
        <div className="p-3 bg-slate-900 text-amber-400 border border-amber-500/30 rounded-xl text-xs font-mono font-bold flex items-center justify-between shadow-sm">
          <span>⚡ {telemetryResult}</span>
          <button onClick={() => setTelemetryResult(null)} className="text-slate-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Fleet Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {drones.map(drone => (
          <div key={drone.drone_id} className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-xs text-emerald-800">{drone.uin_number}</span>
                <h4 className="font-bold text-sm text-slate-900">{drone.drone_model}</h4>
              </div>
              <span className={`px-2.5 py-0.5 rounded text-[10px] font-extrabold ${
                drone.status === 'AVAILABLE' ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
              }`}>
                {drone.status}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Payload Capacity</span>
                <span className="font-bold text-slate-800">{drone.payload_capacity_liters} Liters</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 font-bold uppercase block">Flight Hours Log</span>
                <span className="font-bold text-slate-800">{drone.total_flight_hours} hrs</span>
              </div>
            </div>

            {/* Test Simulation Controls */}
            <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-400 uppercase">Test Telemetry Simulator:</span>
              <div className="flex space-x-1.5">
                <button
                  onClick={() => handleSimulateFlight(drone, 90, false)}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xs"
                >
                  Green Zone Stream
                </button>
                <button
                  onClick={() => handleSimulateFlight(drone, 15, false)}
                  className="bg-amber-600 hover:bg-amber-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xs"
                >
                  Low Battery RTH
                </button>
                <button
                  onClick={() => handleSimulateFlight(drone, 80, true)}
                  className="bg-rose-600 hover:bg-rose-700 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xs"
                >
                  Red Zone Violate
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
