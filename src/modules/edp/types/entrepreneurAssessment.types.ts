/**
 * MAHA-AGRI — Entrepreneur Assessment & Registration Form (Enterprise Edition)
 * TypeScript Types & Data Models with Phase-2 Extended Assessment Parameters
 */

// 1. Education Profile
export type EducationalQualification =
  | '10th Pass'
  | '12th Pass'
  | 'ITI'
  | 'Diploma'
  | 'Graduate'
  | 'Post Graduate'
  | 'Agri Polytechnic'
  | 'Diploma in Agriculture'
  | 'B.Sc Agriculture'
  | 'M.Sc Agriculture'
  | 'B.Tech Agriculture'
  | 'B.Tech Agricultural Engineering'
  | 'Veterinary'
  | 'Other';

export type AgriLicenseType =
  | 'Fertilizer License'
  | 'Seed License'
  | 'Pesticide License'
  | 'Bio-Fertilizer License'
  | 'Plant Protection License'
  | 'None';

export interface EducationProfile {
  qualification: EducationalQualification;
  qualificationOther?: string;
  isStudent: boolean;
  studentDetails?: {
    collegeName: string;
    courseName: string;
    courseNameOther?: string;
    currentYear: string;
    expectedPassingYear?: string;
  };
  hasAgriLicense?: boolean;
  agriLicenses?: AgriLicenseType[];
  
  // Phase 2 Extended Parameters:
  passingYear?: string;
  universityBoard?: string;
  institutionName?: string;
  agriEducationCategory?: 'Agriculture Degree' | 'Agriculture Diploma' | 'Non-Agri Background';
  digitalSkillLevel?: 'No Computer Knowledge' | 'Basic' | 'MS-CIT' | 'Tally ERP' | 'Advanced Office' | 'GIS' | 'Drone Software';
  languagesProficient?: ('Marathi' | 'Hindi' | 'English')[];
  govtPortalExperience?: ('MahaDBT' | 'PM-Kisan' | 'DBT Portal' | 'CSC Portal' | 'None')[];
}

// 2. Current Occupation
export type OccupationType =
  | 'Student'
  | 'Farmer'
  | 'Private Employee'
  | 'Government Employee'
  | 'Business Owner'
  | 'Self Employed'
  | 'Agriculture Professional'
  | 'Housewife'
  | 'Unemployed'
  | 'Other';

export type BusinessCategory =
  | 'Agriculture'
  | 'Retail Shop'
  | 'Trading'
  | 'Service'
  | 'Manufacturing'
  | 'Transport'
  | 'Dairy'
  | 'Poultry'
  | 'Nursery'
  | 'Fertilizer'
  | 'Seed'
  | 'Pesticide'
  | 'Food Processing'
  | 'Other';

export type ExperienceRange =
  | 'Less than 1 Year'
  | '1–3 Years'
  | '3–5 Years'
  | '5–10 Years'
  | 'More than 10 Years';

export type BusinessStatus = 'Active' | 'Closed' | 'Seasonal' | 'Temporarily Closed';

export interface OccupationProfile {
  occupation: OccupationType;
  occupationOther?: string;
  agriProfCategory?: 'Agriculture Officer' | 'Agriculture Consultant' | 'Input Dealer' | 'Agriculture Sales' | 'Extension Worker' | 'Research' | 'NGO' | 'Other';
  agriProfCategoryOther?: string;
  employeeDetails?: {
    organizationName: string;
    designation: string;
    totalJobExperience: ExperienceRange;
  };
  businessDetails?: {
    businessName: string;
    category: BusinessCategory;
    categoryOther?: string;
    agriSubCategory?: 'Input Dealer' | 'Drone' | 'Soil Testing' | 'Dairy' | 'Nursery' | 'Organic' | 'Custom Hiring' | 'Food Processing' | 'Other';
    agriSubCategoryOther?: string;
    experience: ExperienceRange;
    status: BusinessStatus;
  };
  operatedPastBusiness: boolean;
  pastBusinessDetails?: {
    businessType: string;
    yearsOperated: string;
    currentStatus: 'Running' | 'Closed' | 'Sold' | 'Temporarily Closed';
  };

  // Phase 2 Extended Parameters:
  totalWorkExperience?: 'Fresher' | '< 1 Year' | '1–3 Years' | '3–5 Years' | '5+ Years';
  agriExpTypes?: ('Crop Farming' | 'Horticulture' | 'Dairy' | 'Poultry' | 'Fisheries' | 'Agri Machinery' | 'Agri Input Sales' | 'Soil Testing' | 'Consultancy')[];
  annualFamilyIncome?: '< ₹1 Lakh' | '₹1–3 Lakh' | '₹3–5 Lakh' | '> ₹5 Lakh';
  hasGst?: boolean;
  hasUdyam?: boolean;
  hasPan?: boolean;

  // Master V2 Parameters:
  currentMonthlyIncome?: string;
  employmentType?: 'Full Time' | 'Part Time' | 'Seasonal' | 'Contractual';
  businessAnnualTurnover?: string;
  numberOfEmployees?: string;
  gstRegistered?: boolean;
  businessRegistrationType?: string;
  msmeUdyamRegistrations?: string[];
}

// 3. Agriculture Profile
export type AgriActivity =
  | 'Own Farming'
  | 'Family Farming'
  | 'Organic Farming'
  | 'Horticulture'
  | 'Dairy'
  | 'Goat Farming'
  | 'Poultry'
  | 'Fisheries'
  | 'Nursery'
  | 'Custom Hiring'
  | 'Other';

export type GovtSchemeType =
  | 'PM-KISAN'
  | 'MAHA-DBT'
  | 'PoCRA Yojana'
  | 'Farm Mechanization'
  | 'Drip Irrigation'
  | 'Solar Pump'
  | 'Soil Health Card'
  | 'Other';

export interface GatSurveyParcel {
  gatNumber: string;
  area: string;
  areaUnit: 'Acre' | 'Hectare' | 'Guntha';
}

export interface AgricultureProfile {
  isInvolvedInAgri: boolean;
  agriActivities?: AgriActivity[];
  agriActivityOther?: string;
  farmingExperience?: ExperienceRange;
  ownsAgriLand: boolean;
  landOwnership?: 'Self Owned' | 'Family Owned' | 'Leased / Rented' | 'Jointly Owned';
  landUnit?: 'Acre' | 'Hectare' | 'Guntha';
  landDetails?: {
    totalLandArea: string; // Acres
    irrigatedArea: string;
    rainfedArea: string;
    farmDistrict?: string;
    farmTaluka?: string;
    farmVillage?: string;
    gatSurveyNumber?: string;
    gatSurveyParcels?: GatSurveyParcel[];
    surveyGatNumbers?: string[];
  };
  hasFarmerId: boolean;
  isRegisteredMahaDbt: boolean;
  hasReceivedGovtBenefits: boolean;
  govtSchemesReceived?: GovtSchemeType[];
  isFpoMember: boolean;
  fpoName?: string;

  // Phase 2 Extended Parameters:
  cropsCultivated?: ('Cotton' | 'Soybean' | 'Wheat' | 'Paddy' | 'Sugarcane' | 'Vegetables' | 'Fruits' | 'Pulses')[];
  irrigationType?: 'Drip Irrigation' | 'Sprinkler' | 'Flood Irrigation' | 'Rainfed Only';
  soilTestConducted?: boolean;
  lastSoilTestYear?: string;
  machineryOwned?: ('Tractor' | 'Rotavator' | 'Sprayer' | 'Drone' | 'Harvester' | 'Thresher' | 'Power Tiller')[];
  livestockOwned?: ('Dairy Cows/Buffaloes' | 'Goat/Sheep' | 'Poultry' | 'Piggery' | 'None')[];
  farmerCategory?: 'Marginal (< 1 Ha)' | 'Small (1-2 Ha)' | 'Semi-Medium (2-4 Ha)' | 'Medium (4-10 Ha)' | 'Large (> 10 Ha)';

  // V5 Master Parameters:
  landUnit?: 'Acre' | 'Hectare';
  farmerIdNumber?: string;
  dontKnowFarmerId?: boolean;
  helpRetrieveFarmerId?: boolean;
  pmKisanStatus?: 'Active' | 'Stopped' | 'Applied' | 'Rejected';
  govtSchemeOther?: string;
  fpoPosition?: 'Chairman' | 'Vice Chairman' | 'Director' | 'Board Member' | 'CEO' | 'Accountant' | 'Coordinator' | 'Farmer Member' | 'Promoter' | 'Other';
  fpoPositionOther?: string;
  fpoIsBoardMember?: boolean;
  fpoFarmersConnected?: string;
  fpoVillageCoverage?: string;
  fpoYearsAssociated?: string;
  fpoYearJoined?: string;
}

// 4. Agri Drone Awareness & Program Accordions
export type DroneKnowledgeLevel = 'Yes' | 'Somewhat' | 'No';

export type DroneLearnSource =
  | 'MAHA-AGRI'
  | 'Agriculture Department'
  | 'YouTube'
  | 'Facebook'
  | 'WhatsApp'
  | 'Newspaper'
  | 'TV'
  | 'Friend / Relative'
  | 'Farmer'
  | 'Exhibition'
  | 'Other';

export interface AgriDroneAwareness {
  knowsAgriDrones: DroneKnowledgeLevel;
  learnSources?: DroneLearnSource[];
  learnSourceOther?: string;
  attendedTraining: boolean;
  trainingDetails?: {
    instituteName: string;
    trainingYear: string;
    isDgcaApproved: boolean;
    hasCertificate: boolean;
  };
  hasFlownDrone: boolean;
  hasRpc: boolean;

  // Master V2 Parameters:
  droneFlyingHours?: string;
  droneTypesExperienced?: string[];
  previousDroneProjects?: string;
  remotePilotTrainingInstitute?: string;
  certificateNumber?: string;
  certificateValidity?: string;
  droneKnowledgeAreas?: string[];
  expectedDroneUsage?: string[];

  // V5 Master Parameters:
  currentlyOwnsDrone?: boolean;
  ownedDroneDetails?: {
    brand?: string;
    model?: string;
    capacity?: string;
    category?: string;
    yearsOfUsage?: string;
    manufacturer?: 'Garuda Aerospace' | 'IoTechWorld' | 'Marut Drones' | 'General Aeronautics' | 'Asteria Aerospace' | 'Paras Aerospace' | 'John Deere' | 'DJI Agriculture' | 'Other';
    manufacturerOther?: string;
    condition?: 'Operational' | 'Repair Required' | 'Not Working';
  };
  wantsToPurchaseDrone?: boolean;
  purchaseMethod?: 'Full Cash Payment' | 'Bank Loan' | 'MAHA-DBT Subsidy' | 'CMEGP Scheme' | 'PMEGP Scheme' | 'Mixed Finance' | 'Not Decided';
  purchaseTimeline?: 'Immediately' | 'Within 3 Months' | 'Within 6 Months' | 'Within 1 Year';
  loanAppliedStatus?: 'Yes' | 'No';
  schemeAppliedStatus?: 'Already Applied' | 'Planning to Apply' | 'No';
}

// V5.1 EDP WORKSHOP INTERFACE
export interface EdpDroneWorkshop {
  canAttendWorkshop?: 'Yes' | 'No' | 'Maybe';
  cannotAttendReason?: 'Distance' | 'Health' | 'Job' | 'Education' | 'Family' | 'Other';
  cannotAttendReasonOther?: string;
  mandatoryEdpConsent?: 'Yes' | 'No';
  preferredTrainingLocation?: 'Taluka HQ' | 'District HQ' | 'Online (Theory Only)';
  postTrainingPlan?:
    | 'Start My Own Agri Drone Spray Business'
    | 'Work with MAHA-AGRI Drone Service Team'
    | 'Become a Professional Drone Pilot'
    | 'Start a Drone Rental Business'
    | 'Become a Drone Service Partner'
    | 'Work in a Drone Company'
    | 'Still Exploring Opportunities'
    | 'Other';
  postTrainingPlanOther?: string;
  careerPathsInterest?: string[];
  careerPathsInterestOther?: string;
  villagesTargetToServe?: '1–5' | '6–10' | '11–25' | '26–50' | 'More than 50';
  wantsMahaAgriAssistance?: 'Yes' | 'No' | 'Maybe';
  mahaAgriWorkingModel?: 'District Partner' | 'Taluka Partner' | 'Village Service Provider' | 'Project Based' | 'Seasonal Contract' | 'Full Time' | 'Part Time';
  wantsIndependentBusiness?: 'Yes' | 'No';
  independentBusinessTimeline?: 'Immediately' | 'Within 3 Months' | 'Within 6 Months' | 'Within 1 Year' | 'After Training Completion';
  preferredBusinessModel?: 'Individual Entrepreneur' | 'Partnership' | 'FPO Based' | 'Franchise Model' | 'Cooperative Model' | string;
  droneBusinessOperation?: string;
  agreeToCompleteEdpBeforeOnboarding?: 'Yes' | 'No';
}

// 5. Entrepreneur Interest & Dynamic Conditional Modules
export type EntrepreneurProgram =
  | 'Agri Drone Entrepreneur'
  | 'Professional Drone Pilot'
  | 'MAHA-AGRI Krushi Seva Kendra / Agri Service Centre'
  | 'Soil Testing Entrepreneur'
  | 'Nursery'
  | 'Custom Hiring / Farm Machinery Rental'
  | 'Food Processing'
  | 'Dairy'
  | 'Goat Farming'
  | 'Poultry'
  | 'Fisheries'
  | 'Organic Farming'
  | 'FPO Entrepreneur'
  | 'Other'
  | string;

// Module A: Agri Drone Entrepreneur
export interface ModuleADrone {
  droneTraining: boolean;
  dgcaInstituteName?: string;
  hasRpc: boolean;
  flyingExperience: string; // Hours / Flights
  ownershipInterest: 'Own' | 'Lease' | 'Franchise';
  purchasePreference: 'Outright Purchase' | 'Bank Loan' | 'Leasing' | 'Subsidized Scheme';

  // Master V2 Parameters:
  currentDroneOwnership?: boolean;
  droneCategory?: string;
  expectedMonthlyBusiness?: string;
  expectedServiceArea?: string;
  interestedServices?: string[];
  annualMaintenanceWillingness?: boolean;
  teamSizePlanned?: string;
  businessLaunchTimeline?: string;

  // V5 Master Parameters:
  edpWorkshop?: EdpDroneWorkshop;
}

// Module B: MAHA-AGRI Krushi Seva Kendra
export interface ModuleBKrushiSeva {
  agriDegreeVerified: boolean;
  hasAgriLicense: boolean;
  agriInputExperienceYears: ExperienceRange;
  shopAvailability: 'Owned' | 'Rented' | 'Will Acquire';
  interestedServices: string[];

  // Master V2 Parameters:
  existingShopStatus?: string;
  shopAreaSqFt?: string;
  currentLicensesPossessed?: string[];
  storageCapacityTons?: string;
  existingCustomersCount?: string;
  expectedDailyCustomers?: string;
  interestedProductCategories?: string[];
}

// Module C: Soil Testing Entrepreneur
export interface ModuleCSoilTesting {
  hasScienceBackground: boolean;
  hasAgriBackground: boolean;
  soilSampleCollectionExp: boolean;
  labExperience: boolean;
  soilTestingKnowledge: 'Basic' | 'Intermediate' | 'Advanced';

  // Master V2 Parameters:
  collectedSoilSamplesBefore?: boolean;
  interestedMobileLab?: boolean;
  expectedSamplesPerMonth?: string;
  ownVehicleForFieldVisit?: boolean;
  computerInternetAvailability?: boolean;
}

// Module D: Input Business (Seed, Fertilizer, Pesticide)
export interface ModuleDInputBusiness {
  hasExistingLicense: boolean;
  hasExistingShop: boolean;
  dealerExperienceYears: ExperienceRange;
  customerBaseCount: string;
  interestedInNewLicense: boolean;

  // Master V2 Parameters:
  existingDealershipExp?: string;
  dealerNetworkConnections?: string;
  warehouseAvailability?: string;
  deliveryVehicleAvailable?: string;
  monthlySalesTarget?: string;
}

// Module E: FPO Entrepreneur
export interface ModuleEFpo {
  isExistingFpoMember: boolean;
  isBoardMember: boolean;
  farmersConnectedCount: string;
  mobilizationExperience: string;

  // Master V2 Parameters:
  villagesCoveredCount?: string;
  leadershipExperience?: string;
  clusterSize?: string;
  expectedExpansion?: string;
}

// Module F: Agri Consultancy
export interface ModuleFAgriConsultancy {
  hasAgriDegree: boolean;
  consultancyExperienceYears: ExperienceRange;
  areaOfExpertise: ('Agronomy' | 'Pest Management' | 'Soil Science' | 'Horticulture' | 'Organic Farming' | 'Other')[];
  farmersServedCount: string;

  // Master V2 Parameters:
  extensionExperience?: string;
  topicsCovered?: string[];
  digitalAdvisoryExperience?: string[];
}

export interface EntrepreneurInterestProfile {
  selectedPrograms: EntrepreneurProgram[];
  programOther?: string;
  moduleADrone?: ModuleADrone;
  moduleBKrushiSeva?: ModuleBKrushiSeva;
  moduleCSoilTesting?: ModuleCSoilTesting;
  moduleDInputBusiness?: ModuleDInputBusiness;
  moduleEFpo?: ModuleEFpo;
  moduleFAgriConsultancy?: ModuleFAgriConsultancy;

  // Phase 2 Extended Parameters:
  preferredBusinessModel?: 'Self-Owned Enterprise' | 'Franchise/Govt Partnership' | 'FPO Cluster';
  operationalCoverage?: 'Single Village' | 'Gram Panchayat Cluster' | 'Full Taluka' | 'District-Wide';
  workingAvailability?: 'Full Time' | 'Part Time' | 'Weekend Only';
  relocationWillingness?: boolean;
  mandatoryTrainingAcceptance?: boolean;
  preferredTrainingMode?: 'Offline Academy' | 'Online' | 'Hybrid';
  targetGovtSchemes?: ('CMEGP' | 'PMEGP' | 'Mudra Loan' | 'Agriculture Department Scheme' | 'NABARD' | 'Startup India')[];
}

// 6. Investment Capacity
export type InvestmentCapacityRange =
  | 'Up to ₹50,000'
  | '₹50,000–₹1 Lakh'
  | '₹1–2 Lakh'
  | '₹2–5 Lakh'
  | '₹5–10 Lakh'
  | '₹10 Lakh & Above'
  | string;

export type InvestmentSourceType = 'Self' | 'Family' | 'Loan' | 'Investor' | 'Other' | string;

export interface InvestmentProfile {
  capacity: InvestmentCapacityRange;
  source: InvestmentSourceType;
  sourceOther?: string;
  fundingPriority1?: string;
  fundingPriority2?: string;
  preferredFundingAssistance?: string;

  // Master V2 Parameters:
  preferredBusinessInvestment?: string;
  maximumAffordableEmi?: string;
  collateralAvailable?: string;
  expectedFundingReq?: string;
  govtSubsidyRequired?: boolean;
  preferredBank?: string;
}

// 7. Loan & Financial Profile
export type LoanType =
  | 'Home'
  | 'Vehicle'
  | 'Education'
  | 'Agriculture'
  | 'Business'
  | 'Gold'
  | 'Personal'
  | 'Other';

export type GovtLoanScheme =
  | 'CMEGP'
  | 'PMEGP'
  | 'PMFME'
  | 'Mudra'
  | 'NABARD'
  | 'Stand-Up India'
  | 'Startup India'
  | 'Other';

export type CibilScoreRange =
  | 'Below 600'
  | '600–650'
  | '650–700'
  | '700–750'
  | 'Above 750'
  | 'Don\'t Know';

export interface FinancialProfile {
  hasRunningLoan: boolean;
  runningLoanTypes?: LoanType[];
  monthlyEmiObligation?: string;
  hasGovtLoan: boolean;
  govtLoanDetails?: {
    scheme: GovtLoanScheme;
    status: 'Running' | 'Closed' | 'Rejected' | 'Approved';
  };
  cibilScore: CibilScoreRange;
  bankAccountType?: 'Savings Account' | 'Current Account' | 'Overdraft (OD) Account' | 'Business Account';
  hasCmegpBenefit?: 'Yes' | 'No' | 'Not Sure';
  hasMahaDbtAgriMachineryBenefit?: 'Yes' | 'No' | 'Not Sure';
  hasOtherGovtSchemeBenefit?: 'Yes' | 'No' | 'Not Sure';
  otherGovtSchemeName?: string;

  // Phase 2 Extended Parameters:
  primaryFundingSource?: 'Own Savings' | 'Bank Loan (Mudra/CGS)' | 'Govt Subsidy Scheme' | 'Family/Private Loan';
  existingLoans?: 'No Existing Loan' | 'Crop Loan Only' | 'Personal/Vehicle Loan' | 'Business Loan';
  monthlyEmiBurden?: 'No EMI' | '< ₹5,000' | '₹5,000–15,000' | '> ₹15,000';
  bankingAccounts?: ('Savings Account' | 'Current Account' | 'Cash Credit (CC)')[];
  digitalPaymentModes?: ('UPI App' | 'POS Machine' | 'QR Code Display' | 'Net Banking')[];
  financialDocs?: ('ITR Returns' | 'GST Returns' | '6-Month Bank Statement' | 'Balance Sheet')[];
  hasInsurance?: boolean;
  creditHistoryRating?: 'Clean History' | 'Minor Delay' | 'Default/Settled' | 'No Credit History';

  // Master V2 Parameters:
  existingLoanAmount?: string;
  loanOutstanding?: string;
  bankNamePrimary?: string;
  incomeTaxFiled?: boolean;
  gstFiled?: boolean;
  panAvailable?: boolean;
  aadhaarLinkedBank?: boolean;
  creditHistory?: string;
}

// 8. Infrastructure & Resources
export type InfrastructureResource =
  | 'Office'
  | 'Shop'
  | 'Godown'
  | 'Computer'
  | 'Laptop'
  | 'Printer'
  | 'Internet'
  | 'Smart Phone'
  | 'Two Wheeler'
  | 'Four Wheeler'
  | 'Tractor'
  | 'Power Supply'
  | 'Other';

export interface InfrastructureProfile {
  resources: InfrastructureResource[];
  resourceOther?: string;
}

// 9. Declaration
export interface DeclarationProfile {
  isInformationTrue: boolean;
  understandsNoGuarantee: boolean;
  agreesToAssessmentProcess: boolean;
  applicantName: string;
  declarationDate: string;
}

// COMPLETE ENTREPRENEUR ASSESSMENT PAYLOAD
export interface EntrepreneurAssessmentFormData {
  candidateId?: string;
  fullName: string;
  mobileNumber: string;
  email: string;
  district: string;
  taluka: string;
  village: string;
  
  education: EducationProfile;
  occupation: OccupationProfile;
  agriculture: AgricultureProfile;
  agriDrone: AgriDroneAwareness;
  entrepreneurInterest: EntrepreneurInterestProfile;
  investment: InvestmentProfile;
  financial: FinancialProfile;
  infrastructure: InfrastructureProfile;
  declaration: DeclarationProfile;
  
  currentStep: number;
  lastUpdated: string;
  isDraft: boolean;
}

// 10. V3 ENTERPRISE DECISION SUPPORT SYSTEM (EDSS) INTELLIGENCE MODEL
export interface V3ProgramEligibilityItem {
  programName: string;
  status: 'Eligible' | 'Conditionally Eligible' | 'Currently Not Eligible';
  reason: string;
}

export interface V3GovtSchemeItem {
  schemeName: string;
  priority: 'High' | 'Medium' | 'Low';
  reason: string;
  expectedBenefits: string;
  confidenceScore: number; // 0–100%
}

export interface V3TrainingNeedItem {
  moduleName: string;
  priority: 'High' | 'Medium' | 'Optional';
  duration: string;
}

export interface V3PersonalizedRoadmapStep {
  stepNumber: number;
  title: string;
  priority: 'High' | 'Medium' | 'Low';
  duration: string;
  expectedOutcome: string;
}

export interface V3IntelligenceReport {
  readinessScore: number; // 0–100
  readinessLevel: 'Excellent' | 'Very Good' | 'Good' | 'Average' | 'Needs Improvement';
  strengths: string[];
  weaknesses: string[];
  improvements: string[];

  programEligibility: V3ProgramEligibilityItem[];
  recommendedSchemes: V3GovtSchemeItem[];
  
  riskAnalysis: {
    businessRisk: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
    financialRisk: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
    investmentRisk: 'Very Low' | 'Low' | 'Moderate' | 'High' | 'Very High';
    techReadiness: 'High' | 'Moderate' | 'Low';
    marketReadiness: 'High' | 'Moderate' | 'Low';
    recommendations: string[];
  };

  businessSuitability: {
    primaryRecommendation: string;
    primaryReason: string;
    secondaryRecommendation: string;
    secondaryReason: string;
    alternativeOpportunity: string;
    alternativeReason: string;
  };

  successProbability: {
    probabilityScore: number; // 0–100%
    sustainability: 'High' | 'Moderate' | 'Developing';
    growthPotential: 'High' | 'Moderate' | 'Steady';
    scalability: 'Statewide' | 'District-Level' | 'Local Taluka';
    employmentPotential: string; // e.g. "3-5 Local Jobs"
  };

  trainingNeeds: V3TrainingNeedItem[];

  fundingReadiness: {
    loanReadiness: 'High' | 'Moderate' | 'Low';
    subsidyReadiness: 'High' | 'Moderate' | 'Low';
    bankFinanceReadiness: 'Eligible' | 'Needs Co-applicant' | 'Subsidized Scheme Preferred';
    recommendedFundingModel: 'Self-Funded' | 'Bank Loan' | 'Govt Subsidy' | 'Mixed Hybrid Model';
  };

  personalizedRoadmap: V3PersonalizedRoadmapStep[];

  applicationQuality: {
    rating: 'Excellent' | 'Very Good' | 'Good' | 'Needs Attention';
    missingFieldsCount: number;
    weakSections: string[];
  };

  interviewRecommendation: {
    action: 'Direct Approval' | 'Fast Track Approval' | 'Interview Required' | 'Training Required Before Approval' | 'Reapply After Improvement';
    reasoning: string;
  };

  adminAnalyticsModel: {
    district: string;
    taluka: string;
    educationLevel: string;
    occupationCategory: string;
    investmentCategory: string;
    readinessBand: string;
    riskProfile: string;
  };
}

// 11. V4 ENTERPRISE WORKFLOW & DATA QUALITY MODEL
export type AssessmentLifecycleStatus =
  | 'Draft'
  | 'In Progress'
  | 'Completed'
  | 'Submitted'
  | 'Under Review'
  | 'Approved'
  | 'Rejected'
  | 'Training Recommended'
  | 'Interview Scheduled'
  | 'On Hold';

export interface StatusTimelineEntry {
  status: AssessmentLifecycleStatus;
  timestamp: string;
  remarks: string;
  updatedBy: string;
}

export interface AssessmentVersionRecord {
  version: number;
  savedAt: string;
  data: EntrepreneurAssessmentFormData;
  changeSummary?: string;
}

export interface ExplainableRecommendationItem {
  recommendationName: string;
  confidenceLevel: 'High Confidence' | 'Medium Confidence' | 'Low Confidence';
  confidenceScore: number; // 0–100%
  reasons: string[];
}

export interface CentralScoringResult {
  readinessScore: number; // 0–100
  dataCompletenessScore: number; // 0–100
  riskScore: number; // 0–100
  successProbabilityScore: number; // 0–100
  fundingReadinessScore: number; // 0–100
  missingDataReasons: string[];
}

export interface SearchableAssessmentMetadata {
  district: string;
  taluka: string;
  village: string;
  programInterest: string[];
  readinessBand: string;
  riskBand: string;
  primaryRecommendation: string;
  versionTag: string;
}

export interface AnalyticsEventLog {
  eventName: 'ASSESSMENT_STARTED' | 'STEP_COMPLETED' | 'DRAFT_SAVED' | 'RECOMMENDATION_GENERATED' | 'ASSESSMENT_SUBMITTED';
  timestamp: string;
  stepId?: number;
  mobileNumber?: string;
  payload?: Record<string, any>;
}

export interface ExportableAssessmentJson {
  candidateProfile: {
    candidateId: string;
    fullName: string;
    mobileNumber: string;
    email: string;
    district: string;
    taluka: string;
    village: string;
  };
  assessmentResponses: EntrepreneurAssessmentFormData;
  centralScores: CentralScoringResult;
  explainableRecommendations: ExplainableRecommendationItem[];
  v3Intelligence: V3IntelligenceReport;
  statusTimeline: StatusTimelineEntry[];
  searchableMetadata: SearchableAssessmentMetadata;
  versionHistory: Array<{ version: number; savedAt: string }>;
  aiModelRecommendationPlaceholder?: {
    modelName: string;
    predictedSuccessProbability: number;
    recommendedProgram: string;
  };
}

// HIDDEN ADMIN ASSESSMENT ENGINE METRICS (INTERNAL CALCULATIONS)
export interface InternalAdminAssessmentScores {
  candidateAssessmentScore: number; // 0–100
  agricultureBackgroundScore: number; // 0–100
  businessReadinessScore: number; // 0–100
  financialReadinessScore: number; // 0–100
  agriDroneReadinessScore: number; // 0–100
  
  krushiSevaKendraligibility: 'Eligible' | 'Ineligible' | 'Conditional';
  soilTestingEligibility: 'Eligible' | 'Ineligible' | 'Conditional';
  loanEligibility: 'High' | 'Moderate' | 'Low';
  
  interviewStatus: 'Pending Review' | 'Shortlisted' | 'Rejected' | 'Interview Scheduled';
  verificationStatus: 'Draft Submitted' | 'Under Verification' | 'Verified' | 'Action Required';
  finalRecommendation: 'Highly Recommended' | 'Recommended for Stage-1' | 'Under Review' | 'Needs Technical Training';
  assignedProgram?: string;
  internalRemarks?: string;

  v3Report?: V3IntelligenceReport;
  v4CentralScores?: CentralScoringResult;
  v4ExplainableRecommendations?: ExplainableRecommendationItem[];
  v4StatusTimeline?: StatusTimelineEntry[];
  v4SearchableMetadata?: SearchableAssessmentMetadata;
}
