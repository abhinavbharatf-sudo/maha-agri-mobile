/**
 * MasterDataService
 * Business logic layer for Master Data Management with in-memory caching support.
 */

import type { IMasterRepository } from '../repositories/IMasterRepository';
import { defaultMasterProvider } from '../providers/SupabaseMasterProvider';
import type {
  LookupValue,
  State,
  District,
  Taluka,
  Village,
  Project,
  ServiceMaster,
  DocumentTypeMaster,
  PaymentMethodMaster,
  SystemSetting,
} from '../types/master.types';

export class MasterDataService {
  private cache = new Map<string, { data: unknown; timestamp: number }>();
  private cacheTTLMs = 5 * 60 * 1000; // 5 minutes cache TTL

  constructor(private repo: IMasterRepository = defaultMasterProvider) {}

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    if (Date.now() - cached.timestamp > this.cacheTTLMs) {
      this.cache.delete(key);
      return null;
    }
    return cached.data as T;
  }

  private setCache<T>(key: string, data: T): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  clearCache(): void {
    this.cache.clear();
  }

  async getLookupValues(categoryKey: string): Promise<LookupValue[]> {
    const cacheKey = `lookup_${categoryKey.toUpperCase()}`;
    const cached = this.getFromCache<LookupValue[]>(cacheKey);
    if (cached) return cached;

    const values = await this.repo.getLookupValues(categoryKey);
    this.setCache(cacheKey, values);
    return values;
  }

  async getStates(): Promise<State[]> {
    const cacheKey = 'geography_states';
    const cached = this.getFromCache<State[]>(cacheKey);
    if (cached) return cached;

    const states = await this.repo.getStates();
    this.setCache(cacheKey, states);
    return states;
  }

  async getDistricts(stateId?: string): Promise<District[]> {
    const cacheKey = `geography_districts_${stateId ?? 'all'}`;
    const cached = this.getFromCache<District[]>(cacheKey);
    if (cached) return cached;

    const districts = await this.repo.getDistricts(stateId);
    this.setCache(cacheKey, districts);
    return districts;
  }

  async getTalukas(districtId?: string): Promise<Taluka[]> {
    const cacheKey = `geography_talukas_${districtId ?? 'all'}`;
    const cached = this.getFromCache<Taluka[]>(cacheKey);
    if (cached) return cached;

    const talukas = await this.repo.getTalukas(districtId);
    this.setCache(cacheKey, talukas);
    return talukas;
  }

  async getVillages(talukaId?: string): Promise<Village[]> {
    const cacheKey = `geography_villages_${talukaId ?? 'all'}`;
    const cached = this.getFromCache<Village[]>(cacheKey);
    if (cached) return cached;

    const villages = await this.repo.getVillages(talukaId);
    this.setCache(cacheKey, villages);
    return villages;
  }

  async getProjects(organizationId?: string): Promise<Project[]> {
    return this.repo.getProjects(organizationId);
  }

  async getServices(): Promise<ServiceMaster[]> {
    const cacheKey = 'master_services';
    const cached = this.getFromCache<ServiceMaster[]>(cacheKey);
    if (cached) return cached;

    const services = await this.repo.getServices();
    this.setCache(cacheKey, services);
    return services;
  }

  async getDocumentTypes(): Promise<DocumentTypeMaster[]> {
    const cacheKey = 'master_document_types';
    const cached = this.getFromCache<DocumentTypeMaster[]>(cacheKey);
    if (cached) return cached;

    const docTypes = await this.repo.getDocumentTypes();
    this.setCache(cacheKey, docTypes);
    return docTypes;
  }

  async getPaymentMethods(): Promise<PaymentMethodMaster[]> {
    const cacheKey = 'master_payment_methods';
    const cached = this.getFromCache<PaymentMethodMaster[]>(cacheKey);
    if (cached) return cached;

    const methods = await this.repo.getPaymentMethods();
    this.setCache(cacheKey, methods);
    return methods;
  }

  async getSystemSettings(): Promise<SystemSetting[]> {
    const cacheKey = 'master_system_settings';
    const cached = this.getFromCache<SystemSetting[]>(cacheKey);
    if (cached) return cached;

    const settings = await this.repo.getSystemSettings();
    this.setCache(cacheKey, settings);
    return settings;
  }
}

export const masterDataService = new MasterDataService();
