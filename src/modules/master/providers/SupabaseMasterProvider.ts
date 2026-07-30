/**
 * SupabaseMasterProvider
 * Supabase implementation of IMasterRepository.
 * Strictly isolated to Provider Layer for complete vendor lock-in protection.
 */

import type { IMasterRepository } from '../repositories/IMasterRepository';
import type {
  Organization,
  Country,
  State,
  Region,
  District,
  Taluka,
  Village,
  Project,
  ServiceMaster,
  LookupCategory,
  LookupValue,
  DocumentTypeMaster,
  PaymentMethodMaster,
  SystemSetting,
  FinancialYear,
  NotificationTemplateMaster,
} from '../types/master.types';
import { supabase } from '../../../lib/supabase/client';

export class SupabaseMasterProvider implements IMasterRepository {
  async getOrganizations(): Promise<Organization[]> {
    try {
      const { data, error } = await supabase
        .from('organizations' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('name' as never, { ascending: true });

      if (error || !data) return [];
      return data as unknown as Organization[];
    } catch {
      return [];
    }
  }

  async getCountries(): Promise<Country[]> {
    try {
      const { data } = await supabase
        .from('countries' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('name' as never, { ascending: true });
      return (data as unknown as Country[]) ?? [];
    } catch {
      return [];
    }
  }

  async getStates(countryId?: string): Promise<State[]> {
    try {
      let q = supabase
        .from('states' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('name' as never, { ascending: true });

      if (countryId) q = q.eq('country_id' as never, countryId);

      const { data } = await q;
      return (data as unknown as State[]) ?? [];
    } catch {
      return [];
    }
  }

  async getRegions(stateId?: string): Promise<Region[]> {
    try {
      let q = supabase
        .from('regions' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('name' as never, { ascending: true });

      if (stateId) q = q.eq('state_id' as never, stateId);

      const { data } = await q;
      return (data as unknown as Region[]) ?? [];
    } catch {
      return [];
    }
  }

  async getDistricts(stateId?: string, regionId?: string): Promise<District[]> {
    try {
      let q = supabase
        .from('districts' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('name' as never, { ascending: true });

      if (stateId) q = q.eq('state_id' as never, stateId);
      if (regionId) q = q.eq('region_id' as never, regionId);

      const { data } = await q;
      return (data as unknown as District[]) ?? [];
    } catch {
      return [];
    }
  }

  async getTalukas(districtId?: string): Promise<Taluka[]> {
    try {
      let q = supabase
        .from('talukas' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('name' as never, { ascending: true });

      if (districtId) q = q.eq('district_id' as never, districtId);

      const { data } = await q;
      return (data as unknown as Taluka[]) ?? [];
    } catch {
      return [];
    }
  }

  async getVillages(talukaId?: string): Promise<Village[]> {
    try {
      let q = supabase
        .from('villages' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('village_name' as never, { ascending: true });

      if (talukaId) q = q.eq('taluka_id' as never, talukaId);

      const { data } = await q;
      return (data as unknown as Village[]) ?? [];
    } catch {
      return [];
    }
  }

  async getProjects(organizationId?: string): Promise<Project[]> {
    try {
      let q = supabase
        .from('projects' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('project_name' as never, { ascending: true });

      if (organizationId) q = q.eq('organization_id' as never, organizationId);

      const { data } = await q;
      return (data as unknown as Project[]) ?? [];
    } catch {
      return [];
    }
  }

  async getServices(): Promise<ServiceMaster[]> {
    try {
      const { data } = await supabase
        .from('services' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .eq('is_active' as never, true)
        .order('service_name' as never, { ascending: true });

      return (data as unknown as ServiceMaster[]) ?? [];
    } catch {
      return [];
    }
  }

  async getLookupCategories(): Promise<LookupCategory[]> {
    try {
      const { data } = await supabase
        .from('lookup_categories' as never)
        .select('*' as never)
        .order('name' as never, { ascending: true });
      return (data as unknown as LookupCategory[]) ?? [];
    } catch {
      return [];
    }
  }

  async getLookupValues(categoryKey: string): Promise<LookupValue[]> {
    try {
      const { data: cat } = await supabase
        .from('lookup_categories' as never)
        .select('id' as never)
        .eq('category_key' as never, categoryKey.toUpperCase())
        .maybeSingle();

      if (!cat) return [];

      const { data } = await supabase
        .from('lookup_values' as never)
        .select('*' as never)
        .eq('category_id' as never, (cat as { id: string }).id)
        .is('deleted_at' as never, null)
        .eq('is_active' as never, true)
        .order('display_order' as never, { ascending: true });

      return (data as unknown as LookupValue[]) ?? [];
    } catch {
      return [];
    }
  }

  async getDocumentTypes(): Promise<DocumentTypeMaster[]> {
    try {
      const { data } = await supabase
        .from('document_types' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .eq('is_active' as never, true)
        .order('name' as never, { ascending: true });

      return (data as unknown as DocumentTypeMaster[]) ?? [];
    } catch {
      return [];
    }
  }

  async getPaymentMethods(): Promise<PaymentMethodMaster[]> {
    try {
      const { data } = await supabase
        .from('payment_methods' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .eq('is_active' as never, true)
        .order('name' as never, { ascending: true });

      return (data as unknown as PaymentMethodMaster[]) ?? [];
    } catch {
      return [];
    }
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    try {
      const { data } = await supabase
        .from('system_settings' as never)
        .select('*' as never);

      return (data as unknown as SystemSetting[]) ?? [];
    } catch {
      return [];
    }
  }

  async getFinancialYears(): Promise<FinancialYear[]> {
    try {
      const { data } = await supabase
        .from('financial_years' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('start_date' as never, { ascending: false });

      return (data as unknown as FinancialYear[]) ?? [];
    } catch {
      return [];
    }
  }

  async getNotificationTemplates(): Promise<NotificationTemplateMaster[]> {
    try {
      const { data } = await supabase
        .from('notification_templates' as never)
        .select('*' as never)
        .is('deleted_at' as never, null)
        .order('template_name' as never, { ascending: true });

      return (data as unknown as NotificationTemplateMaster[]) ?? [];
    } catch {
      return [];
    }
  }
}

export const defaultMasterProvider = new SupabaseMasterProvider();
