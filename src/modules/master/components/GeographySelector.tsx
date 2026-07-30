/**
 * GeographySelector Component
 * Reusable Mobile-First Cascading Geography Selector (State → District → Taluka → Village).
 */

import React, { useEffect } from 'react';
import { MapPin, Globe } from 'lucide-react';
import { useGeographyCascade } from '../hooks/useMasterData';

interface GeographySelectorProps {
  selectedStateId?: string;
  selectedDistrictId?: string;
  selectedTalukaId?: string;
  selectedVillageId?: string;
  onStateChange?: (stateId: string) => void;
  onDistrictChange?: (districtId: string) => void;
  onTalukaChange?: (talukaId: string) => void;
  onVillageChange?: (villageId: string) => void;
  showVillage?: boolean;
  disabled?: boolean;
  className?: string;
}

export const GeographySelector: React.FC<GeographySelectorProps> = ({
  selectedStateId = '',
  selectedDistrictId = '',
  selectedTalukaId = '',
  selectedVillageId = '',
  onStateChange,
  onDistrictChange,
  onTalukaChange,
  onVillageChange,
  showVillage = true,
  disabled = false,
  className = '',
}) => {
  const {
    states,
    districts,
    talukas,
    villages,
    loadingDistricts,
    loadingTalukas,
    loadingVillages,
    loadDistricts,
    loadTalukas,
    loadVillages,
  } = useGeographyCascade();

  useEffect(() => {
    if (selectedStateId) loadDistricts(selectedStateId);
  }, [selectedStateId, loadDistricts]);

  useEffect(() => {
    if (selectedDistrictId) loadTalukas(selectedDistrictId);
  }, [selectedDistrictId, loadTalukas]);

  useEffect(() => {
    if (selectedTalukaId && showVillage) loadVillages(selectedTalukaId);
  }, [selectedTalukaId, showVillage, loadVillages]);

  const selectClass =
    'w-full py-2.5 px-3 bg-primary-50/50 border border-primary-200 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 rounded-xl text-xs sm:text-sm text-primary-900 focus:outline-none transition-all disabled:opacity-50';

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 ${className}`}>
      {/* State */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-primary-700 uppercase tracking-wider">State</label>
        <div className="relative">
          <select
            value={selectedStateId}
            onChange={(e) => {
              onStateChange?.(e.target.value);
              onDistrictChange?.('');
              onTalukaChange?.('');
              onVillageChange?.('');
            }}
            disabled={disabled}
            className={selectClass}
          >
            <option value="">Select State</option>
            {states.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* District */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-primary-700 uppercase tracking-wider">District</label>
        <div className="relative">
          <select
            value={selectedDistrictId}
            onChange={(e) => {
              onDistrictChange?.(e.target.value);
              onTalukaChange?.('');
              onVillageChange?.('');
            }}
            disabled={disabled || !selectedStateId || loadingDistricts}
            className={selectClass}
          >
            <option value="">{loadingDistricts ? 'Loading...' : 'Select District'}</option>
            {districts.map((d) => (
              <option key={d.id} value={d.id}>
                {d.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Taluka */}
      <div className="space-y-1">
        <label className="block text-[11px] font-semibold text-primary-700 uppercase tracking-wider">Taluka</label>
        <div className="relative">
          <select
            value={selectedTalukaId}
            onChange={(e) => {
              onTalukaChange?.(e.target.value);
              onVillageChange?.('');
            }}
            disabled={disabled || !selectedDistrictId || loadingTalukas}
            className={selectClass}
          >
            <option value="">{loadingTalukas ? 'Loading...' : 'Select Taluka'}</option>
            {talukas.map((t) => (
              <option key={t.id} value={t.id}>
                {t.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Village */}
      {showVillage && (
        <div className="space-y-1">
          <label className="block text-[11px] font-semibold text-primary-700 uppercase tracking-wider">Village</label>
          <div className="relative">
            <select
              value={selectedVillageId}
              onChange={(e) => onVillageChange?.(e.target.value)}
              disabled={disabled || !selectedTalukaId || loadingVillages}
              className={selectClass}
            >
              <option value="">{loadingVillages ? 'Loading...' : 'Select Village'}</option>
              {villages.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.village_name} {v.pincode ? `(${v.pincode})` : ''}
                </option>
              ))}
            </select>
          </div>
        </div>
      )}
    </div>
  );
};
