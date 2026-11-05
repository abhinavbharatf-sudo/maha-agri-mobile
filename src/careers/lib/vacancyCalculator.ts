import { getTalukasForDistrict } from '../../data/maharashtraGeography';
import type {
  JobLocationType,
  DistrictAllocation,
  TalukaAllocation,
  VacancyAllocationsConfig,
  VacancyLevel,
  RmsJobPosting,
  CityLocationAllocation,
} from './types';

export interface CalculationResult {
  config: VacancyAllocationsConfig;
  vacancyLevel: VacancyLevel;
  districtTotals: Record<string, number>;
  activeTalukaCounts: Record<string, number>;
  totalActiveTalukas: number;
  totalExcludedTalukas: number;
  grandTotal: number;
}

/**
 * Calculates vacancies dynamically based on vacancy level (taluka vs district),
 * selected districts, eligible talukas, default rates, district-level overrides,
 * and taluka-specific overrides/exclusions.
 */
export function calculateVacancies(
  selectedDistricts: string[],
  existingConfig?: VacancyAllocationsConfig | null,
  globalDefaultPerTaluka: number = 1,
  globalDefaultPerDistrict?: number | null,
  vacancyLevelOption?: VacancyLevel | null
): CalculationResult {
  const vacancyLevel: VacancyLevel = vacancyLevelOption ?? existingConfig?.vacancy_level ?? 'taluka';

  const defaultPerTaluka = Math.max(
    0,
    globalDefaultPerTaluka !== undefined && globalDefaultPerTaluka !== null
      ? globalDefaultPerTaluka
      : (existingConfig?.default_per_taluka ?? 1)
  );

  const defaultPerDistrict = globalDefaultPerDistrict !== undefined && globalDefaultPerDistrict !== null
    ? Math.max(0, globalDefaultPerDistrict)
    : (existingConfig?.default_per_district != null ? Math.max(0, existingConfig.default_per_district) : null);

  const districtAllocations: Record<string, DistrictAllocation> = {};
  const districtTotals: Record<string, number> = {};
  const activeTalukaCounts: Record<string, number> = {};

  let totalActiveTalukas = 0;
  let totalExcludedTalukas = 0;
  let grandTotal = 0;

  // ── District Level Vacancy Mode ──────────────────────────────────────────
  if (vacancyLevel === 'district') {
    const fallbackDistrictRate = defaultPerDistrict ?? 1;

    for (const district of selectedDistricts) {
      const existingDist = existingConfig?.district_allocations?.[district];
      const isIncluded = existingDist?.included !== false;

      if (!isIncluded) {
        districtAllocations[district] = {
          included: false,
          override_total: existingDist?.override_total ?? null,
          per_taluka: null,
          taluka_allocations: existingDist?.taluka_allocations ?? {},
          calculated_district_total: 0,
        };
        districtTotals[district] = 0;
        activeTalukaCounts[district] = 0;
        continue;
      }

      // If district has an explicit override_total, use it; otherwise use defaultPerDistrict
      const districtFinalTotal = existingDist?.override_total != null
        ? Math.max(0, existingDist.override_total)
        : Math.max(0, fallbackDistrictRate);

      districtAllocations[district] = {
        included: true,
        override_total: existingDist?.override_total ?? null,
        per_taluka: null,
        taluka_allocations: existingDist?.taluka_allocations ?? {},
        calculated_district_total: districtFinalTotal,
      };

      districtTotals[district] = districtFinalTotal;
      activeTalukaCounts[district] = 0;
      grandTotal += districtFinalTotal;
    }

    const updatedConfig: VacancyAllocationsConfig = {
      vacancy_level: 'district',
      default_per_taluka: defaultPerTaluka,
      default_per_district: defaultPerDistrict,
      district_allocations: districtAllocations,
      calculated_grand_total: grandTotal,
    };

    return {
      config: updatedConfig,
      vacancyLevel: 'district',
      districtTotals,
      activeTalukaCounts,
      totalActiveTalukas: 0,
      totalExcludedTalukas: 0,
      grandTotal,
    };
  }

  // ── Taluka Level Vacancy Mode (Default) ───────────────────────────────────
  for (const district of selectedDistricts) {
    const existingDist = existingConfig?.district_allocations?.[district];
    const isIncluded = existingDist?.included !== false;

    if (!isIncluded) {
      districtAllocations[district] = {
        included: false,
        override_total: existingDist?.override_total ?? null,
        per_taluka: existingDist?.per_taluka ?? null,
        taluka_allocations: existingDist?.taluka_allocations ?? {},
        calculated_district_total: 0,
      };
      districtTotals[district] = 0;
      activeTalukaCounts[district] = 0;
      continue;
    }

    const talukas = getTalukasForDistrict(district);
    const talukaAllocations: Record<string, TalukaAllocation> = {};

    let distTalukaSum = 0;
    let distActiveTalukas = 0;

    const districtPerTaluka = existingDist?.per_taluka != null
      ? Math.max(0, existingDist.per_taluka)
      : defaultPerTaluka;

    for (const taluka of talukas) {
      const existingTaluka = existingDist?.taluka_allocations?.[taluka];
      const talukaIncluded = existingTaluka?.included !== false;

      if (!talukaIncluded) {
        totalExcludedTalukas++;
        talukaAllocations[taluka] = {
          included: false,
          override_vacancies: existingTaluka?.override_vacancies ?? null,
          vacancies: 0,
        };
        continue;
      }

      distActiveTalukas++;
      totalActiveTalukas++;

      // A taluka has an explicit custom override if override_vacancies is set
      const hasExplicitOverride = existingTaluka?.override_vacancies != null;
      const talukaVacancies = hasExplicitOverride
        ? Math.max(0, existingTaluka!.override_vacancies!)
        : districtPerTaluka;

      talukaAllocations[taluka] = {
        included: true,
        override_vacancies: hasExplicitOverride ? existingTaluka!.override_vacancies : null,
        vacancies: talukaVacancies,
      };

      distTalukaSum += talukaVacancies;
    }

    // If district has a hard total override, that takes precedence over taluka sum
    const districtFinalTotal = existingDist?.override_total != null
      ? Math.max(0, existingDist.override_total)
      : distTalukaSum;

    districtAllocations[district] = {
      included: true,
      override_total: existingDist?.override_total ?? null,
      per_taluka: existingDist?.per_taluka ?? null,
      taluka_allocations: talukaAllocations,
      calculated_district_total: districtFinalTotal,
    };

    districtTotals[district] = districtFinalTotal;
    activeTalukaCounts[district] = distActiveTalukas;
    grandTotal += districtFinalTotal;
  }

  const updatedConfig: VacancyAllocationsConfig = {
    vacancy_level: 'taluka',
    default_per_taluka: defaultPerTaluka,
    default_per_district: defaultPerDistrict,
    district_allocations: districtAllocations,
    calculated_grand_total: grandTotal,
  };

  return {
    config: updatedConfig,
    vacancyLevel: 'taluka',
    districtTotals,
    activeTalukaCounts,
    totalActiveTalukas,
    totalExcludedTalukas,
    grandTotal,
  };
}

/**
 * Derives the public-facing location string from location type and settings.
 * Ensures internal details are never exposed if showCityPublicly is false.
 */
export function generatePublicLocationString(params: {
  locationType: JobLocationType;
  cityName?: string | null;
  showCityPublicly?: boolean;
  selectedDistricts?: string[];
  selectedRegions?: string[];
  currentLocation?: string | null;
  cities?: CityLocationAllocation[] | null;
}): string {
  const { locationType, cityName, showCityPublicly = true, selectedDistricts = [], selectedRegions = [], cities } = params;

  switch (locationType) {
    case 'State-wide':
      return 'State-wide (Across Maharashtra)';

    case 'Regional':
      if (selectedRegions.length > 0) {
        return `${selectedRegions.join(', ')} (${selectedDistricts.length} Districts)`;
      }
      return 'Regional (Maharashtra)';

    case 'District-wise':
      if (selectedDistricts.length === 1) {
        return `${selectedDistricts[0]} District, Maharashtra`;
      }
      if (selectedDistricts.length > 1 && selectedDistricts.length <= 3) {
        return `${selectedDistricts.join(', ')}, Maharashtra`;
      }
      if (selectedDistricts.length > 3) {
        return `${selectedDistricts.length} Districts, Maharashtra`;
      }
      return 'District-wise, Maharashtra';

    case 'City-specific': {
      if (cities && Array.isArray(cities) && cities.length > 0) {
        const publicCities = cities.filter(c => c.showCityPublicly !== false && c.cityName?.trim());
        if (publicCities.length > 0) {
          const names = publicCities.map(c => c.cityName.trim());
          if (names.length <= 3) {
            return `${names.join(', ')}, Maharashtra`;
          }
          return `${names.slice(0, 3).join(', ')} & ${names.length - 3} more cities, Maharashtra`;
        }
        return 'Maharashtra (Specific locations disclosed to shortlisted candidates)';
      }

      const city = cityName?.trim();
      const firstDistrict = selectedDistricts[0];
      if (showCityPublicly && city) {
        return firstDistrict && firstDistrict !== city
          ? `${city}, ${firstDistrict} (Maharashtra)`
          : `${city}, Maharashtra`;
      }
      if (!showCityPublicly) {
        return firstDistrict
          ? `${firstDistrict} Region, Maharashtra (Specific location disclosed to shortlisted candidates)`
          : 'Maharashtra (Specific location disclosed to shortlisted candidates)';
      }
      return 'Maharashtra / Specified Facility';
    }

    case 'Multiple Locations':
      if (selectedDistricts.length > 0) {
        return `Multiple Locations (${selectedDistricts.length} Districts, Maharashtra)`;
      }
      return 'Multiple Locations, Maharashtra';

    case 'Remote':
      return 'Remote / Work From Home (Maharashtra)';

    default:
      return params.currentLocation || 'Maharashtra';
  }
}

/**
 * Validates vacancy allocations consistency.
 * Returns an error message if publishing is blocked, or null if valid.
 */
export function validateVacancyAllocations(job: Partial<RmsJobPosting>): {
  isValid: boolean;
  error: string | null;
  warning: string | null;
  diff: number;
} {
  const autoCalc = !!job.auto_calculate_vacancies;
  const approvedTotal = job.total_vacancies ?? 0;
  const calculatedTotal = job.vacancy_allocations?.calculated_grand_total ?? 0;
  const diff = approvedTotal - calculatedTotal;

  if (!autoCalc) {
    return { isValid: true, error: null, warning: null, diff: 0 };
  }

  const selectedDistricts = job.location_districts || [];
  if (selectedDistricts.length === 0) {
    return {
      isValid: false,
      error: 'Cannot publish: At least one district must be selected when auto-calculate vacancies is enabled.',
      warning: null,
      diff,
    };
  }

  if (calculatedTotal <= 0) {
    return {
      isValid: false,
      error: 'Cannot publish: Calculated vacancy total must be greater than zero.',
      warning: null,
      diff,
    };
  }

  if (approvedTotal !== calculatedTotal) {
    const isDistrictLevel = job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district';
    const scopeName = isDistrictLevel ? 'district' : 'taluka';
    return {
      isValid: false,
      error: `Cannot publish: Approved vacancies (${approvedTotal}) does not match calculated ${scopeName} allocation (${calculatedTotal}). Difference: ${diff > 0 ? `+${diff}` : diff}. Please reconcile before publishing.`,
      warning: `Discrepancy detected: Approved total (${approvedTotal}) != Calculated (${calculatedTotal}).`,
      diff,
    };
  }

  return { isValid: true, error: null, warning: null, diff: 0 };
}
