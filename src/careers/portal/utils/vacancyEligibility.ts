import type { RmsJobPosting } from '../../lib/types';
import { getTalukasForDistrict } from '../../../data/maharashtraGeography';

export type VacancyAvailabilityStatus =
  | 'Vacancy Available'
  | 'Available in Other Taluka'
  | 'No Vacancy'
  | 'Availability Not Determined';

export interface VacancyEligibilityResult {
  status: VacancyAvailabilityStatus;
  vacancyCount: number | null;
  message: string;
  district: string;
  taluka?: string;
  postingLevel: 'District-wise' | 'Taluka-wise';
  lastUpdatedAt?: string | null;
  isReliable: boolean;
}

/**
 * Checks residential vacancy availability strictly against the current job posting's
 * published vacancy allocation and posting-level configuration.
 *
 * Rules:
 * - If district or allocation data is missing: "Availability Not Determined"
 * - For District-wise: checks district quota count directly.
 * - For Taluka-wise: checks candidate's exact taluka, or other talukas in the district.
 * - Never guesses or assumes eligibility without explicit allocation data.
 */
export function checkResidentialVacancyEligibility(
  district: string | undefined | null,
  taluka: string | undefined | null,
  job: RmsJobPosting | null | undefined
): VacancyEligibilityResult {
  const cleanDistrict = (district || '').trim();
  const cleanTaluka = (taluka || '').trim();

  // 1. Incomplete address guard
  if (!cleanDistrict) {
    return {
      status: 'Availability Not Determined',
      vacancyCount: null,
      message: 'District is not specified in residential address.',
      district: '',
      taluka: cleanTaluka,
      postingLevel: 'District-wise',
      isReliable: false,
    };
  }

  // 2. Reliable allocation configuration guard
  if (!job || !Array.isArray(job.location_districts) || job.location_districts.length === 0) {
    return {
      status: 'Availability Not Determined',
      vacancyCount: null,
      message: 'Vacancy allocation data is not published or reliable for this position.',
      district: cleanDistrict,
      taluka: cleanTaluka,
      postingLevel: 'District-wise',
      isReliable: false,
    };
  }

  // 3. Resolve Posting Level
  const postingLevel: 'District-wise' | 'Taluka-wise' =
    job.posting_level ||
    job.vacancy_allocations?.posting_level ||
    (job.vacancy_level === 'district' || job.vacancy_allocations?.vacancy_level === 'district'
      ? 'District-wise'
      : 'Taluka-wise');

  const isDistrictWise = postingLevel === 'District-wise';
  const lastUpdatedAt = (job.vacancy_allocations as any)?.updated_at || job.updated_at || null;

  // 4. Check if district is included in Job's allowed districts
  const isDistrictInJob = job.location_districts.some(
    d => d.trim().toLowerCase() === cleanDistrict.toLowerCase()
  );

  if (!isDistrictInJob) {
    return {
      status: 'No Vacancy',
      vacancyCount: 0,
      message: `No vacancies published for ${cleanDistrict} district in this job posting.`,
      district: cleanDistrict,
      taluka: cleanTaluka,
      postingLevel,
      lastUpdatedAt,
      isReliable: true,
    };
  }

  // 5. Check district allocation block
  const distAllocMap = job.vacancy_allocations?.district_allocations;
  const matchedDistKey = distAllocMap
    ? Object.keys(distAllocMap).find(k => k.trim().toLowerCase() === cleanDistrict.toLowerCase())
    : undefined;
  const distAlloc = matchedDistKey ? distAllocMap![matchedDistKey] : undefined;

  if (distAlloc && distAlloc.included === false) {
    return {
      status: 'No Vacancy',
      vacancyCount: 0,
      message: `${cleanDistrict} district is excluded from this recruitment drive.`,
      district: cleanDistrict,
      taluka: cleanTaluka,
      postingLevel,
      lastUpdatedAt,
      isReliable: true,
    };
  }

  // 6. District-wise Posting Evaluation
  if (isDistrictWise) {
    const explicitCount =
      distAlloc?.calculated_district_total != null
        ? distAlloc.calculated_district_total
        : distAlloc?.override_total != null
        ? distAlloc.override_total
        : job.vacancy_allocations?.default_per_district != null
        ? job.vacancy_allocations.default_per_district
        : job.vacancies_per_district != null
        ? job.vacancies_per_district
        : null;

    if (explicitCount != null && explicitCount > 0) {
      return {
        status: 'Vacancy Available',
        vacancyCount: explicitCount,
        message: `${explicitCount} ${explicitCount === 1 ? 'vacancy' : 'vacancies'} available in ${cleanDistrict} district.`,
        district: cleanDistrict,
        postingLevel,
        lastUpdatedAt,
        isReliable: true,
      };
    } else if (explicitCount === 0) {
      return {
        status: 'No Vacancy',
        vacancyCount: 0,
        message: `Zero vacancies currently allocated for ${cleanDistrict} district.`,
        district: cleanDistrict,
        postingLevel,
        lastUpdatedAt,
        isReliable: true,
      };
    } else {
      // In drive districts, but quota is undetermined
      return {
        status: 'Availability Not Determined',
        vacancyCount: null,
        message: `Vacancy quota count is not determined for ${cleanDistrict} district.`,
        district: cleanDistrict,
        postingLevel,
        lastUpdatedAt,
        isReliable: false,
      };
    }
  }

  // 7. Taluka-wise Posting Evaluation
  if (!cleanTaluka) {
    return {
      status: 'Availability Not Determined',
      vacancyCount: null,
      message: 'Taluka is not specified in residential address for Taluka-wise posting.',
      district: cleanDistrict,
      postingLevel,
      lastUpdatedAt,
      isReliable: false,
    };
  }

  const defaultTalukaRate =
    distAlloc?.per_taluka != null
      ? distAlloc.per_taluka
      : job.vacancy_allocations?.default_per_taluka != null
      ? job.vacancy_allocations.default_per_taluka
      : job.vacancies_per_taluka != null
      ? job.vacancies_per_taluka
      : null;

  const talukaAllocMap = distAlloc?.taluka_allocations;
  const matchedTalukaKey = talukaAllocMap
    ? Object.keys(talukaAllocMap).find(t => t.trim().toLowerCase() === cleanTaluka.toLowerCase())
    : undefined;
  const talukaAlloc = matchedTalukaKey ? talukaAllocMap![matchedTalukaKey] : undefined;

  let ownTalukaIncluded = true;
  let ownTalukaCount: number | null = null;

  if (talukaAlloc) {
    if (talukaAlloc.included === false) {
      ownTalukaIncluded = false;
      ownTalukaCount = 0;
    } else if (talukaAlloc.override_vacancies != null) {
      ownTalukaCount = Math.max(0, talukaAlloc.override_vacancies);
    } else if (talukaAlloc.vacancies != null) {
      ownTalukaCount = Math.max(0, talukaAlloc.vacancies);
    } else if (defaultTalukaRate != null) {
      ownTalukaCount = Math.max(0, defaultTalukaRate);
    }
  } else if (talukaAllocMap && Object.keys(talukaAllocMap).length > 0) {
    // Other talukas explicitly configured in district, but this one is not included
    ownTalukaIncluded = false;
    ownTalukaCount = 0;
  } else if (defaultTalukaRate != null) {
    ownTalukaCount = Math.max(0, defaultTalukaRate);
  }

  // Direct vacancy in candidate's own taluka
  if (ownTalukaIncluded && ownTalukaCount != null && ownTalukaCount > 0) {
    return {
      status: 'Vacancy Available',
      vacancyCount: ownTalukaCount,
      message: `${ownTalukaCount} ${ownTalukaCount === 1 ? 'vacancy' : 'vacancies'} available in your taluka (${cleanTaluka}).`,
      district: cleanDistrict,
      taluka: cleanTaluka,
      postingLevel,
      lastUpdatedAt,
      isReliable: true,
    };
  }

  // Check if vacancies exist in other talukas in the same district
  let otherTalukaCount = 0;
  let hasOtherTalukaAllocation = false;

  if (talukaAllocMap && Object.keys(talukaAllocMap).length > 0) {
    Object.entries(talukaAllocMap).forEach(([tName, tAlloc]) => {
      if (tName.trim().toLowerCase() !== cleanTaluka.toLowerCase() && tAlloc?.included !== false) {
        const v = tAlloc?.override_vacancies ?? tAlloc?.vacancies ?? defaultTalukaRate ?? 0;
        if (v > 0) {
          otherTalukaCount += v;
          hasOtherTalukaAllocation = true;
        }
      }
    });
  } else if (defaultTalukaRate != null && defaultTalukaRate > 0) {
    const allGeoTalukas = getTalukasForDistrict(cleanDistrict);
    const otherTalukas = allGeoTalukas.filter(t => t.trim().toLowerCase() !== cleanTaluka.toLowerCase());
    if (otherTalukas.length > 0) {
      otherTalukaCount = otherTalukas.length * defaultTalukaRate;
      hasOtherTalukaAllocation = true;
    }
  }

  if (hasOtherTalukaAllocation && otherTalukaCount > 0) {
    return {
      status: 'Available in Other Taluka',
      vacancyCount: otherTalukaCount,
      message: `No vacancy in your taluka (${cleanTaluka}), but ${otherTalukaCount} vacancies exist in other talukas within ${cleanDistrict}.`,
      district: cleanDistrict,
      taluka: cleanTaluka,
      postingLevel,
      lastUpdatedAt,
      isReliable: true,
    };
  }

  if (ownTalukaCount === 0 || !ownTalukaIncluded) {
    return {
      status: 'No Vacancy',
      vacancyCount: 0,
      message: `No vacancies currently allocated in ${cleanDistrict} / ${cleanTaluka}.`,
      district: cleanDistrict,
      taluka: cleanTaluka,
      postingLevel,
      lastUpdatedAt,
      isReliable: true,
    };
  }

  return {
    status: 'Availability Not Determined',
    vacancyCount: null,
    message: `Vacancy quota count could not be reliably determined for ${cleanDistrict} / ${cleanTaluka}.`,
    district: cleanDistrict,
    taluka: cleanTaluka,
    postingLevel,
    lastUpdatedAt,
    isReliable: false,
  };
}

/**
 * Resolves the 3-state vacancy status ('AVAILABLE' | 'NO VACANCY' | 'NOT DETERMINED')
 * for any selected preferred district or taluka.
 */
export function getLocationVacancyStatus(
  district: string | undefined | null,
  taluka: string | undefined | null,
  job: RmsJobPosting | null | undefined
): { status: 'AVAILABLE' | 'NO VACANCY' | 'NOT DETERMINED'; count: number | null; message: string } {
  const cleanDistrict = (district || '').trim();
  const cleanTaluka = (taluka || '').trim();

  if (!cleanDistrict || !job || !Array.isArray(job.location_districts) || job.location_districts.length === 0) {
    return { status: 'NOT DETERMINED', count: null, message: 'Vacancy quota information is not published' };
  }

  // 1. Is district in allowed job districts?
  const isDistrictInJob = job.location_districts.some(
    d => d.trim().toLowerCase() === cleanDistrict.toLowerCase()
  );
  if (!isDistrictInJob) {
    return { status: 'NO VACANCY', count: 0, message: 'District is not included in this recruitment drive' };
  }

  const distAllocMap = job.vacancy_allocations?.district_allocations;
  const matchedDistKey = distAllocMap
    ? Object.keys(distAllocMap).find(k => k.trim().toLowerCase() === cleanDistrict.toLowerCase())
    : undefined;
  const distAlloc = matchedDistKey ? distAllocMap![matchedDistKey] : undefined;

  if (distAlloc && distAlloc.included === false) {
    return { status: 'NO VACANCY', count: 0, message: `${cleanDistrict} district is excluded from this drive` };
  }

  // 2. Taluka-level check if taluka specified
  if (cleanTaluka) {
    const talukaAllocMap = distAlloc?.taluka_allocations;
    const matchedTalukaKey = talukaAllocMap
      ? Object.keys(talukaAllocMap).find(k => k.trim().toLowerCase() === cleanTaluka.toLowerCase())
      : undefined;
    const talukaAlloc = matchedTalukaKey ? talukaAllocMap![matchedTalukaKey] : undefined;

    if (talukaAlloc && talukaAlloc.included === false) {
      return { status: 'NO VACANCY', count: 0, message: `${cleanTaluka} taluka is excluded` };
    }

    if (talukaAlloc && talukaAlloc.vacancies != null) {
      const v = Number(talukaAlloc.vacancies);
      if (v > 0) return { status: 'AVAILABLE', count: v, message: `${v} open post${v === 1 ? '' : 's'}` };
      return { status: 'NO VACANCY', count: 0, message: '0 open posts' };
    }

    // Default rate per taluka
    const defaultTaluka =
      distAlloc?.per_taluka != null
        ? Number(distAlloc.per_taluka)
        : job.vacancy_allocations?.default_per_taluka != null
        ? Number(job.vacancy_allocations.default_per_taluka)
        : job.vacancies_per_taluka != null
        ? Number(job.vacancies_per_taluka)
        : null;

    if (defaultTaluka != null) {
      if (defaultTaluka > 0) return { status: 'AVAILABLE', count: defaultTaluka, message: `${defaultTaluka} open post${defaultTaluka === 1 ? '' : 's'}` };
      return { status: 'NO VACANCY', count: 0, message: '0 open posts' };
    }

    return { status: 'NOT DETERMINED', count: null, message: 'Taluka quota not determined' };
  }

  // 3. District-level check (when taluka is not specified)
  const explicitDistrictCount =
    distAlloc?.calculated_district_total != null
      ? Number(distAlloc.calculated_district_total)
      : distAlloc?.override_total != null
      ? Number(distAlloc.override_total)
      : job.vacancy_allocations?.default_per_district != null
      ? Number(job.vacancy_allocations.default_per_district)
      : job.vacancies_per_district != null
      ? Number(job.vacancies_per_district)
      : null;

  if (explicitDistrictCount != null) {
    if (explicitDistrictCount > 0) {
      return { status: 'AVAILABLE', count: explicitDistrictCount, message: `${explicitDistrictCount} open post${explicitDistrictCount === 1 ? '' : 's'}` };
    }
    return { status: 'NO VACANCY', count: 0, message: '0 open posts' };
  }

  return { status: 'NOT DETERMINED', count: null, message: 'District quota not determined' };
}
