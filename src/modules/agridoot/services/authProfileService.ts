/**
 * MAHA-AGRIDOOT Authentication & Profile Service
 * Provides complete authentication, OTP simulation, Aadhaar check,
 * Maharashtra geography lookup, profile draft persistence, and validations.
 */

export interface ProfileData {
  profileId: string;
  mobile: string;
  name: string;
  registrationType: 'farmer' | 'entrepreneur' | 'both';
  district: string;
  taluka: string;
  village: string;
  aadhaar?: string;
  casteCategory?: string;
  dob?: string;
  farmerDetails?: FarmerRegistrationData;
  createdAt: string;
}

export interface GatSurveyParcel {
  gatNumber: string;
  area: string;
  areaUnit: 'Acre' | 'Hectare' | 'Guntha';
}

export interface FarmerRegistrationData {
  farmingType: 'Rainfed' | 'Irrigated' | 'Mixed';
  farmingExperienceYears: number;
  hasFarmerId: 'Yes' | 'No' | "Don't Know";
  farmerId?: string;
  govtAgriStackFarmerId?: string;
  totalLand: number;
  landUnit: 'Acre' | 'Hectare' | 'Guntha' | 'Bigha';
  farmerCategory?: 'Small Farmer' | 'Marginal Farmer' | 'Large Farmer';
  landOwnershipStatus: 'Own Land' | 'Lease / Tenant Land' | 'Family Shared Land' | 'Government Allocated Land' | 'Other';
  landOwnershipOther?: string;
  surveyGatNumbers?: string[];
  gatSurveyParcels?: GatSurveyParcel[];
  mainCrops?: string[];
  cropDetails?: Record<string, { season: string; approxArea: string }>;
  soilType?: string;
  waterSources?: string[];
  irrigationSystems?: string[];
  farmElectricity?: 'Yes' | 'No' | "Don't Know";
  electricityConnectionType?: string;
  powerStatus?: string;
  solarRequirement?: 'Yes' | 'No' | 'Need Information';
  solarRequirementType?: string;
  machineryOwned?: string[];
  currentFarmingPractice?: string;
  infrastructure?: string[];
  powerConnection?: string;
  fertilizerUsage?: Record<string, boolean>;
  fertilizerQuantities?: Record<string, string>;
  schemesReceived?: string[];
  activeSchemesList?: string[];
  activeSchemeOther?: string;
  subsidyHelpNeeded?: 'Yes' | 'No' | 'Need Information';
  subsidyHelpCategories?: string[];
  futureMachinery?: string[];
  futureIrrigation?: string[];
  futureInfrastructure?: string[];
  futureAlliedAgri?: string[];
  mainProblemsList?: string[];
  mainProblemOther?: string;
  bankName?: string;
  bankAccountNumber?: string;
  ifscCode?: string;
  interestedServices?: string[];
  interestedServiceOther?: string;
  servicePriorities?: Record<string, 'Immediate' | 'This Season' | 'Future'>;
}

export interface Phase1ProfilePayload {
  fullName: string;
  dob: string;
  age: number;
  gender: 'Male' | 'Female' | 'Other';
  aadhaar: string;
  casteCategory: string;
  casteCategoryOther?: string;
  whatsappMobile: string;
  alternateMobile?: string;
  email?: string;
  state: string;
  district: string;
  taluka: string;
  village: string;
  pinCode: string;
  registrationType: 'farmer' | 'entrepreneur' | 'both';
  farmerDetails?: FarmerRegistrationData;
}

export const DEFAULT_FARMER_DETAILS: FarmerRegistrationData = {
  farmingType: 'Rainfed',
  farmingExperienceYears: 10,
  hasFarmerId: 'Yes',
  farmerId: 'MH-FAR-2026-8841',
  totalLand: 3.5,
  landUnit: 'Acre',
  farmerCategory: 'Small Farmer',
  landOwnershipStatus: 'Own Land',
  surveyGatNumbers: ['45/1', '45/2'],
  mainCrops: ['Cotton', 'Soybean'],
  soilType: 'Black Cotton Soil',
  waterSources: ['Borewell', 'Well'],
  currentFarmingPractice: 'Conventional / Chemical',
  infrastructure: ['Tractor', 'Pump Set'],
  powerConnection: 'Agricultural Connection',
  fertilizerUsage: { 'Urea': true, 'DAP': true },
  fertilizerQuantities: { 'Urea': '2 Bags', 'DAP': '1 Bag' },
  schemesReceived: ['PM-Kisan', 'Crop Insurance'],
  bankName: 'State Bank of India',
  bankAccountNumber: '38491029481',
  ifscCode: 'SBIN0001234',
  interestedServices: ['Soil Testing', 'Drone Spraying']
};

export const MAHARASHTRA_DISTRICTS = [
  'Ahmednagar', 'Akola', 'Amravati', 'Chhatrapati Sambhajinagar (Aurangabad)',
  'Beed', 'Bhandara', 'Buldhana', 'Chandrapur', 'Dharashiv (Osmanabad)',
  'Dhule', 'Gadchiroli', 'Gondia', 'Hingoli', 'Jalgaon', 'Jalna',
  'Kolhapur', 'Latur', 'Mumbai City', 'Mumbai Suburban', 'Nagpur',
  'Nanded', 'Nandurbar', 'Nashik', 'Palghar', 'Parbhani', 'Pune',
  'Raigad', 'Ratnagiri', 'Sangli', 'Satara', 'Sindhudurg', 'Solapur',
  'Thane', 'Wardha', 'Washim', 'Yavatmal'
];

const TALUKA_MAP: Record<string, string[]> = {
  'Wardha': ['Wardha', 'Arvi', 'Ashti', 'Hinganghat', 'Karanja', 'Deoli', 'Seloo', 'Samudrapur'],
  'Nagpur': ['Nagpur Urban', 'Nagpur Rural', 'Kamptee', 'Hingna', 'Katol', 'Narkhed', 'Savner', 'Kalameshwar', 'Ramtek', 'Parseoni', 'Mouda', 'Umred', 'Kuhi', 'Bhiwapur'],
  'Amravati': ['Amravati', 'Bhatkuli', 'Nandgaon Khandeshwar', 'Chandur Railway', 'Dhamangaon Railway', 'Morshi', 'Warud', 'Achalpur', 'Chandurbazar', 'Anjangaon Surji', 'Daryapur', 'Chikhaldara', 'Dharni'],
  'Pune': ['Pune City', 'Haveli', 'Khed', 'Baramati', 'Junnar', 'Shirur', 'Ambegaon', 'Indapur', 'Daund', 'Purandar', 'Bhor', 'Velhe', 'Mulshi', 'Maval'],
  'Nashik': ['Nashik', 'Sinnar', 'Igatpuri', 'Dindori', 'Peth', 'Trimbakeshwar', 'Kalwan', 'Deola', 'Surgana', 'Baglan (Satana)', 'Malegaon', 'Nandgaon', 'Chandwad', 'Niphad', 'Yeola']
};

export function getTalukasForDistrict(district: string): string[] {
  if (!district) return [];
  return TALUKA_MAP[district] || [district, `${district} North`, `${district} South`, `${district} East`, `${district} West`];
}

// STORAGE KEYS
const STORAGE_KEY_PROFILES = 'maha_agridoot_profiles_v1';
const STORAGE_KEY_DRAFT = 'maha_agridoot_profile_draft';

function getStoredProfiles(): Record<string, ProfileData> {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_PROFILES);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function saveStoredProfiles(profiles: Record<string, ProfileData>): void {
  try {
    localStorage.setItem(STORAGE_KEY_PROFILES, JSON.stringify(profiles));
  } catch (err) {
    console.error('Failed to save profiles to localStorage:', err);
  }
}

// SIMULATED OTP GENERATOR
let mockOtpStore: Record<string, string> = {};

export async function sendOtp(mobile: string): Promise<{ success: boolean; message: string; otp?: string }> {
  await new Promise(r => setTimeout(r, 600));
  const mockOtp = Math.floor(100000 + Math.random() * 900000).toString();
  mockOtpStore[mobile] = mockOtp;
  return {
    success: true,
    message: `OTP sent successfully to +91 ${mobile}`,
    otp: mockOtp
  };
}

export async function verifyOtp(mobile: string, otp: string): Promise<{ success: boolean; message: string }> {
  await new Promise(r => setTimeout(r, 500));
  const expectedOtp = mockOtpStore[mobile] || '123456';
  if (otp === expectedOtp || otp === '123456' || otp === '889900') {
    delete mockOtpStore[mobile];
    return { success: true, message: 'OTP Verified Successfully' };
  }
  return { success: false, message: 'Invalid OTP. Please enter valid 6-digit OTP.' };
}

export async function checkProfile(mobile: string): Promise<{ exists: boolean; profile?: ProfileData }> {
  await new Promise(r => setTimeout(r, 400));
  const profiles = getStoredProfiles();
  if (profiles[mobile]) {
    return { exists: true, profile: profiles[mobile] };
  }
  // DEMO DEFAULT PROFILE FOR SPECIFIC MOBILE
  if (mobile === '9812441088') {
    const demoProfile: ProfileData = {
      profileId: 'MH-DOT-0025',
      mobile: '9812441088',
      name: 'VIKAS PANBUDE',
      registrationType: 'both',
      district: 'Wardha',
      taluka: 'Wardha',
      village: 'PIMPRI',
      aadhaar: '981244108891',
      casteCategory: 'General / Open',
      dob: '1995-05-12',
      farmerDetails: { ...DEFAULT_FARMER_DETAILS },
      createdAt: '2026-08-01T10:00:00Z'
    };
    return { exists: true, profile: demoProfile };
  }
  return { exists: false };
}

export async function createPhase1Profile(payload: Phase1ProfilePayload): Promise<{ success: boolean; profileId: string; message: string }> {
  await new Promise(r => setTimeout(r, 800));
  const profiles = getStoredProfiles();
  const profileId = `MH-DOT-${Math.floor(1000 + Math.random() * 9000)}`;
  const newProfile: ProfileData = {
    profileId,
    mobile: payload.whatsappMobile,
    name: payload.fullName.toUpperCase(),
    registrationType: payload.registrationType,
    district: payload.district,
    taluka: payload.taluka,
    village: payload.village.toUpperCase(),
    aadhaar: payload.aadhaar,
    casteCategory: payload.casteCategory,
    dob: payload.dob,
    farmerDetails: payload.farmerDetails,
    createdAt: new Date().toISOString()
  };
  profiles[payload.whatsappMobile] = newProfile;
  saveStoredProfiles(profiles);
  clearProfileDraft();
  return { success: true, profileId, message: 'Profile created successfully!' };
}

// VALIDATORS
export function validateIndianMobile(mobile: string): boolean {
  return /^[6-9]\d{9}$/.test(mobile);
}

export function validateAadhaarNumber(aadhaar: string): boolean {
  return /^\d{12}$/.test(aadhaar);
}

export function validatePinCode(pin: string): boolean {
  return /^\d{6}$/.test(pin);
}

export function validateEnglishName(name: string): boolean {
  return /^[A-Za-z\s.]{3,60}$/.test(name.trim());
}

export function validateEnglishVillage(village: string): boolean {
  return /^[A-Za-z0-9\s.-]{2,50}$/.test(village.trim());
}

export function validateAlternateMobile(mobile?: string): boolean {
  if (!mobile) return true;
  return /^[6-9]\d{9}$/.test(mobile);
}

export function validateCasteCategory(caste: string, other?: string): boolean {
  if (!caste) return false;
  if (caste === 'Other') return !!other && other.trim().length >= 2;
  return true;
}

export function calculateAgeFromDob(dob: string): number {
  if (!dob) return 0;
  const birth = new Date(dob);
  const now = new Date();
  let age = now.getFullYear() - birth.getFullYear();
  const m = now.getMonth() - birth.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < birth.getDate())) {
    age--;
  }
  return age >= 0 ? age : 0;
}

export function checkDuplicateAadhaar(aadhaar: string, currentMobile: string): { exists: boolean; existingProfile?: ProfileData } {
  if (!aadhaar || aadhaar.length < 12) return { exists: false };
  const profiles = getStoredProfiles();
  for (const mobile in profiles) {
    if (mobile !== currentMobile && profiles[mobile].aadhaar === aadhaar) {
      return { exists: true, existingProfile: profiles[mobile] };
    }
  }
  return { exists: false };
}

export function checkDuplicateMobileFinal(mobile: string): boolean {
  const profiles = getStoredProfiles();
  return !!profiles[mobile];
}

export function generateRandomAadhaar(): string {
  let num = '9';
  for (let i = 0; i < 11; i++) {
    num += Math.floor(Math.random() * 10).toString();
  }
  return num;
}

export function generateRandomMobile(): string {
  const prefixes = ['98', '97', '96', '95', '88', '87', '70'];
  const prefix = prefixes[Math.floor(Math.random() * prefixes.length)];
  let rest = '';
  for (let i = 0; i < 8; i++) {
    rest += Math.floor(Math.random() * 10).toString();
  }
  return prefix + rest;
}

export function deleteTestProfileByMobile(mobile: string): boolean {
  const profiles = getStoredProfiles();
  if (profiles[mobile]) {
    delete profiles[mobile];
    saveStoredProfiles(profiles);
    return true;
  }
  return false;
}

export function saveProfileDraft(draft: Partial<Phase1ProfilePayload>): void {
  try {
    localStorage.setItem(STORAGE_KEY_DRAFT, JSON.stringify(draft));
  } catch {}
}

export function getProfileDraft(): Partial<Phase1ProfilePayload> | null {
  try {
    const raw = localStorage.getItem(STORAGE_KEY_DRAFT);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearProfileDraft(): void {
  try {
    localStorage.removeItem(STORAGE_KEY_DRAFT);
  } catch {}
}

export function maskMobileNumber(mobile: string): string {
  if (!mobile || mobile.length < 10) return mobile;
  return `${mobile.slice(0, 2)}******${mobile.slice(8)}`;
}

export function maskAadhaarNumber(aadhaar?: string): string {
  if (!aadhaar || aadhaar.length < 12) return 'XXXX-XXXX-XXXX';
  return `XXXX-XXXX-${aadhaar.slice(8)}`;
}

export function calculateFarmerCategory(land: number, unit: 'Acre' | 'Hectare' | 'Guntha' | 'Bigha'): 'Small Farmer' | 'Marginal Farmer' | 'Large Farmer' {
  let acres = land;
  if (unit === 'Hectare') acres = land * 2.471;
  else if (unit === 'Guntha') acres = land / 40;
  else if (unit === 'Bigha') acres = land * 0.625;

  if (acres <= 2.5) return 'Marginal Farmer';
  if (acres <= 5.0) return 'Small Farmer';
  return 'Large Farmer';
}

export function validateSurveyGatNumbers(gatStr: string): boolean {
  if (!gatStr) return true;
  return /^[A-Za-z0-9\s/,-]+$/.test(gatStr);
}
