import React, { useState, useMemo } from 'react';
import {
  MapPin, Building2, Globe, Compass, Layers, Calculator,
  Sliders, ChevronDown, ChevronRight, CheckSquare, Square,
  CheckCircle2, AlertCircle, Eye, EyeOff, Search, Lock,
  RefreshCw, Check, Sparkles, Filter, Users, X, MinusCircle,
  HelpCircle, ChevronUp, AlertTriangle,
} from 'lucide-react';
import type {
  RmsJobPosting, JobLocationType, VacancyAllocationsConfig,
} from '../../lib/types';
import {
  JOB_LOCATION_TYPES, MAHARASHTRA_REGIONS, MAHARASHTRA_DISTRICTS,
} from '../../lib/constants';
import {
  calculateVacancies, generatePublicLocationString,
} from '../../lib/vacancyCalculator';
import { getTalukasForDistrict } from '../../../data/maharashtraGeography';

interface HRLocationAndVacancyManagerProps {
  formData: Partial<RmsJobPosting>;
  set: (key: keyof RmsJobPosting, v: unknown) => void;
  setFormData: React.Dispatch<React.SetStateAction<Partial<RmsJobPosting>>>;
}

export default function HRLocationAndVacancyManager({
  formData,
  set,
  setFormData,
}: HRLocationAndVacancyManagerProps) {
  const [districtSearch, setDistrictSearch] = useState('');
  const [expandedDistricts, setExpandedDistricts] = useState<Record<string, boolean>>({});
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Simple Mode: Quick Taluka Exclusion state
  const [exclusionDistrict, setExclusionDistrict] = useState<string>('');
  const [exclusionTaluka, setExclusionTaluka] = useState<string>('');

  const locationType: JobLocationType = formData.location_type ?? 'Multiple Locations';
  const selectedDistricts: string[] = useMemo(() => {
    return Array.isArray(formData.location_districts) ? formData.location_districts : [];
  }, [formData.location_districts]);

  const selectedRegions: string[] = useMemo(() => {
    return Array.isArray(formData.location_regions) ? formData.location_regions : [];
  }, [formData.location_regions]);

  const defaultPerTaluka = Math.max(1, formData.vacancies_per_taluka ?? 1);

  // Compute live vacancy allocations
  const vacancyCalc = useMemo(() => {
    return calculateVacancies(
      selectedDistricts,
      formData.vacancy_allocations,
      defaultPerTaluka
    );
  }, [selectedDistricts, formData.vacancy_allocations, defaultPerTaluka]);

  // Filtered districts list for the search box
  const filteredDistricts = useMemo(() => {
    if (!districtSearch.trim()) return MAHARASHTRA_DISTRICTS;
    const q = districtSearch.toLowerCase();
    return MAHARASHTRA_DISTRICTS.filter(d => d.toLowerCase().includes(q));
  }, [districtSearch]);

  // Extract list of currently excluded talukas for Simple Mode chips
  const excludedTalukasList = useMemo(() => {
    const list: { district: string; taluka: string }[] = [];
    const distAlloc = formData.vacancy_allocations?.district_allocations ?? {};
    Object.entries(distAlloc).forEach(([dist, da]) => {
      if (selectedDistricts.includes(dist) && da?.taluka_allocations) {
        Object.entries(da.taluka_allocations).forEach(([taluka, ta]) => {
          if (ta?.included === false) {
            list.push({ district: dist, taluka });
          }
        });
      }
    });
    return list;
  }, [formData.vacancy_allocations, selectedDistricts]);

  // Count active custom overrides for the Advanced Settings badge
  const activeOverridesCount = useMemo(() => {
    let count = 0;
    const distAlloc = formData.vacancy_allocations?.district_allocations ?? {};
    selectedDistricts.forEach(dist => {
      const da = distAlloc[dist];
      if (!da) return;
      if (da.override_total != null) count++;
      if (da.per_taluka != null && da.per_taluka !== defaultPerTaluka) count++;
      if (da.taluka_allocations) {
        Object.values(da.taluka_allocations).forEach(ta => {
          if (ta?.override_vacancies != null) count++;
        });
      }
    });
    return count;
  }, [formData.vacancy_allocations, selectedDistricts, defaultPerTaluka]);

  // Available talukas for the selected exclusion district
  const talukasForExclusion = useMemo(() => {
    if (!exclusionDistrict) return [];
    return getTalukasForDistrict(exclusionDistrict);
  }, [exclusionDistrict]);

  // ── Handler: Location Type Switch ──────────────────────────────────────────
  const handleLocationTypeChange = (newType: JobLocationType) => {
    let newDistricts = [...selectedDistricts];
    let newRegions = [...selectedRegions];

    if (newType === 'State-wide') {
      newDistricts = [...MAHARASHTRA_DISTRICTS];
      newRegions = MAHARASHTRA_REGIONS.map(r => r.name);
    } else if (newType === 'Remote') {
      newDistricts = [];
      newRegions = [];
    }

    const newPublicLoc = generatePublicLocationString({
      locationType: newType,
      cityName: formData.city_name,
      showCityPublicly: formData.show_city_publicly ?? true,
      selectedDistricts: newDistricts,
      selectedRegions: newRegions,
      currentLocation: formData.location,
    });

    const calcResult = calculateVacancies(newDistricts, formData.vacancy_allocations, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      location_type: newType,
      location_districts: newDistricts,
      location_regions: newRegions,
      location: newPublicLoc,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: Regional Division Toggle ──────────────────────────────────────
  const handleToggleRegion = (regName: string) => {
    const isSelected = selectedRegions.includes(regName);
    const updatedRegions = isSelected
      ? selectedRegions.filter(r => r !== regName)
      : [...selectedRegions, regName];

    // Compute union of districts for all selected regions
    const activeRegionDistricts = new Set<string>();
    MAHARASHTRA_REGIONS.forEach(reg => {
      if (updatedRegions.includes(reg.name)) {
        reg.districts.forEach(d => activeRegionDistricts.add(d));
      }
    });

    const updatedDistricts = Array.from(activeRegionDistricts);
    const newPublicLoc = generatePublicLocationString({
      locationType: locationType,
      cityName: formData.city_name,
      showCityPublicly: formData.show_city_publicly ?? true,
      selectedDistricts: updatedDistricts,
      selectedRegions: updatedRegions,
      currentLocation: formData.location,
    });

    const calcResult = calculateVacancies(updatedDistricts, formData.vacancy_allocations, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      location_regions: updatedRegions,
      location_districts: updatedDistricts,
      location: newPublicLoc,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: District Toggle ───────────────────────────────────────────────
  const handleToggleDistrict = (dist: string) => {
    const isSelected = selectedDistricts.includes(dist);
    const updated = isSelected
      ? selectedDistricts.filter(d => d !== dist)
      : [...selectedDistricts, dist];

    const newPublicLoc = generatePublicLocationString({
      locationType: locationType,
      cityName: formData.city_name,
      showCityPublicly: formData.show_city_publicly ?? true,
      selectedDistricts: updated,
      selectedRegions: selectedRegions,
      currentLocation: formData.location,
    });

    const calcResult = calculateVacancies(updated, formData.vacancy_allocations, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      location_districts: updated,
      location: newPublicLoc,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  const handleSelectAllDistricts = () => {
    const allDistricts = [...MAHARASHTRA_DISTRICTS];
    const newPublicLoc = generatePublicLocationString({
      locationType: locationType,
      cityName: formData.city_name,
      showCityPublicly: formData.show_city_publicly ?? true,
      selectedDistricts: allDistricts,
      selectedRegions: selectedRegions,
      currentLocation: formData.location,
    });
    const calcResult = calculateVacancies(allDistricts, formData.vacancy_allocations, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      location_districts: allDistricts,
      location: newPublicLoc,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  const handleClearAllDistricts = () => {
    const newPublicLoc = generatePublicLocationString({
      locationType: locationType,
      cityName: formData.city_name,
      showCityPublicly: formData.show_city_publicly ?? true,
      selectedDistricts: [],
      selectedRegions: [],
      currentLocation: formData.location,
    });
    const calcResult = calculateVacancies([], formData.vacancy_allocations, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      location_districts: [],
      location_regions: [],
      location: newPublicLoc,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? 0 : prev.total_vacancies,
    }));
  };

  // ── Handler: City Specific Fields ──────────────────────────────────────────
  const handleCityDetailsUpdate = (cityName: string, showPublicly: boolean, district?: string) => {
    const targetDistrict = district || selectedDistricts[0] || 'Pune';
    const updatedDistricts = [targetDistrict];
    const newPublicLoc = generatePublicLocationString({
      locationType: 'City-specific',
      cityName,
      showCityPublicly: showPublicly,
      selectedDistricts: updatedDistricts,
      selectedRegions: [],
      currentLocation: formData.location,
    });

    const calcResult = calculateVacancies(updatedDistricts, formData.vacancy_allocations, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      city_name: cityName,
      show_city_publicly: showPublicly,
      location_districts: updatedDistricts,
      location: newPublicLoc,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: Vacancy Per-Taluka Default Change ─────────────────────────────
  const handleDefaultPerTalukaChange = (val: number) => {
    const perTaluka = Math.max(1, val);
    set('vacancies_per_taluka', perTaluka);
    const updatedConfig: VacancyAllocationsConfig = {
      ...(formData.vacancy_allocations ?? {}),
      default_per_taluka: perTaluka,
    };
    const calcResult = calculateVacancies(selectedDistricts, updatedConfig, perTaluka);
    setFormData(prev => ({
      ...prev,
      vacancies_per_taluka: perTaluka,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: District Override Total ───────────────────────────────────────
  const handleDistrictOverrideTotal = (dist: string, val: number | null) => {
    const currentAlloc = formData.vacancy_allocations ?? {};
    const distAlloc = currentAlloc.district_allocations ?? {};
    const targetDist = distAlloc[dist] ?? { included: true };

    const updatedDistAlloc = {
      ...distAlloc,
      [dist]: {
        ...targetDist,
        override_total: val,
      },
    };

    const newConfig: VacancyAllocationsConfig = {
      ...currentAlloc,
      district_allocations: updatedDistAlloc,
    };

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: District Per-Taluka Rate ──────────────────────────────────────
  const handleDistrictPerTalukaRate = (dist: string, val: number | null) => {
    const currentAlloc = formData.vacancy_allocations ?? {};
    const distAlloc = currentAlloc.district_allocations ?? {};
    const targetDist = distAlloc[dist] ?? { included: true };

    const updatedDistAlloc = {
      ...distAlloc,
      [dist]: {
        ...targetDist,
        per_taluka: val,
      },
    };

    const newConfig: VacancyAllocationsConfig = {
      ...currentAlloc,
      district_allocations: updatedDistAlloc,
    };

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: Taluka Toggle (Include / Exclude) ──────────────────────────────
  const handleTalukaToggle = (dist: string, taluka: string, included: boolean) => {
    const currentAlloc = formData.vacancy_allocations ?? {};
    const distAlloc = currentAlloc.district_allocations ?? {};
    const targetDist = distAlloc[dist] ?? { included: true };
    const talukaAlloc = targetDist.taluka_allocations ?? {};
    const currentTaluka = talukaAlloc[taluka];

    const updatedTalukaAlloc = {
      ...talukaAlloc,
      [taluka]: {
        ...currentTaluka,
        included,
        override_vacancies: currentTaluka?.override_vacancies ?? null,
        vacancies: included
          ? (currentTaluka?.override_vacancies ?? (targetDist.per_taluka ?? defaultPerTaluka))
          : 0,
      },
    };

    const updatedDistAlloc = {
      ...distAlloc,
      [dist]: {
        ...targetDist,
        taluka_allocations: updatedTalukaAlloc,
      },
    };

    const newConfig: VacancyAllocationsConfig = {
      ...currentAlloc,
      district_allocations: updatedDistAlloc,
    };

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // Quick exclusion in Simple Mode
  const handleAddQuickExclusion = () => {
    if (!exclusionDistrict || !exclusionTaluka) return;
    handleTalukaToggle(exclusionDistrict, exclusionTaluka, false);
    setExclusionTaluka('');
  };

  // ── Handler: Taluka Headcount Override ─────────────────────────────────────
  const handleTalukaOverride = (dist: string, taluka: string, count: number | null) => {
    const currentAlloc = formData.vacancy_allocations ?? {};
    const distAlloc = currentAlloc.district_allocations ?? {};
    const targetDist = distAlloc[dist] ?? { included: true };
    const talukaAlloc = targetDist.taluka_allocations ?? {};
    const currentTaluka = talukaAlloc[taluka];

    const updatedTalukaAlloc = {
      ...talukaAlloc,
      [taluka]: {
        ...currentTaluka,
        included: true,
        override_vacancies: count,
        vacancies: count != null ? count : (targetDist.per_taluka ?? defaultPerTaluka),
      },
    };

    const updatedDistAlloc = {
      ...distAlloc,
      [dist]: {
        ...targetDist,
        taluka_allocations: updatedTalukaAlloc,
      },
    };

    const newConfig: VacancyAllocationsConfig = {
      ...currentAlloc,
      district_allocations: updatedDistAlloc,
    };

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka);

    setFormData(prev => ({
      ...prev,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: Apply Calculated Total to Approved Total ──────────────────────
  const handleApplyCalculatedToApproved = () => {
    set('total_vacancies', vacancyCalc.grandTotal);
  };

  // ── Handler: Toggle Auto-calculate switch ──────────────────────────────────
  const handleToggleAutoCalc = (enabled: boolean) => {
    setFormData(prev => ({
      ...prev,
      auto_calculate_vacancies: enabled,
      total_vacancies: enabled ? vacancyCalc.grandTotal : prev.total_vacancies,
      vacancy_allocations: vacancyCalc.config,
    }));
  };

  const approvedTotal = formData.total_vacancies ?? 0;
  const calculatedTotal = vacancyCalc.grandTotal;
  const isConsistent = approvedTotal === calculatedTotal;
  const diff = approvedTotal - calculatedTotal;

  return (
    <div className="space-y-6">

      {/* ══ 1. SMART LOCATION CONFIGURATION CARD ═════════════════════════════ */}
      <div className="border border-primary-200 rounded-2xl p-5 bg-white shadow-sm space-y-5">
        <div className="border-b border-primary-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h4 className="text-sm font-bold text-primary-950 flex items-center gap-2">
              <Compass className="w-4 h-4 text-primary-600" /> Smart Location Configuration
            </h4>
            <p className="text-xs text-primary-500 mt-0.5">
              Select geographic scope, divisions, districts, and configure public vs. confidential operational locations.
            </p>
          </div>
          <span className="text-[11px] font-mono px-2.5 py-1 rounded-full bg-primary-50 text-primary-700 border border-primary-200 font-semibold self-start sm:self-center">
            {locationType} • {selectedDistricts.length} Districts
          </span>
        </div>

        {/* Location Type Selector Grid */}
        <div>
          <label className="block text-xs font-bold text-primary-800 uppercase tracking-wide mb-2.5">
            Geographic Scope / Location Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
            {JOB_LOCATION_TYPES.map(t => {
              const active = locationType === t.value;
              return (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => handleLocationTypeChange(t.value as JobLocationType)}
                  className={`p-3 rounded-xl border text-left transition-all relative flex flex-col justify-between ${
                    active
                      ? 'border-primary-600 bg-primary-50/80 shadow-sm ring-1 ring-primary-500'
                      : 'border-slate-200 hover:border-primary-300 hover:bg-slate-50'
                  }`}
                >
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <span className={`text-xs font-bold ${active ? 'text-primary-900' : 'text-slate-800'}`}>
                        {t.label}
                      </span>
                      {active && <CheckCircle2 className="w-3.5 h-3.5 text-primary-600 shrink-0" />}
                    </div>
                    <p className="text-[10px] text-slate-500 line-clamp-2 leading-snug">
                      {t.desc}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* State-wide Banner (Clean & Simple) */}
        {locationType === 'State-wide' && (
          <div className="p-3.5 bg-emerald-50/70 border border-emerald-200 rounded-xl flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
              <div>
                <p className="text-xs font-bold text-emerald-950">
                  State-wide Hiring Active
                </p>
                <p className="text-[11px] text-emerald-700">
                  All 36 districts and eligible talukas across Maharashtra are included by default.
                </p>
              </div>
            </div>
            <span className="text-xs font-bold font-mono px-2.5 py-1 rounded-lg bg-white border border-emerald-300 text-emerald-800 shrink-0">
              36 Districts Selected
            </span>
          </div>
        )}

        {/* Remote Banner */}
        {locationType === 'Remote' && (
          <div className="p-3.5 bg-blue-50/70 border border-blue-200 rounded-xl flex items-center gap-2.5 text-xs text-blue-900">
            <Globe className="w-4 h-4 text-blue-600 shrink-0" />
            <span>
              <strong>Remote Position:</strong> Candidates can work from anywhere. District and taluka physical allocation is not required.
            </span>
          </div>
        )}

        {/* Regional Divisions Selector (when Regional is active) */}
        {locationType === 'Regional' && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex items-center justify-between">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wide">
                Select Administrative Divisions
              </label>
              <span className="text-[11px] text-slate-500 font-medium">
                {selectedRegions.length} of {MAHARASHTRA_REGIONS.length} Divisions Selected ({selectedDistricts.length} Districts)
              </span>
            </div>
            <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-2">
              {MAHARASHTRA_REGIONS.map(reg => {
                const checked = selectedRegions.includes(reg.name);
                return (
                  <button
                    key={reg.name}
                    type="button"
                    onClick={() => handleToggleRegion(reg.name)}
                    className={`flex items-center justify-between p-2.5 rounded-lg border text-left text-xs transition-all ${
                      checked
                        ? 'border-primary-500 bg-white shadow-xs text-primary-900 font-semibold'
                        : 'border-slate-200 bg-white/70 text-slate-600 hover:bg-white'
                    }`}
                  >
                    <span>{reg.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded-md bg-slate-100 text-slate-500 font-mono">
                      {reg.districts.length} dist.
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* City-Specific Configuration (when City-specific is active) */}
        {locationType === 'City-specific' && (
          <div className="p-4 bg-primary-50/40 rounded-xl border border-primary-200 space-y-4">
            <div className="grid sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-primary-800 mb-1">
                  City / Headquarters Name *
                </label>
                <input
                  type="text"
                  value={formData.city_name ?? ''}
                  placeholder="e.g. Pune, Mumbai, Nashik"
                  onChange={e => handleCityDetailsUpdate(e.target.value, formData.show_city_publicly ?? true)}
                  className="w-full border border-primary-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary-500"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-primary-800 mb-1">
                  Parent District *
                </label>
                <select
                  value={selectedDistricts[0] ?? ''}
                  onChange={e => handleCityDetailsUpdate(formData.city_name ?? '', formData.show_city_publicly ?? true, e.target.value)}
                  className="w-full border border-primary-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary-500"
                >
                  <option value="">— Select District —</option>
                  {MAHARASHTRA_DISTRICTS.map(d => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* City Public Visibility Toggle */}
            <div className="p-3 bg-white rounded-lg border border-primary-100 flex items-start gap-3">
              <input
                type="checkbox"
                id="show_city_toggle"
                checked={formData.show_city_publicly !== false}
                onChange={e => handleCityDetailsUpdate(formData.city_name ?? '', e.target.checked)}
                className="mt-1 rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <div className="text-xs">
                <label htmlFor="show_city_toggle" className="font-bold text-slate-800 cursor-pointer block">
                  Show Exact City Name on Public Careers Portal
                </label>
                <p className="text-slate-500 mt-0.5">
                  {formData.show_city_publicly !== false
                    ? 'Candidates will see the exact city name (e.g. "' + (formData.city_name || 'City') + ', Maharashtra") on job listings and details.'
                    : '🔒 Confidential: City name is hidden from candidates. Public job details will show regional district only; operational facility is disclosed only to shortlisted candidates.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {/* District Multi-Selection Matrix (for State-wide, Regional, District-wise, Multiple Locations) */}
        {locationType !== 'Remote' && locationType !== 'City-specific' && (
          <div className="space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-primary-800 uppercase tracking-wide">
                  Select Districts ({selectedDistricts.length} / {MAHARASHTRA_DISTRICTS.length})
                </label>
              </div>
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search district..."
                    value={districtSearch}
                    onChange={e => setDistrictSearch(e.target.value)}
                    className="pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-lg w-40 focus:outline-none focus:border-primary-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllDistricts}
                  className="px-2.5 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md border border-primary-200"
                >
                  Select All 36
                </button>
                <button
                  type="button"
                  onClick={handleClearAllDistricts}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md"
                >
                  Clear All
                </button>
              </div>
            </div>

            {/* District Chips Matrix */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 max-h-44 overflow-y-auto flex flex-wrap gap-1.5">
              {filteredDistricts.map(dist => {
                const isSelected = selectedDistricts.includes(dist);
                const talukas = getTalukasForDistrict(dist);
                return (
                  <button
                    key={dist}
                    type="button"
                    onClick={() => handleToggleDistrict(dist)}
                    className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs transition-all ${
                      isSelected
                        ? 'bg-primary-900 text-white font-medium shadow-xs'
                        : 'bg-white text-slate-700 border border-slate-200 hover:border-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span>{dist}</span>
                    <span className={`text-[10px] px-1 py-0.2 rounded font-mono ${isSelected ? 'bg-primary-800 text-primary-200' : 'bg-slate-100 text-slate-400'}`}>
                      {talukas.length}T
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Public & Internal Location Fields */}
        <div className="grid sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="block text-xs font-semibold text-primary-800">
                Public Location String (Seen by Candidates)
              </label>
              <button
                type="button"
                onClick={() => {
                  const autoStr = generatePublicLocationString({
                    locationType,
                    cityName: formData.city_name,
                    showCityPublicly: formData.show_city_publicly ?? true,
                    selectedDistricts,
                    selectedRegions,
                  });
                  set('location', autoStr);
                }}
                className="text-[11px] text-primary-600 hover:text-primary-800 font-medium flex items-center gap-1"
                title="Regenerate from selected locations"
              >
                <RefreshCw className="w-3 h-3" /> Auto-Format
              </button>
            </div>
            <input
              type="text"
              value={formData.location ?? ''}
              onChange={e => set('location', e.target.value)}
              placeholder="e.g. Maharashtra / Multiple Locations"
              className="w-full border border-primary-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary-500"
            />
            <p className="text-[11px] text-slate-500 mt-1">
              Candidates see this exact label on the public job card, search filters, and detail page.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5 text-slate-400" />
              Internal Operational Facility / Office Notes (Admin Only)
            </label>
            <input
              type="text"
              value={formData.internal_location ?? ''}
              onChange={e => set('internal_location', e.target.value)}
              placeholder="e.g. Central Agri Complex, Nariman Point - Warehouse B"
              className="w-full border border-slate-200 rounded-lg px-3 py-2 text-sm bg-slate-50/70 focus:outline-none focus:border-primary-500"
            />
            <p className="text-[11px] text-slate-400 mt-1">
              Confidential internal address for deployment, dispatch, and HR tracking. Never displayed to candidates.
            </p>
          </div>
        </div>
      </div>

      {/* ══ 2. AUTOMATIC VACANCY CALCULATOR (SIMPLE MODE BY DEFAULT) ═════════ */}
      <div className="border border-primary-200 rounded-2xl p-5 bg-white shadow-sm space-y-5">
        <div className="border-b border-primary-100 pb-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h4 className="text-sm font-bold text-primary-950 flex items-center gap-2">
              <Calculator className="w-4 h-4 text-primary-600" /> Vacancy Allocation & Automatic Calculator
            </h4>
            <p className="text-xs text-primary-500 mt-0.5">
              Calculate headcount dynamically from eligible districts and talukas, or set approved quota manually.
            </p>
          </div>

          {/* Auto-Calculate Toggle */}
          <label className="inline-flex items-center gap-2.5 p-2 rounded-xl bg-primary-50/70 border border-primary-200 cursor-pointer self-start sm:self-center">
            <input
              type="checkbox"
              checked={!!formData.auto_calculate_vacancies}
              onChange={e => handleToggleAutoCalc(e.target.checked)}
              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
            />
            <span className="text-xs font-bold text-primary-900">
              Auto-Calculate Vacancies from Talukas
            </span>
          </label>
        </div>

        {/* High-Level Vacancy Inputs Grid (Simple Mode) */}
        <div className="grid sm:grid-cols-3 md:grid-cols-5 gap-3 p-4 bg-primary-50/30 rounded-xl border border-primary-100">
          <div>
            <label className="block text-xs font-bold text-primary-900 mb-1">
              Approved Vacancies *
            </label>
            <input
              type="number"
              min="0"
              value={formData.total_vacancies ?? ''}
              placeholder="e.g. 72"
              onChange={e => set('total_vacancies', e.target.value === '' ? null : parseInt(e.target.value) || null)}
              className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-sm font-bold text-primary-950 focus:outline-none focus:border-primary-500 bg-white"
            />
            <span className="text-[10px] text-primary-500 mt-0.5 block">Statutory published count</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-700 mb-1">
              Default / District
            </label>
            <input
              type="number"
              min="0"
              value={formData.vacancies_per_district ?? ''}
              placeholder="e.g. 2"
              onChange={e => set('vacancies_per_district', e.target.value === '' ? null : parseInt(e.target.value) || null)}
              className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Target per district</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-700 mb-1">
              Default / Taluka
            </label>
            <input
              type="number"
              min="1"
              value={formData.vacancies_per_taluka ?? 1}
              placeholder="e.g. 1"
              onChange={e => handleDefaultPerTalukaChange(parseInt(e.target.value) || 1)}
              className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-sm font-semibold focus:outline-none focus:border-primary-500 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Standard per taluka</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-700 mb-1">Min Age</label>
            <input
              type="number"
              min="0"
              value={formData.min_age ?? ''}
              placeholder="e.g. 21"
              onChange={e => set('min_age', e.target.value === '' ? null : parseInt(e.target.value) || null)}
              className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Years</span>
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-700 mb-1">Max Age</label>
            <input
              type="number"
              min="0"
              value={formData.max_age ?? ''}
              placeholder="e.g. 40"
              onChange={e => set('max_age', e.target.value === '' ? null : parseInt(e.target.value) || null)}
              className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white"
            />
            <span className="text-[10px] text-slate-400 mt-0.5 block">Years</span>
          </div>
        </div>

        {/* ── Reconciliation Banner ────────────────────────────────────────── */}
        <div className={`p-4 rounded-xl border flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 ${
          isConsistent
            ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
            : 'bg-amber-50 border-amber-300 text-amber-900'
        }`}>
          <div className="flex items-start gap-2.5">
            {isConsistent ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold uppercase tracking-wide">
                  {isConsistent ? 'Allocations Reconciled' : 'Headcount Discrepancy Detected'}
                </span>
                <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full font-bold ${
                  isConsistent ? 'bg-emerald-200 text-emerald-800' : 'bg-amber-200 text-amber-800'
                }`}>
                  Calculated: {calculatedTotal} vs Approved: {approvedTotal}
                </span>
              </div>
              <p className="text-xs mt-0.5 opacity-90">
                {isConsistent
                  ? `Approved total vacancies (${approvedTotal}) matches bottom-up calculation from ${vacancyCalc.totalActiveTalukas} eligible talukas.`
                  : `Discrepancy of ${diff > 0 ? `+${diff}` : diff} vacancies between approved headcount (${approvedTotal}) and bottom-up taluka calculation (${calculatedTotal}).`}
              </p>
            </div>
          </div>

          {!isConsistent && (
            <button
              type="button"
              onClick={handleApplyCalculatedToApproved}
              className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-lg transition-colors shrink-0 shadow-xs flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              Apply Calculated ({calculatedTotal}) to Approved
            </button>
          )}
        </div>

        {/* Allocation Metrics Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Selected Districts</span>
            <span className="text-lg font-bold text-slate-900">{selectedDistricts.length}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Eligible Talukas</span>
            <span className="text-lg font-bold text-emerald-700">{vacancyCalc.totalActiveTalukas}</span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Excluded Talukas</span>
            <span className="text-lg font-bold text-slate-400">{vacancyCalc.totalExcludedTalukas}</span>
          </div>
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-center">
            <span className="text-[10px] text-primary-700 font-bold uppercase tracking-wider block">Grand Calculated Total</span>
            <span className="text-lg font-bold text-primary-900">{calculatedTotal} Vacancies</span>
          </div>
        </div>

        {/* ── SIMPLE MODE: Quick Taluka Exclusions ───────────────────────────── */}
        {selectedDistricts.length > 0 && (
          <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div>
                <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                  <MinusCircle className="w-3.5 h-3.5 text-slate-500" />
                  Quick Taluka Exclusions
                </label>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Exclude specific talukas where positions should not be advertised. Calculated total updates instantly.
                </p>
              </div>
              <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-white border border-slate-200 text-slate-600 font-semibold self-start sm:self-center">
                {excludedTalukasList.length} Excluded
              </span>
            </div>

            {/* Quick Exclusion Pickers */}
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={exclusionDistrict}
                onChange={e => {
                  setExclusionDistrict(e.target.value);
                  setExclusionTaluka('');
                }}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary-500"
              >
                <option value="">— Select District to Exclude From —</option>
                {selectedDistricts.map(d => (
                  <option key={d} value={d}>{d}</option>
                ))}
              </select>

              <select
                value={exclusionTaluka}
                onChange={e => setExclusionTaluka(e.target.value)}
                disabled={!exclusionDistrict}
                className="text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
              >
                <option value="">— Select Taluka —</option>
                {talukasForExclusion.map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>

              <button
                type="button"
                onClick={handleAddQuickExclusion}
                disabled={!exclusionDistrict || !exclusionTaluka}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
              >
                Exclude Taluka
              </button>
            </div>

            {/* Active Exclusions Chips Strip */}
            {excludedTalukasList.length > 0 && (
              <div className="pt-2 border-t border-slate-200/80 flex flex-wrap gap-1.5">
                {excludedTalukasList.map(item => (
                  <span
                    key={`${item.district}-${item.taluka}`}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-white border border-slate-300 rounded-md text-xs text-slate-700 shadow-2xs"
                  >
                    <span className="font-medium text-slate-500">{item.district}:</span>
                    <span className="font-semibold text-slate-800">{item.taluka}</span>
                    <button
                      type="button"
                      onClick={() => handleTalukaToggle(item.district, item.taluka, true)}
                      className="p-0.5 text-slate-400 hover:text-red-600 rounded transition-colors ml-0.5"
                      title={`Restore ${item.taluka} in ${item.district}`}
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ══ 3. ADVANCED SETTINGS EXPANDABLE SECTION ════════════════════════ */}
        <div className="border border-slate-200 rounded-xl overflow-hidden bg-slate-50/50">
          <button
            type="button"
            onClick={() => setShowAdvanced(prev => !prev)}
            className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-100/70 transition-colors"
          >
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-primary-100/70 flex items-center justify-center text-primary-800">
                <Sliders className="w-4 h-4" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-800 uppercase tracking-wide">
                    Advanced Settings: District Overrides &amp; Custom Headcounts
                  </span>
                  {activeOverridesCount > 0 && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-200">
                      ⚡ {activeOverridesCount} Active Override{activeOverridesCount > 1 ? 's' : ''}
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Configure custom vacancies per taluka, district total overrides, and district-specific rates.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs font-semibold text-primary-700">
              <span>{showAdvanced ? 'Hide Advanced Settings' : 'Show Advanced Settings'}</span>
              {showAdvanced ? (
                <ChevronUp className="w-4 h-4" />
              ) : (
                <ChevronDown className="w-4 h-4" />
              )}
            </div>
          </button>

          {/* Expandable Advanced Content */}
          {showAdvanced && (
            <div className="p-4 border-t border-slate-200 bg-white space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-500 pb-1">
                <span>
                  Showing all {selectedDistricts.length} selected districts. Enter custom headcounts or rates below:
                </span>
                <span className="font-mono text-[11px]">
                  Default: {defaultPerTaluka} / taluka
                </span>
              </div>

              {selectedDistricts.length > 0 ? (
                <div className="space-y-2 border border-slate-200 rounded-xl divide-y divide-slate-100 overflow-hidden">
                  {selectedDistricts.map(dist => {
                    const talukas = getTalukasForDistrict(dist);
                    const distAlloc = formData.vacancy_allocations?.district_allocations?.[dist];
                    const isExpanded = !!expandedDistricts[dist];
                    const distTotal = vacancyCalc.districtTotals[dist] ?? 0;
                    const activeCount = vacancyCalc.activeTalukaCounts[dist] ?? talukas.length;

                    return (
                      <div key={dist} className="bg-white">
                        {/* District Row Header */}
                        <div className="p-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors">
                          <div className="flex items-center gap-2.5">
                            <button
                              type="button"
                              onClick={() => setExpandedDistricts(prev => ({ ...prev, [dist]: !prev[dist] }))}
                              className="p-1 text-slate-400 hover:text-slate-700 rounded transition-colors"
                              title="Expand/Collapse Talukas"
                            >
                              {isExpanded ? (
                                <ChevronDown className="w-4 h-4 text-primary-600" />
                              ) : (
                                <ChevronRight className="w-4 h-4" />
                              )}
                            </button>
                            <div>
                              <span className="text-sm font-bold text-slate-800">{dist}</span>
                              <span className="text-[11px] text-slate-500 ml-2">
                                ({activeCount} of {talukas.length} talukas active)
                              </span>
                            </div>
                          </div>

                          {/* District Override Controls */}
                          <div className="flex items-center gap-3 self-end sm:self-center">
                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-500 text-[11px]">Dist. Override:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder="auto"
                                value={distAlloc?.override_total ?? ''}
                                onChange={e => handleDistrictOverrideTotal(dist, e.target.value === '' ? null : parseInt(e.target.value) || null)}
                                className="w-16 border border-slate-200 rounded px-2 py-1 text-xs text-center font-semibold bg-white focus:outline-none focus:border-primary-500"
                              />
                            </div>

                            <div className="flex items-center gap-1.5 text-xs">
                              <span className="text-slate-500 text-[11px]">Per Taluka:</span>
                              <input
                                type="number"
                                min="0"
                                placeholder={String(defaultPerTaluka)}
                                value={distAlloc?.per_taluka ?? ''}
                                onChange={e => handleDistrictPerTalukaRate(dist, e.target.value === '' ? null : parseInt(e.target.value) || null)}
                                className="w-14 border border-slate-200 rounded px-2 py-1 text-xs text-center bg-white focus:outline-none focus:border-primary-500"
                              />
                            </div>

                            <span className="px-2.5 py-1 bg-primary-100 text-primary-900 rounded-lg text-xs font-bold font-mono min-w-[70px] text-center">
                              {distTotal} Vacancies
                            </span>

                            <button
                              type="button"
                              onClick={() => setExpandedDistricts(prev => ({ ...prev, [dist]: !prev[dist] }))}
                              className="text-[11px] font-semibold text-primary-600 hover:text-primary-800"
                            >
                              {isExpanded ? 'Hide Talukas' : 'Configure Talukas'}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Taluka Breakdown Table */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                              {talukas.map(taluka => {
                                const talukaAlloc = distAlloc?.taluka_allocations?.[taluka];
                                const isIncluded = talukaAlloc?.included !== false;
                                const customCount = talukaAlloc?.override_vacancies;

                                return (
                                  <div
                                    key={taluka}
                                    className={`p-2.5 rounded-lg border flex items-center justify-between gap-2 transition-all ${
                                      isIncluded
                                        ? 'bg-white border-slate-200 shadow-2xs'
                                        : 'bg-slate-100 border-slate-200 opacity-60'
                                    }`}
                                  >
                                    <label className="flex items-center gap-2 cursor-pointer text-xs truncate">
                                      <input
                                        type="checkbox"
                                        checked={isIncluded}
                                        onChange={e => handleTalukaToggle(dist, taluka, e.target.checked)}
                                        className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                                      />
                                      <span className={`truncate ${isIncluded ? 'text-slate-800 font-medium' : 'text-slate-400 line-through'}`}>
                                        {taluka}
                                      </span>
                                    </label>

                                    {isIncluded && (
                                      <div className="flex items-center gap-1 shrink-0">
                                        <input
                                          type="number"
                                          min="0"
                                          value={customCount ?? ''}
                                          placeholder={String(distAlloc?.per_taluka ?? defaultPerTaluka)}
                                          onChange={e => handleTalukaOverride(dist, taluka, e.target.value === '' ? null : parseInt(e.target.value) || null)}
                                          className="w-12 border border-slate-200 rounded px-1.5 py-0.5 text-xs text-center font-bold bg-white focus:outline-none focus:border-primary-500"
                                        />
                                        <span className="text-[10px] text-slate-400">pos.</span>
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="p-6 bg-slate-50 border border-dashed border-slate-200 rounded-xl text-center text-xs text-slate-500">
                  No districts selected. Select districts above to configure advanced taluka allocations.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

    </div>
  );
}
