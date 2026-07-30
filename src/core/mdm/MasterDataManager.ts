/**
 * Phase 2 Foundation Service 5: Master Data Management (MDM) Engine
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Centralized master data registry for Geographies (State/Region/District/Taluka/Village),
 * Departments, Designations, Crops, Soil Types, Document Categories, and Notification Templates.
 */

export interface GeographyItem {
  id: string;
  name: string;
  code: string;
  type: 'STATE' | 'REGION' | 'DISTRICT' | 'TALUKA' | 'VILLAGE';
  parentId?: string;
}

export interface CropMasterItem {
  id: string;
  name: string;
  season: 'KHARIF' | 'RABI' | 'ZAID';
  category: 'CEREALS' | 'PULSES' | 'OILSEEDS' | 'CASH_CROPS' | 'HORTICULTURE';
  recommendedNpk: string;
}

export interface SoilTypeMasterItem {
  id: string;
  soilName: string;
  phRange: string;
  suitableCrops: string[];
}

export class MasterDataManagerService {
  private geographies: GeographyItem[] = [
    { id: 'geo-mh', name: 'Maharashtra', code: 'MH', type: 'STATE' },
    { id: 'geo-reg-vid', name: 'Vidarbha Region', code: 'VID', type: 'REGION', parentId: 'geo-mh' },
    { id: 'geo-reg-mar', name: 'Marathwada Region', code: 'MAR', type: 'REGION', parentId: 'geo-mh' },
    { id: 'geo-dst-ngp', name: 'Nagpur District', code: 'NGP', type: 'DISTRICT', parentId: 'geo-reg-vid' },
    { id: 'geo-dst-wrd', name: 'Wardha District', code: 'WRD', type: 'DISTRICT', parentId: 'geo-reg-vid' },
    { id: 'geo-tal-hng', name: 'Hinganghat Taluka', code: 'HNG', type: 'TALUKA', parentId: 'geo-dst-wrd' },
    { id: 'geo-vlg-svg', name: 'Sevagram Village', code: 'SVG', type: 'VILLAGE', parentId: 'geo-tal-hng' },
  ];

  private crops: CropMasterItem[] = [
    { id: 'crop-cotton', name: 'Cotton (कापूस)', season: 'KHARIF', category: 'CASH_CROPS', recommendedNpk: '100:50:50' },
    { id: 'crop-soybean', name: 'Soybean (सोयाबीन)', season: 'KHARIF', category: 'OILSEEDS', recommendedNpk: '30:75:30' },
    { id: 'crop-wheat', name: 'Wheat (गहू)', season: 'RABI', category: 'CEREALS', recommendedNpk: '120:60:40' },
    { id: 'crop-tur', name: 'Pigeon Pea (तूर)', season: 'KHARIF', category: 'PULSES', recommendedNpk: '25:50:25' },
  ];

  private soilTypes: SoilTypeMasterItem[] = [
    { id: 'soil-black-cotton', soilName: 'Deep Black Cotton Soil (काळी माती)', phRange: '7.5 - 8.5', suitableCrops: ['Cotton', 'Soybean', 'Wheat'] },
    { id: 'soil-red-laterite', soilName: 'Red Laterite Soil (तांबडी माती)', phRange: '5.5 - 6.5', suitableCrops: ['Horticulture', 'Cashew'] },
  ];

  public getGeographies(type?: string): GeographyItem[] {
    if (!type) return this.geographies;
    return this.geographies.filter((g) => g.type === type);
  }

  public getCrops(): CropMasterItem[] {
    return this.crops;
  }

  public getSoilTypes(): SoilTypeMasterItem[] {
    return this.soilTypes;
  }

  public addCrop(crop: Omit<CropMasterItem, 'id'>): CropMasterItem {
    const entry: CropMasterItem = {
      ...crop,
      id: `crop-${Date.now()}`,
    };
    this.crops.push(entry);
    return entry;
  }
}

export const MasterDataManager = new MasterDataManagerService();
