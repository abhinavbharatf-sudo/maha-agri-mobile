import React, { useState, useMemo } from 'react';
import {
  MapPin, Building2, Globe, Compass, Layers, Calculator,
  Sliders, ChevronDown, ChevronRight, CheckSquare, Square,
  CheckCircle2, AlertCircle, Eye, EyeOff, Search, Lock,
  RefreshCw, Check, Sparkles, Filter, Users, X, MinusCircle,
  HelpCircle, ChevronUp, AlertTriangle,
} from 'lucide-react';
import type {
  RmsJobPosting, JobLocationType, VacancyAllocationsConfig, VacancyLevel, PostingLevel, JobLocationQuestion, CityLocationAllocation,
} from '../../lib/types';
import {
  JOB_LOCATION_TYPES, MAHARASHTRA_REGIONS, MAHARASHTRA_DISTRICTS, getDefaultLocationQuestions,
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
  const [showCandidatePreview, setShowCandidatePreview] = useState(false);

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

  const vacancyLevel: VacancyLevel = formData.vacancy_level ?? formData.vacancy_allocations?.vacancy_level ?? 'taluka';
  const postingLevel: PostingLevel = formData.posting_level || (
    formData.vacancy_level === 'district' || formData.vacancy_allocations?.vacancy_level === 'district'
      ? 'District-wise'
      : 'Taluka-wise'
  );
  const defaultPerDistrict = formData.vacancies_per_district ?? formData.vacancy_allocations?.default_per_district ?? null;
  const defaultPerTaluka = formData.vacancies_per_taluka != null
    ? Math.max(0, formData.vacancies_per_taluka)
    : (formData.vacancy_allocations?.default_per_taluka != null ? Math.max(0, formData.vacancy_allocations.default_per_taluka) : 1);

  // Authoritative location questions configuration
  const locationQuestions: JobLocationQuestion[] = useMemo(() => {
    if (Array.isArray(formData.location_questions) && formData.location_questions.length > 0) {
      return formData.location_questions;
    }
    if (Array.isArray(formData.vacancy_allocations?.location_questions) && formData.vacancy_allocations!.location_questions.length > 0) {
      return formData.vacancy_allocations!.location_questions;
    }
    return getDefaultLocationQuestions(postingLevel);
  }, [formData.location_questions, formData.vacancy_allocations, postingLevel]);

  // Compute live vacancy allocations
  const vacancyCalc = useMemo(() => {
    return calculateVacancies(
      selectedDistricts,
      formData.vacancy_allocations,
      defaultPerTaluka,
      defaultPerDistrict,
      vacancyLevel
    );
  }, [selectedDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel]);

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

    const calcResult = calculateVacancies(newDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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

    const calcResult = calculateVacancies(updatedDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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
    const calcResult = calculateVacancies(allDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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
    const calcResult = calculateVacancies([], formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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
  const citySelectionMode: 'single' | 'multiple' = useMemo(() => {
    if (formData.vacancy_allocations?.city_selection_mode) {
      return formData.vacancy_allocations.city_selection_mode;
    }
    if (Array.isArray(formData.vacancy_allocations?.cities) && formData.vacancy_allocations!.cities.length > 1) {
      return 'multiple';
    }
    return 'single';
  }, [formData.vacancy_allocations?.city_selection_mode, formData.vacancy_allocations?.cities]);

  const configuredCities: CityLocationAllocation[] = useMemo(() => {
    if (Array.isArray(formData.vacancy_allocations?.cities) && formData.vacancy_allocations!.cities.length > 0) {
      return formData.vacancy_allocations!.cities;
    }
    return [
      {
        id: 'city-1',
        cityName: formData.city_name || '',
        parentDistrict: selectedDistricts[0] || 'Pune',
        vacancies: formData.total_vacancies ?? 1,
        showCityPublicly: formData.show_city_publicly !== false,
        publicLocationString: '',
        internalNotes: formData.internal_location || '',
      },
    ];
  }, [formData.vacancy_allocations?.cities, formData.city_name, selectedDistricts, formData.total_vacancies, formData.show_city_publicly, formData.internal_location]);

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

    const calcResult = calculateVacancies(updatedDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

    setFormData(prev => ({
      ...prev,
      city_name: cityName,
      show_city_publicly: showPublicly,
      location_districts: updatedDistricts,
      location: newPublicLoc,
      vacancy_allocations: {
        ...calcResult.config,
        city_selection_mode: 'single',
      },
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  const handleCitySelectionModeChange = (mode: 'single' | 'multiple') => {
    if (mode === 'single') {
      const firstCity = configuredCities[0] || {
        cityName: formData.city_name || '',
        parentDistrict: selectedDistricts[0] || 'Pune',
        showCityPublicly: formData.show_city_publicly !== false,
        internalNotes: formData.internal_location || '',
      };
      const updatedDistricts = [firstCity.parentDistrict || 'Pune'];
      const newPublicLoc = generatePublicLocationString({
        locationType: 'City-specific',
        cityName: firstCity.cityName,
        showCityPublicly: firstCity.showCityPublicly,
        selectedDistricts: updatedDistricts,
        selectedRegions: [],
        currentLocation: formData.location,
      });
      const calcResult = calculateVacancies(updatedDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);
      setFormData(prev => ({
        ...prev,
        city_name: firstCity.cityName,
        show_city_publicly: firstCity.showCityPublicly,
        internal_location: firstCity.internalNotes || prev.internal_location,
        location_districts: updatedDistricts,
        location: newPublicLoc,
        vacancy_allocations: {
          ...calcResult.config,
          city_selection_mode: 'single',
          cities: configuredCities,
        },
        total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
      }));
    } else {
      const uniqueDistricts = Array.from(new Set(configuredCities.map(c => c.parentDistrict).filter(Boolean)));
      const totalFromCities = configuredCities.reduce((sum, c) => sum + (Number(c.vacancies) || 0), 0);
      const newPublicLoc = generatePublicLocationString({
        locationType: 'City-specific',
        cityName: configuredCities.map(c => c.cityName).filter(Boolean).join(', '),
        showCityPublicly: true,
        selectedDistricts: uniqueDistricts,
        selectedRegions: [],
        currentLocation: formData.location,
        cities: configuredCities,
      });
      const calcResult = calculateVacancies(uniqueDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);
      setFormData(prev => ({
        ...prev,
        location_districts: uniqueDistricts,
        location: newPublicLoc,
        vacancy_allocations: {
          ...calcResult.config,
          city_selection_mode: 'multiple',
          cities: configuredCities,
        },
        total_vacancies: totalFromCities > 0 ? totalFromCities : prev.total_vacancies,
      }));
    }
  };

  const handleAddCity = () => {
    const nextNum = configuredCities.length + 1;
    const newCity: CityLocationAllocation = {
      id: `city-${Date.now()}-${nextNum}`,
      cityName: '',
      parentDistrict: 'Pune',
      vacancies: 1,
      showCityPublicly: true,
      publicLocationString: '',
      internalNotes: '',
    };
    const updated = [...configuredCities, newCity];
    const uniqueDistricts = Array.from(new Set(updated.map(c => c.parentDistrict).filter(Boolean)));
    const totalFromCities = updated.reduce((sum, c) => sum + (Number(c.vacancies) || 0), 0);
    const newPublicLoc = generatePublicLocationString({
      locationType: 'City-specific',
      cityName: updated.map(c => c.cityName).filter(Boolean).join(', '),
      showCityPublicly: true,
      selectedDistricts: uniqueDistricts,
      selectedRegions: [],
      currentLocation: formData.location,
      cities: updated,
    });
    const calcResult = calculateVacancies(uniqueDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);
    setFormData(prev => ({
      ...prev,
      location_districts: uniqueDistricts,
      location: newPublicLoc,
      vacancy_allocations: {
        ...calcResult.config,
        city_selection_mode: 'multiple',
        cities: updated,
      },
      total_vacancies: totalFromCities > 0 ? totalFromCities : prev.total_vacancies,
    }));
  };

  const handleUpdateCity = (idx: number, updates: Partial<CityLocationAllocation>) => {
    const updated = configuredCities.map((c, i) => (i === idx ? { ...c, ...updates } : c));
    const uniqueDistricts = Array.from(new Set(updated.map(c => c.parentDistrict).filter(Boolean)));
    const totalFromCities = updated.reduce((sum, c) => sum + (Number(c.vacancies) || 0), 0);
    const newPublicLoc = generatePublicLocationString({
      locationType: 'City-specific',
      cityName: updated.map(c => c.cityName).filter(Boolean).join(', '),
      showCityPublicly: true,
      selectedDistricts: uniqueDistricts,
      selectedRegions: [],
      currentLocation: formData.location,
      cities: updated,
    });
    const calcResult = calculateVacancies(uniqueDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);
    setFormData(prev => ({
      ...prev,
      city_name: updated[0]?.cityName || prev.city_name,
      location_districts: uniqueDistricts,
      location: newPublicLoc,
      vacancy_allocations: {
        ...calcResult.config,
        city_selection_mode: 'multiple',
        cities: updated,
      },
      total_vacancies: totalFromCities > 0 ? totalFromCities : prev.total_vacancies,
    }));
  };

  const handleRemoveCity = (idx: number) => {
    if (configuredCities.length <= 1) return;
    const updated = configuredCities.filter((_, i) => i !== idx);
    const uniqueDistricts = Array.from(new Set(updated.map(c => c.parentDistrict).filter(Boolean)));
    const totalFromCities = updated.reduce((sum, c) => sum + (Number(c.vacancies) || 0), 0);
    const newPublicLoc = generatePublicLocationString({
      locationType: 'City-specific',
      cityName: updated.map(c => c.cityName).filter(Boolean).join(', '),
      showCityPublicly: true,
      selectedDistricts: uniqueDistricts,
      selectedRegions: [],
      currentLocation: formData.location,
      cities: updated,
    });
    const calcResult = calculateVacancies(uniqueDistricts, formData.vacancy_allocations, defaultPerTaluka, defaultPerDistrict, vacancyLevel);
    setFormData(prev => ({
      ...prev,
      city_name: updated[0]?.cityName || '',
      location_districts: uniqueDistricts,
      location: newPublicLoc,
      vacancy_allocations: {
        ...calcResult.config,
        city_selection_mode: 'multiple',
        cities: updated,
      },
      total_vacancies: totalFromCities > 0 ? totalFromCities : prev.total_vacancies,
    }));
  };

  // ── Handler: Posting Level Change (District-wise vs Taluka-wise) ───────────
  const handlePostingLevelChange = (newPostingLevel: PostingLevel) => {
    if (newPostingLevel === postingLevel) return;

    const newVacancyLevel: VacancyLevel = newPostingLevel === 'District-wise' ? 'district' : 'taluka';
    set('posting_level', newPostingLevel);
    set('vacancy_level', newVacancyLevel);

    // Cache current questions under the previous posting level to prevent silent overwriting
    const existingByLevel = (formData.vacancy_allocations as any)?.location_questions_by_level || {};
    const updatedByLevel: Record<string, JobLocationQuestion[]> = {
      ...existingByLevel,
      [postingLevel]: locationQuestions,
    };

    // Restore previously saved questions for the target posting level if available,
    // otherwise load the official default questions for the new posting level
    const targetQuestions: JobLocationQuestion[] =
      Array.isArray(updatedByLevel[newPostingLevel]) && updatedByLevel[newPostingLevel].length > 0
        ? updatedByLevel[newPostingLevel]
        : getDefaultLocationQuestions(newPostingLevel);

    const updatedConfig: VacancyAllocationsConfig = {
      ...(formData.vacancy_allocations ?? {}),
      vacancy_level: newVacancyLevel,
      posting_level: newPostingLevel,
      location_questions: targetQuestions,
      location_questions_by_level: updatedByLevel,
      default_per_district: defaultPerDistrict,
    };

    const calcResult = calculateVacancies(
      selectedDistricts,
      updatedConfig,
      defaultPerTaluka,
      defaultPerDistrict,
      newVacancyLevel
    );

    setFormData(prev => ({
      ...prev,
      posting_level: newPostingLevel,
      vacancy_level: newVacancyLevel,
      location_questions: targetQuestions,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  const updateLocationQuestions = (newQuestions: JobLocationQuestion[]) => {
    set('location_questions', newQuestions);
    const existingByLevel = (formData.vacancy_allocations as any)?.location_questions_by_level || {};
    const updatedByLevel = {
      ...existingByLevel,
      [postingLevel]: newQuestions,
    };

    setFormData(prev => ({
      ...prev,
      location_questions: newQuestions,
      vacancy_allocations: {
        ...(prev.vacancy_allocations ?? {}),
        location_questions: newQuestions,
        location_questions_by_level: updatedByLevel,
      },
    }));
  };

  const handleToggleQuestionEnabled = (qId: string) => {
    const updated = locationQuestions.map(q => (q.id === qId ? { ...q, enabled: !q.enabled } : q));
    updateLocationQuestions(updated);
  };

  const handleToggleQuestionRequired = (qId: string) => {
    const updated = locationQuestions.map(q => (q.id === qId ? { ...q, required: !q.required } : q));
    updateLocationQuestions(updated);
  };

  const handleUpdateQuestionText = (qId: string, text: string) => {
    const updated = locationQuestions.map(q => (q.id === qId ? { ...q, questionText: text } : q));
    updateLocationQuestions(updated);
  };

  const handleResetQuestionsToDefault = () => {
    const defaults = getDefaultLocationQuestions(postingLevel);
    updateLocationQuestions(defaults);
  };

  // ── Handler: Multiple Preferred Locations Configuration ───────────────────
  const multipleLocsConfig = useMemo(() => {
    return (
      formData.multiple_locations_config ||
      formData.vacancy_allocations?.multiple_locations_config || {
        enabled: false,
        maxDistricts: 3,
        maxTalukasPerDistrict: 2,
      }
    );
  }, [formData.multiple_locations_config, formData.vacancy_allocations?.multiple_locations_config]);

  const handleToggleMultipleLocations = (enabled: boolean) => {
    const updated = {
      ...multipleLocsConfig,
      enabled,
      maxDistricts: multipleLocsConfig.maxDistricts || 3,
      maxTalukasPerDistrict: 2,
    };
    set('multiple_locations_config', updated);
    setFormData(prev => ({
      ...prev,
      multiple_locations_config: updated,
      vacancy_allocations: {
        ...(prev.vacancy_allocations ?? {}),
        multiple_locations_config: updated,
      },
    }));
  };

  const handleMaxDistrictsChange = (maxDistricts: number) => {
    const updated = {
      ...multipleLocsConfig,
      maxDistricts: Math.min(3, Math.max(1, maxDistricts)),
    };
    set('multiple_locations_config', updated);
    setFormData(prev => ({
      ...prev,
      multiple_locations_config: updated,
      vacancy_allocations: {
        ...(prev.vacancy_allocations ?? {}),
        multiple_locations_config: updated,
      },
    }));
  };

  // ── Handler: Vacancy Level Change (Taluka vs District) ─────────────────────
  const handleVacancyLevelChange = (newLevel: VacancyLevel) => {
    const newPostingLevel: PostingLevel = newLevel === 'district' ? 'District-wise' : 'Taluka-wise';
    handlePostingLevelChange(newPostingLevel);
  };

  // ── Handler: Vacancy Per-District Default Change ───────────────────────────
  const handleDefaultPerDistrictChange = (val: number | null) => {
    set('vacancies_per_district', val);
    const updatedConfig: VacancyAllocationsConfig = {
      ...(formData.vacancy_allocations ?? {}),
      default_per_district: val,
    };
    const calcResult = calculateVacancies(
      selectedDistricts,
      updatedConfig,
      defaultPerTaluka,
      val,
      vacancyLevel
    );
    setFormData(prev => ({
      ...prev,
      vacancies_per_district: val,
      vacancy_allocations: calcResult.config,
      total_vacancies: prev.auto_calculate_vacancies ? calcResult.grandTotal : prev.total_vacancies,
    }));
  };

  // ── Handler: Vacancy Per-Taluka Default Change ─────────────────────────────
  const handleDefaultPerTalukaChange = (val: number | null) => {
    const updatedConfig: VacancyAllocationsConfig = {
      ...(formData.vacancy_allocations ?? {}),
      default_per_taluka: val,
    };
    const effectiveRate = val != null ? Math.max(0, val) : 0;
    const calcResult = calculateVacancies(selectedDistricts, updatedConfig, effectiveRate, defaultPerDistrict, vacancyLevel);
    setFormData(prev => {
      const wasInSync = prev.total_vacancies === null || prev.total_vacancies === calculatedTotal;
      return {
        ...prev,
        vacancies_per_taluka: val,
        vacancy_allocations: {
          ...calcResult.config,
          default_per_taluka: val,
        },
        total_vacancies: prev.auto_calculate_vacancies || wasInSync ? calcResult.grandTotal : prev.total_vacancies,
      };
    });
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

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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

    const calcResult = calculateVacancies(selectedDistricts, newConfig, defaultPerTaluka, defaultPerDistrict, vacancyLevel);

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
      <div className="border border-primary-200 rounded-2xl p-3.5 sm:p-5 bg-white shadow-sm space-y-5">
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

        {/* Legacy Multiple Locations Compatibility Banner */}
        {locationType === 'Multiple Locations' && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span><strong>Legacy Location Type:</strong> This job posting was configured using legacy "Multiple Locations". You can edit it seamlessly or migrate to <strong>District-wise</strong> or <strong>City-specific (Multiple Cities)</strong>.</span>
            </div>
          </div>
        )}

        {/* Location Type Selector Grid */}
        <div>
          <label className="block text-xs font-bold text-primary-800 uppercase tracking-wide mb-2.5">
            Geographic Scope / Location Type
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
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
            {/* Mode Selector: Single City vs Multiple Cities */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-primary-200">
              <div className="flex items-center gap-2">
                <Building2 className="w-4 h-4 text-primary-700" />
                <span className="text-xs font-bold text-primary-900 uppercase tracking-wide">
                  City Selection Mode
                </span>
              </div>
              <div className="inline-flex rounded-lg border border-primary-300 p-0.5 bg-white shadow-2xs self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => handleCitySelectionModeChange('single')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    citySelectionMode === 'single'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Single City
                </button>
                <button
                  type="button"
                  onClick={() => handleCitySelectionModeChange('multiple')}
                  className={`px-3 py-1 text-xs font-semibold rounded-md transition-all ${
                    citySelectionMode === 'multiple'
                      ? 'bg-primary-600 text-white shadow-xs'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  Multiple Cities ({configuredCities.length})
                </button>
              </div>
            </div>

            {/* SINGLE CITY MODE */}
            {citySelectionMode === 'single' && (
              <div className="space-y-4">
                <div className="grid sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-primary-800 mb-1">
                      City / Headquarters Name *
                    </label>
                    <input
                      type="text"
                      value={formData.city_name ?? ''}
                      placeholder="e.g. Pune, Mumbai, Nashik"
                      onChange={e => handleCityDetailsUpdate(e.target.value, formData.show_city_publicly !== false)}
                      className="w-full border border-primary-200 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:border-primary-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-primary-800 mb-1">
                      Parent District *
                    </label>
                    <select
                      value={selectedDistricts[0] ?? ''}
                      onChange={e => handleCityDetailsUpdate(formData.city_name ?? '', formData.show_city_publicly !== false, e.target.value)}
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

                {/* Public Location String Preview */}
                <div className="p-3 bg-white/70 rounded-lg border border-primary-100">
                  <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                    Public Location String (Preview)
                  </label>
                  <p className="text-xs text-primary-900 font-medium font-mono">
                    {formData.location || 'Maharashtra / Specified Facility'}
                  </p>
                </div>

                {/* Internal Operational Facility / Office Notes (Admin Only) */}
                <div>
                  <label className="block text-xs font-semibold text-primary-800 mb-1">
                    Internal Operational Facility / Office Notes (Admin Only)
                  </label>
                  <textarea
                    rows={2}
                    value={formData.internal_location ?? ''}
                    placeholder="e.g. Office Suite 402, AgriTech Tower, Shivajinagar Hub (Internal only)"
                    onChange={e => set('internal_location', e.target.value)}
                    className="w-full border border-primary-200 rounded-lg px-3 py-2 text-xs bg-white focus:outline-none focus:border-primary-500"
                  />
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    🔒 Admin Only: Never exposed on public job listings, job details, or candidate application portal.
                  </p>
                </div>
              </div>
            )}

            {/* MULTIPLE CITIES MODE */}
            {citySelectionMode === 'multiple' && (
              <div className="space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <p className="text-xs text-slate-600">
                    Configure multiple independent city hubs. Each city has its own independent vacancies and public visibility settings.
                  </p>
                  <button
                    type="button"
                    onClick={handleAddCity}
                    className="px-3 py-1.5 bg-primary-600 hover:bg-primary-700 text-white rounded-lg text-xs font-semibold flex items-center gap-1.5 shadow-xs shrink-0 self-start sm:self-auto"
                  >
                    <span>+ Add City</span>
                  </button>
                </div>

                {/* City Cards List */}
                <div className="space-y-3">
                  {configuredCities.map((city, idx) => {
                    const isDuplicate = configuredCities.some(
                      (other, oIdx) =>
                        oIdx !== idx &&
                        other.cityName?.trim().toLowerCase() === city.cityName?.trim().toLowerCase() &&
                        other.parentDistrict === city.parentDistrict &&
                        Boolean(city.cityName?.trim())
                    );

                    return (
                      <div
                        key={city.id || `city-${idx}`}
                        className={`p-3.5 bg-white rounded-xl border transition-all ${
                          isDuplicate ? 'border-red-300 ring-1 ring-red-400' : 'border-primary-200 shadow-2xs'
                        }`}
                      >
                        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-100">
                          <div className="flex items-center gap-2">
                            <span className="w-5 h-5 rounded-full bg-primary-100 text-primary-800 text-[11px] font-bold flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <span className="text-xs font-bold text-slate-800">
                              {city.cityName?.trim() ? city.cityName : `City Location #${idx + 1}`}
                            </span>
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 font-medium">
                              District: {city.parentDistrict || 'Not selected'}
                            </span>
                          </div>
                          {configuredCities.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveCity(idx)}
                              className="text-slate-400 hover:text-red-600 p-1 rounded-md transition-colors text-xs flex items-center gap-1"
                              title="Remove City"
                            >
                              <X className="w-3.5 h-3.5" />
                              <span className="text-[11px]">Remove</span>
                            </button>
                          )}
                        </div>

                        {isDuplicate && (
                          <div className="mb-3 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-2">
                            <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                            <span>Duplicate City & Parent District combination detected. Please specify unique locations.</span>
                          </div>
                        )}

                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              City / Headquarters Name *
                            </label>
                            <input
                              type="text"
                              value={city.cityName}
                              placeholder="e.g. Pune, Nagpur, Aurangabad"
                              onChange={e => handleUpdateCity(idx, { cityName: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Parent District *
                            </label>
                            <select
                              value={city.parentDistrict}
                              onChange={e => handleUpdateCity(idx, { parentDistrict: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-primary-500"
                            >
                              <option value="">— Select District —</option>
                              {MAHARASHTRA_DISTRICTS.map(d => (
                                <option key={d} value={d}>{d}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div className="grid sm:grid-cols-2 gap-3 mb-3">
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Independent Vacancy Allocation *
                            </label>
                            <input
                              type="number"
                              min={1}
                              value={city.vacancies ?? 1}
                              onChange={e => handleUpdateCity(idx, { vacancies: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-primary-500"
                            />
                          </div>
                          <div>
                            <label className="block text-xs font-semibold text-slate-700 mb-1">
                              Public Location String (Optional Custom)
                            </label>
                            <input
                              type="text"
                              value={city.publicLocationString ?? ''}
                              placeholder={city.showCityPublicly !== false ? `${city.cityName || 'City'}, ${city.parentDistrict} (Maharashtra)` : `${city.parentDistrict} Region (Confidential)`}
                              onChange={e => handleUpdateCity(idx, { publicLocationString: e.target.value })}
                              className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-primary-500"
                            />
                          </div>
                        </div>

                        {/* Public Visibility Toggle per city */}
                        <div className="mb-3 p-2 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between">
                          <label className="text-xs font-medium text-slate-700 flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={city.showCityPublicly !== false}
                              onChange={e => handleUpdateCity(idx, { showCityPublicly: e.target.checked })}
                              className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                            />
                            <span>Show Exact City Name on Public Careers Portal</span>
                          </label>
                          <span className="text-[10px] text-slate-500">
                            {city.showCityPublicly !== false ? 'Public' : '🔒 Confidential'}
                          </span>
                        </div>

                        {/* Internal Notes per city */}
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Internal Operational Facility / Office Notes (Admin Only)
                          </label>
                          <input
                            type="text"
                            value={city.internalNotes ?? ''}
                            placeholder="e.g. Regional Processing Unit, MIDC Phase 2"
                            onChange={e => handleUpdateCity(idx, { internalNotes: e.target.value })}
                            className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-xs bg-white focus:outline-none focus:border-primary-500"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Multiple Cities Summary Banner */}
                <div className="p-3 bg-primary-100/60 rounded-xl border border-primary-200 flex flex-wrap items-center justify-between gap-3 text-xs text-primary-900">
                  <div className="flex items-center gap-3">
                    <span className="font-bold">Total Configured Cities: {configuredCities.length}</span>
                    <span>•</span>
                    <span className="font-bold">
                      Total Allocated Vacancies: {configuredCities.reduce((sum, c) => sum + (Number(c.vacancies) || 0), 0)}
                    </span>
                  </div>
                  <span className="text-[11px] text-primary-800">
                    Parent Districts: {Array.from(new Set(configuredCities.map(c => c.parentDistrict).filter(Boolean))).join(', ') || 'None'}
                  </span>
                </div>
              </div>
            )}
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
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative flex-1 sm:flex-none">
                  <Search className="w-3.5 h-3.5 absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search district..."
                    value={districtSearch}
                    onChange={e => setDistrictSearch(e.target.value)}
                    className="w-full sm:w-40 pl-8 pr-2 py-1 text-xs border border-slate-200 rounded-lg focus:outline-none focus:border-primary-500"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllDistricts}
                  className="px-2.5 py-1 text-[11px] font-semibold text-primary-700 bg-primary-50 hover:bg-primary-100 rounded-md border border-primary-200 shrink-0"
                >
                  Select All 36
                </button>
                <button
                  type="button"
                  onClick={handleClearAllDistricts}
                  className="px-2.5 py-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 rounded-md shrink-0"
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
      <div className="border border-primary-200 rounded-2xl p-3.5 sm:p-5 bg-white shadow-sm space-y-5">
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
              Auto-Calculate Vacancies from {vacancyLevel === 'district' ? 'Districts' : 'Talukas'}
            </span>
          </label>
        </div>

        {/* Posting Level Selector (Required Field) */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-primary-600" />
              Posting Level <span className="text-red-500">*</span>
            </span>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Specify whether this position is deployed at District-wise level (district quota only) or Taluka-wise level (district &amp; dependent talukas).
            </p>
          </div>

          <div className="inline-flex rounded-lg border border-slate-200 bg-white p-1 gap-1 self-start sm:self-center shadow-xs">
            <button
              type="button"
              onClick={() => handlePostingLevelChange('District-wise')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                postingLevel === 'District-wise'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              District-wise
            </button>
            <button
              type="button"
              onClick={() => handlePostingLevelChange('Taluka-wise')}
              className={`px-3.5 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                postingLevel === 'Taluka-wise'
                  ? 'bg-primary-600 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
              }`}
            >
              Taluka-wise
            </button>
          </div>
        </div>

        {/* Multiple Preferred Posting Locations Configuration Panel */}
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <span className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-primary-600" />
                Multiple Preferred Posting Locations
              </span>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Allow candidates to express priority-based preferences across multiple districts and talukas.
              </p>
            </div>
            <label className="inline-flex items-center gap-2 cursor-pointer self-start sm:self-center">
              <input
                type="checkbox"
                checked={Boolean(multipleLocsConfig.enabled)}
                onChange={e => handleToggleMultipleLocations(e.target.checked)}
                className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-4 w-4"
              />
              <span className="text-xs font-bold text-slate-700">
                {multipleLocsConfig.enabled ? 'Enabled' : 'Disabled (Single Location)'}
              </span>
            </label>
          </div>

          {multipleLocsConfig.enabled && (
            <div className="pt-3 border-t border-slate-200/80 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Maximum Preferred Districts (Priority 1 to {multipleLocsConfig.maxDistricts || 3})
                </label>
                <div className="flex items-center gap-2">
                  {[1, 2, 3].map(num => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => handleMaxDistrictsChange(num)}
                      className={`px-3 py-1.5 rounded-lg font-bold border transition-all cursor-pointer ${
                        (multipleLocsConfig.maxDistricts || 3) === num
                          ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                          : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                      }`}
                    >
                      {num} {num === 1 ? 'District' : 'Districts'}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Candidates may optionally select up to this number of preferred districts in priority order.
                </p>
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Maximum Preferred Talukas per District
                </label>
                <div className="px-3 py-1.5 bg-slate-100 border border-slate-200 rounded-lg text-slate-700 font-bold inline-block">
                  2 Talukas (Equal Priority within District)
                </div>
                <p className="text-[10px] text-slate-500 mt-1">
                  Candidates may select up to 2 talukas under each selected district (Taluka-wise drive only).
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Candidate Work Location Preferences Configuration Panel */}
        <div className="border border-slate-200 rounded-xl p-4 bg-white space-y-3 shadow-2xs">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-100">
            <div>
              <h5 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                <Compass className="w-3.5 h-3.5 text-primary-600" />
                Candidate Work Location Preferences ({postingLevel})
              </h5>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Configure Yes/No questions to understand candidate mobility and location flexibility.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCandidatePreview(prev => !prev)}
                className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition-all cursor-pointer border ${
                  showCandidatePreview
                    ? 'bg-primary-600 text-white border-primary-600 shadow-xs'
                    : 'bg-slate-50 text-slate-700 border-slate-300 hover:bg-slate-100'
                }`}
                title="Preview how enabled questions will appear to candidates"
              >
                <Eye className="w-3.5 h-3.5" />
                {showCandidatePreview ? 'Edit Configuration' : 'Preview Candidate View'}
              </button>
              <button
                type="button"
                onClick={handleResetQuestionsToDefault}
                className="text-[11px] font-bold text-primary-600 hover:text-primary-800 hover:underline cursor-pointer"
                title="Reset questions to official default wording for this posting level"
              >
                Reset to Defaults
              </button>
            </div>
          </div>

          {/* Candidate View Preview Mode */}
          {showCandidatePreview ? (
            <div className="p-4 bg-slate-50/80 rounded-xl border border-slate-200 space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wide flex items-center gap-1.5">
                  <Eye className="w-3.5 h-3.5 text-primary-600" />
                  Candidate Portal Live Preview
                </span>
                <span className="text-[11px] text-slate-500">
                  Showing {locationQuestions.filter(q => q.enabled).length} of {locationQuestions.length} questions enabled
                </span>
              </div>

              {locationQuestions.filter(q => q.enabled).length === 0 ? (
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-center text-xs text-amber-800">
                  <p className="font-bold">No questions currently enabled for candidates.</p>
                  <p className="text-[11px] text-amber-700 mt-1">
                    Toggle &quot;Enabled for Candidates&quot; on at least one question in Edit mode to present mobility questions to applicants.
                  </p>
                </div>
              ) : (
                <div className="space-y-3 pt-1">
                  {locationQuestions.filter(q => q.enabled).map((q, idx) => (
                    <div
                      key={q.id}
                      className="p-3.5 rounded-xl border border-slate-200 bg-white space-y-2.5 text-xs shadow-2xs"
                    >
                      <div className="font-bold text-[#102a43] leading-snug">
                        <span className="text-slate-400 font-mono mr-1.5">{idx + 1}.</span>
                        {q.questionText}
                        {q.required ? (
                          <span className="text-red-500 ml-1" title="Required">*</span>
                        ) : (
                          <span className="text-[10px] text-slate-400 font-normal ml-1.5">(optional)</span>
                        )}
                      </div>

                      <div className="flex items-center gap-4 pt-0.5">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                          <input
                            type="radio"
                            name={`preview_${q.id}`}
                            disabled
                            className="w-4 h-4 text-emerald-600 border-slate-300 focus:ring-emerald-500"
                          />
                          <span>Yes</span>
                        </label>
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700">
                          <input
                            type="radio"
                            name={`preview_${q.id}`}
                            disabled
                            className="w-4 h-4 text-slate-800 border-slate-300 focus:ring-slate-500"
                          />
                          <span>No</span>
                        </label>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            /* Edit Configuration Mode */
            <div className="space-y-2.5">
              {locationQuestions.map((q, idx) => (
                <div
                  key={q.id}
                  className={`p-3 rounded-xl border transition-all text-xs space-y-2 ${
                    q.enabled
                      ? 'border-slate-200 bg-slate-50/60'
                      : 'border-dashed border-slate-200 bg-slate-100/40 opacity-70'
                  }`}
                >
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-200 text-slate-700 rounded">
                        Q{idx + 1}
                      </span>
                      <label className="flex items-center gap-1.5 cursor-pointer font-bold text-slate-800 select-none">
                        <input
                          type="checkbox"
                          checked={q.enabled}
                          onChange={() => handleToggleQuestionEnabled(q.id)}
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5"
                        />
                        <span>{q.enabled ? 'Enabled for Candidates' : 'Disabled (Hidden)'}</span>
                      </label>
                    </div>

                    <div className="flex items-center gap-3">
                      <label className="flex items-center gap-1.5 cursor-pointer select-none text-[11px]">
                        <input
                          type="checkbox"
                          checked={q.required}
                          disabled={!q.enabled}
                          onChange={() => handleToggleQuestionRequired(q.id)}
                          className="rounded border-slate-300 text-primary-600 focus:ring-primary-500 h-3.5 w-3.5 disabled:opacity-50"
                        />
                        <span className={q.required ? 'font-bold text-red-600' : 'text-slate-500'}>
                          {q.required ? 'Required *' : 'Optional'}
                        </span>
                      </label>
                    </div>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={q.questionText}
                      disabled={!q.enabled}
                      onChange={e => handleUpdateQuestionText(q.id, e.target.value)}
                      placeholder="Enter question text..."
                      className="w-full px-3 py-1.5 bg-white border border-slate-300 rounded-lg text-xs font-medium text-slate-900 focus:outline-none focus:border-primary-500 disabled:bg-slate-100 disabled:text-slate-400"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* High-Level Vacancy Inputs Grid (Simple Mode) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 p-3.5 sm:p-4 bg-primary-50/30 rounded-xl border border-primary-100">
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

          <div className={vacancyLevel === 'taluka' ? 'opacity-60' : ''}>
            <label className={`block text-xs font-semibold mb-1 ${vacancyLevel === 'district' ? 'text-primary-950 font-bold' : 'text-slate-500'}`}>
              Default / District {vacancyLevel === 'district' ? '*' : '(Disabled in Taluka Level)'}
            </label>
            <input
              type="number"
              min="0"
              disabled={vacancyLevel === 'taluka'}
              value={formData.vacancies_per_district ?? ''}
              placeholder={vacancyLevel === 'taluka' ? 'N/A' : 'e.g. 2'}
              onChange={e => handleDefaultPerDistrictChange(e.target.value === '' ? null : parseInt(e.target.value) || null)}
              className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-sm focus:outline-none focus:border-primary-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {vacancyLevel === 'district' ? 'Quota for each selected district' : 'Active only in District Level mode'}
            </span>
          </div>

          <div className={vacancyLevel === 'district' ? 'opacity-60' : ''}>
            <label className={`block text-xs font-semibold mb-1 ${vacancyLevel === 'taluka' ? 'text-primary-950 font-bold' : 'text-slate-500'}`}>
              Default / Taluka {vacancyLevel === 'district' ? '(Disabled in District Level)' : '*'}
            </label>
            <input
              type="number"
              min="0"
              disabled={vacancyLevel === 'district'}
              value={formData.vacancies_per_taluka ?? formData.vacancy_allocations?.default_per_taluka ?? ''}
              placeholder={vacancyLevel === 'district' ? 'N/A' : 'e.g. 1'}
              onChange={e => {
                const raw = e.target.value;
                if (raw === '') {
                  handleDefaultPerTalukaChange(null);
                } else {
                  const num = parseInt(raw, 10);
                  handleDefaultPerTalukaChange(isNaN(num) ? null : Math.max(0, num));
                }
              }}
              className="w-full border border-primary-200 rounded-lg px-2.5 py-2 text-sm font-semibold focus:outline-none focus:border-primary-500 bg-white disabled:bg-slate-100 disabled:text-slate-400 disabled:cursor-not-allowed [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
            />
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              {vacancyLevel === 'district' ? 'Active only in Taluka Level mode' : 'Standard per taluka'}
            </span>
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
                  ? vacancyLevel === 'district'
                    ? `Approved total vacancies (${approvedTotal}) matches district quota calculation across ${selectedDistricts.length} selected districts.`
                    : `Approved total vacancies (${approvedTotal}) matches bottom-up calculation from ${vacancyCalc.totalActiveTalukas} eligible talukas.`
                  : vacancyLevel === 'district'
                    ? `Discrepancy of ${diff > 0 ? `+${diff}` : diff} vacancies between approved headcount (${approvedTotal}) and district quota calculation (${calculatedTotal}).`
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
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              {vacancyLevel === 'district' ? 'Vacancy Scope' : 'Eligible Talukas'}
            </span>
            <span className="text-lg font-bold text-emerald-700">
              {vacancyLevel === 'district' ? 'District-Wide' : vacancyCalc.totalActiveTalukas}
            </span>
          </div>
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-center">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">
              {vacancyLevel === 'district' ? 'Allocation Level' : 'Excluded Talukas'}
            </span>
            <span className="text-lg font-bold text-slate-600">
              {vacancyLevel === 'district' ? 'District Quota' : vacancyCalc.totalExcludedTalukas}
            </span>
          </div>
          <div className="p-3 bg-primary-50 border border-primary-200 rounded-xl text-center">
            <span className="text-[10px] text-primary-700 font-bold uppercase tracking-wider block">Grand Calculated Total</span>
            <span className="text-lg font-bold text-primary-900">{calculatedTotal} Vacancies</span>
          </div>
        </div>

        {/* ── SIMPLE MODE: District-Level Notice ───────────────────────────── */}
        {vacancyLevel === 'district' && selectedDistricts.length > 0 && (
          <div className="p-4 bg-emerald-50/70 rounded-xl border border-emerald-200 flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-bold text-emerald-950">
                District-Wide Vacancies Active
              </p>
              <p className="text-[11px] text-emerald-800 leading-relaxed">
                Vacancies apply across each selected district as a whole ({selectedDistricts.length} districts selected).
                Eligible candidates residing anywhere in the selected districts are eligible to apply. No individual taluka quotas or exclusions are required.
              </p>
            </div>
          </div>
        )}

        {/* ── SIMPLE MODE: Quick Taluka Exclusions ───────────────────────────── */}
        {vacancyLevel === 'taluka' && selectedDistricts.length > 0 && (
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
            <div className="flex flex-col sm:flex-row sm:items-center gap-2">
              <select
                value={exclusionDistrict}
                onChange={e => {
                  setExclusionDistrict(e.target.value);
                  setExclusionTaluka('');
                }}
                className="w-full sm:w-auto text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary-500"
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
                className="w-full sm:w-auto text-xs border border-slate-200 rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:border-primary-500 disabled:bg-slate-100 disabled:cursor-not-allowed"
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
                className="w-full sm:w-auto px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-lg text-xs font-semibold disabled:opacity-40 disabled:cursor-not-allowed transition-colors shrink-0"
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
                  Default: {vacancyLevel === 'district' ? (defaultPerDistrict != null ? `${defaultPerDistrict} / district` : 'None') : `${defaultPerTaluka} / taluka`}
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
                                {vacancyLevel === 'district'
                                  ? `(District-wide • ${talukas.length} talukas)`
                                  : `(${activeCount} of ${talukas.length} talukas active)`}
                              </span>
                            </div>
                          </div>

                          {/* District Override Controls */}
                          <div className="flex flex-wrap items-center gap-2 sm:gap-3 justify-between sm:justify-end w-full sm:w-auto">
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

                            {vacancyLevel === 'taluka' ? (
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
                            ) : null}

                            <span className="px-2.5 py-1 bg-primary-100 text-primary-900 rounded-lg text-xs font-bold font-mono min-w-[70px] text-center">
                              {distTotal} Vacancies
                            </span>

                            <button
                              type="button"
                              onClick={() => setExpandedDistricts(prev => ({ ...prev, [dist]: !prev[dist] }))}
                              className="text-[11px] font-semibold text-primary-600 hover:text-primary-800"
                            >
                              {isExpanded ? 'Hide Talukas' : (vacancyLevel === 'district' ? 'View Talukas' : 'Configure Talukas')}
                            </button>
                          </div>
                        </div>

                        {/* Collapsible Taluka Breakdown Table */}
                        {isExpanded && (
                          <div className="p-4 bg-slate-50/70 border-t border-slate-100">
                            {vacancyLevel === 'district' ? (
                              <div className="p-3 bg-white border border-slate-200 rounded-lg text-xs text-slate-600">
                                <p className="font-semibold text-slate-800 mb-1">
                                  District-Wide Vacancy Mode:
                                </p>
                                <p className="text-slate-500 leading-relaxed">
                                  Positions are allocated at the district level ({distTotal} vacancies). Candidates from all {talukas.length} talukas in {dist} are eligible to apply:
                                </p>
                                <div className="mt-2 flex flex-wrap gap-1">
                                  {talukas.map(t => (
                                    <span key={t} className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 text-[11px]">
                                      {t}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            ) : (
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
                            )}
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
