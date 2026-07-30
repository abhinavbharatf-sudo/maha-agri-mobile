/**
 * IMasterRepository Interface Contract
 * Abstract interface for reading and writing Enterprise Master Data without vendor lock-in.
 */

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

export interface IMasterRepository {
  // Organizations
  getOrganizations(): Promise<Organization[]>;
  
  // Geography Hierarchy
  getCountries(): Promise<Country[]>;
  getStates(countryId?: string): Promise<State[]>;
  getRegions(stateId?: string): Promise<Region[]>;
  getDistricts(stateId?: string, regionId?: string): Promise<District[]>;
  getTalukas(districtId?: string): Promise<Taluka[]>;
  getVillages(talukaId?: string): Promise<Village[]>;

  // Projects & Services
  getProjects(organizationId?: string): Promise<Project[]>;
  getServices(): Promise<ServiceMaster[]>;

  // Lookups Engine
  getLookupCategories(): Promise<LookupCategory[]>;
  getLookupValues(categoryKey: string): Promise<LookupValue[]>;

  // Document Types & Payment Methods
  getDocumentTypes(): Promise<DocumentTypeMaster[]>;
  getPaymentMethods(): Promise<PaymentMethodMaster[]>;

  // Settings & Financial Years
  getSystemSettings(): Promise<SystemSetting[]>;
  getFinancialYears(): Promise<FinancialYear[]>;

  // Notification Templates
  getNotificationTemplates(): Promise<NotificationTemplateMaster[]>;
}
