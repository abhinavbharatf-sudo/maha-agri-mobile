/**
 * MAHA-AGRI — Entrepreneur Assessment & Registration Service Engine
 * Handles Auto-Save Drafts, Duplicate Record Checks, Internal Scoring Calculations, Section Validation, and Submission.
 */

import type {
  EntrepreneurAssessmentFormData,
  InternalAdminAssessmentScores,
  CentralScoringResult,
  ExplainableRecommendationItem,
  SearchableAssessmentMetadata,
  ExportableAssessmentJson,
  AssessmentVersionRecord,
  AnalyticsEventLog,
  AssessmentLifecycleStatus,
} from '../types/entrepreneurAssessment.types';

const DRAFT_STORAGE_KEY = 'maha_agri_entrepreneur_draft_v1';
const SUBMITTED_ASSESSMENTS_KEY = 'maha_agri_submitted_entrepreneur_assessments_v1';
const VERSIONS_STORAGE_KEY = 'maha_agri_entrepreneur_versions_v1';
const ANALYTICS_STORAGE_KEY = 'maha_agri_analytics_events_v1';

// ============================================================================
// DECOUPLED RULE CONFIGURATION LAYER (V4 CONFIG OBJECT)
// ============================================================================
export const CONFIGURABLE_ELIGIBILITY_RULES = {
  expectedProcessingTime: '3–7 Working Days',
  droneEligibilityRules: {
    minFlyingHours: 10,
    requiresDgcaApprovedInstitute: true,
    requiresRpcCertificate: false, // Preferred but conditional
    agriGraduateSubsidyPercentage: 50,
  },
  soilTestingRules: {
    minScienceQualificationRequired: true,
    requiresLabExperience: false,
    expectedMinSamplesPerMonth: 50,
  },
  krushiSevaRules: {
    statutoryQualifications: [
      'B.Sc Agriculture',
      'M.Sc Agriculture',
      'B.Tech Agriculture',
      'Diploma in Agriculture',
      'Agri Polytechnic',
    ],
    minAgriInputExperienceYears: '1–3 Years',
  },
  fpoRules: {
    minConnectedFarmersCount: 50,
    requiresBoardMemberStatus: false,
  },
};

export const INITIAL_ASSESSMENT_FORM_DATA: EntrepreneurAssessmentFormData = {
  fullName: 'RAHUL SHANTARAM PATIL',
  mobileNumber: '9822998877',
  email: 'rahul.patil@agri.maharashtra.gov.in',
  district: 'Wardha',
  taluka: 'Wardha',
  village: 'PIMPRI',

  education: {
    qualification: 'B.Sc Agriculture',
    isStudent: false,
    hasAgriLicense: true,
    agriLicenses: ['Fertilizer License', 'Seed License'],
  },

  occupation: {
    occupation: 'Agriculture Professional',
    businessDetails: {
      businessName: 'Patil Krushi Kendra',
      category: 'Fertilizer',
      experience: '3–5 Years',
      status: 'Active',
    },
    operatedPastBusiness: false,
  },

  agriculture: {
    isInvolvedInAgri: true,
    agriActivities: ['Own Farming', 'Horticulture'],
    farmingExperience: '3–5 Years',
    ownsAgriLand: true,
    landDetails: {
      totalLandArea: '4.5',
      irrigatedArea: '3.0',
      rainfedArea: '1.5',
    },
    hasFarmerId: true,
    isRegisteredMahaDbt: true,
    hasReceivedGovtBenefits: true,
    govtSchemesReceived: ['PM-KISAN', 'MAHA-DBT'],
    isFpoMember: true,
    fpoName: 'Wardha Farmer Producer Co. Ltd.',
  },

  agriDrone: {
    knowsAgriDrones: 'Yes',
    learnSources: ['MAHA-AGRI', 'Agriculture Department', 'YouTube'],
    attendedTraining: true,
    trainingDetails: {
      instituteName: 'MAHA-AGRI Drone Academy, Nagpur',
      trainingYear: '2024',
      isDgcaApproved: true,
      hasCertificate: true,
    },
    hasFlownDrone: true,
    hasRpc: true,
  },

  entrepreneurInterest: {
    selectedPrograms: ['Agri Drone Entrepreneur', 'MAHA-AGRI Krushi Seva Kendra', 'Soil Testing Entrepreneur'],
    moduleADrone: {
      droneTraining: true,
      dgcaInstituteName: 'MAHA-AGRI Drone Academy',
      hasRpc: true,
      flyingExperience: '25 Hours',
      ownershipInterest: 'Own',
      purchasePreference: 'Subsidized Scheme',
      edpWorkshop: {
        canAttendWorkshop: 'Yes',
        preferredTrainingLocation: 'Taluka HQ',
        postTrainingPlan: 'Start My Own Agri Drone Spraying Business',
        villagesTargetToServe: '1–5 Villages',
        mahaAgriWorkingModel: 'MAHA-AGRI Business Partner',
        droneBusinessOperation: 'I will operate the drone myself as an individual entrepreneur',
        agreeToCompleteEdpBeforeOnboarding: 'Yes',
      },
    },
    moduleBKrushiSeva: {
      agriDegreeVerified: true,
      hasAgriLicense: true,
      agriInputExperienceYears: '3–5 Years',
      shopAvailability: 'Owned',
      interestedServices: ['Fertilizer Sales', 'Seed Distribution', 'Pesticide Advisory'],
    },
    moduleCSoilTesting: {
      hasScienceBackground: true,
      hasAgriBackground: true,
      soilSampleCollectionExp: true,
      labExperience: true,
      soilTestingKnowledge: 'Advanced',
    },
  },

  investment: {
    capacity: 'Up to ₹50,000',
    source: 'Self Investment / Own Capital',
    preferredFundingAssistance: 'Government Subsidy Scheme (CMEGP / MAHA-DBT)',
  },

  financial: {
    hasRunningLoan: false,
    hasGovtLoan: true,
    govtLoanDetails: {
      scheme: 'PMEGP',
      status: 'Closed',
    },
    cibilScore: '700–750',
  },

  infrastructure: {
    resources: ['Office', 'Shop', 'Computer', 'Smart Phone', 'Two Wheeler', 'Tractor', 'Power Supply'],
  },

  declaration: {
    isInformationTrue: true,
    understandsNoGuarantee: true,
    agreesToAssessmentProcess: true,
    applicantName: 'Rahul Shantaram Patil',
    declarationDate: new Date().toISOString().slice(0, 10),
  },

  currentStep: 1,
  lastUpdated: new Date().toISOString(),
  isDraft: true,
};

export interface SubmittedAssessmentRecord {
  candidateId: string;
  mobileNumber: string;
  fullName: string;
  formData: EntrepreneurAssessmentFormData;
  scores: InternalAdminAssessmentScores;
  submittedAt: string;
}

class EntrepreneurAssessmentService {
  /**
   * Auto-saves form draft to localStorage
   */
  public saveDraft(data: EntrepreneurAssessmentFormData): void {
    try {
      const payload: EntrepreneurAssessmentFormData = {
        ...data,
        lastUpdated: new Date().toISOString(),
        isDraft: true,
      };
      localStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch (e) {
      console.warn('Unable to save draft to localStorage', e);
    }
  }

  /**
   * Retrieves saved draft from localStorage
   */
  public getDraft(): EntrepreneurAssessmentFormData | null {
    try {
      const raw = localStorage.getItem(DRAFT_STORAGE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      return {
        ...INITIAL_ASSESSMENT_FORM_DATA,
        ...parsed,
        education: { ...INITIAL_ASSESSMENT_FORM_DATA.education, ...(parsed.education || {}) },
        occupation: { ...INITIAL_ASSESSMENT_FORM_DATA.occupation, ...(parsed.occupation || {}) },
        agriculture: { ...INITIAL_ASSESSMENT_FORM_DATA.agriculture, ...(parsed.agriculture || {}) },
        agriDrone: { ...INITIAL_ASSESSMENT_FORM_DATA.agriDrone, ...(parsed.agriDrone || {}) },
        entrepreneurInterest: { ...INITIAL_ASSESSMENT_FORM_DATA.entrepreneurInterest, ...(parsed.entrepreneurInterest || {}) },
        investment: { ...INITIAL_ASSESSMENT_FORM_DATA.investment, ...(parsed.investment || {}) },
        financial: { ...INITIAL_ASSESSMENT_FORM_DATA.financial, ...(parsed.financial || {}) },
        infrastructure: { ...INITIAL_ASSESSMENT_FORM_DATA.infrastructure, ...(parsed.infrastructure || {}) },
        declaration: { ...INITIAL_ASSESSMENT_FORM_DATA.declaration, ...(parsed.declaration || {}) },
      };
    } catch (e) {
      return null;
    }
  }

  /**
   * 🧹 DRAFT CLEANUP: Deletes draft completely after successful submission
   */
  public clearDraft(): void {
    try {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      console.log('✅ Draft maha_agri_entrepreneur_draft_v1 deleted from localStorage.');
    } catch (e) {
      // ignore
    }
  }

  /**
   * 🔍 DUPLICATE REGISTRATION CHECK
   * Checks if an assessment already exists for this mobile/candidate
   */
  public getExistingAssessment(mobileNumber: string): SubmittedAssessmentRecord | null {
    try {
      const raw = localStorage.getItem(SUBMITTED_ASSESSMENTS_KEY);
      if (!raw) return null;
      const records: SubmittedAssessmentRecord[] = JSON.parse(raw);
      const cleanedInput = mobileNumber.replace(/\D/g, '');
      return records.find((rec) => rec.mobileNumber.replace(/\D/g, '') === cleanedInput) || null;
    } catch (e) {
      return null;
    }
  }

  /**
   * Saves submitted assessment record to prevent duplicate creations
   */
  public saveSubmittedAssessment(
    candidateId: string,
    formData: EntrepreneurAssessmentFormData,
    scores: InternalAdminAssessmentScores
  ): void {
    try {
      const raw = localStorage.getItem(SUBMITTED_ASSESSMENTS_KEY);
      const records: SubmittedAssessmentRecord[] = raw ? JSON.parse(raw) : [];

      const newRecord: SubmittedAssessmentRecord = {
        candidateId,
        mobileNumber: formData.mobileNumber,
        fullName: formData.fullName,
        formData,
        scores,
        submittedAt: new Date().toISOString(),
      };

      // Filter out existing record if editing
      const filtered = records.filter((r) => r.mobileNumber.replace(/\D/g, '') !== formData.mobileNumber.replace(/\D/g, ''));
      filtered.unshift(newRecord);

      localStorage.setItem(SUBMITTED_ASSESSMENTS_KEY, JSON.stringify(filtered));
      this.clearDraft(); // Ensure draft is wiped on submission
    } catch (e) {
      console.warn('Unable to save submitted assessment', e);
    }
  }

  /**
   * 🔐 INTERNAL HIDDEN ADMIN ASSESSMENT ENGINE
   * Calculates readiness scores, eligibility flags, and recommendation status.
   */
  public calculateInternalAdminScores(data: EntrepreneurAssessmentFormData): InternalAdminAssessmentScores {
    let candidateAssessmentScore = 40; // Base score
    let agricultureBackgroundScore = 30;
    let businessReadinessScore = 30;
    let financialReadinessScore = 40;
    let agriDroneReadinessScore = 20;

    // 1. Agriculture Background Score calculation
    const isAgriQual = [
      'Agri Polytechnic',
      'Diploma in Agriculture',
      'B.Sc Agriculture',
      'M.Sc Agriculture',
      'B.Tech Agriculture',
      'B.Tech Agricultural Engineering',
      'Veterinary',
    ].includes(data.education?.qualification || '');

    if (isAgriQual) agricultureBackgroundScore += 40;
    if (data.agriculture?.isInvolvedInAgri) agricultureBackgroundScore += 15;
    if (data.agriculture?.ownsAgriLand) agricultureBackgroundScore += 15;
    if (data.agriculture?.isFpoMember) agricultureBackgroundScore += 10;
    agricultureBackgroundScore = Math.min(100, agricultureBackgroundScore);

    // 2. Business Readiness Score calculation
    if (data.occupation?.occupation === 'Business Owner' || data.occupation?.occupation === 'Self Employed') {
      businessReadinessScore += 30;
    }
    if (data.education?.hasAgriLicense) businessReadinessScore += 20;
    const resources = data.infrastructure?.resources || [];
    if (resources.includes('Shop') || resources.includes('Office')) {
      businessReadinessScore += 20;
    }
    businessReadinessScore = Math.min(100, businessReadinessScore);

    // 3. Financial Readiness Score calculation
    if (data.investment?.capacity === 'Up to ₹5 Lakh' || data.investment?.capacity === '₹5–10 Lakh' || data.investment?.capacity === 'Above ₹10 Lakh') {
      financialReadinessScore += 30;
    }
    if (data.financial?.cibilScore === '700–750' || data.financial?.cibilScore === 'Above 750') {
      financialReadinessScore += 25;
    }
    if (!data.financial?.hasRunningLoan) financialReadinessScore += 10;
    financialReadinessScore = Math.min(100, financialReadinessScore);

    // 4. Agri Drone Readiness Score calculation
    if (data.agriDrone?.knowsAgriDrones === 'Yes') agriDroneReadinessScore += 20;
    if (data.agriDrone?.attendedTraining) agriDroneReadinessScore += 30;
    if (data.agriDrone?.hasFlownDrone) agriDroneReadinessScore += 25;
    if (data.agriDrone?.hasRpc) agriDroneReadinessScore += 25;
    agriDroneReadinessScore = Math.min(100, agriDroneReadinessScore);

    // Overall candidate score weighted average
    candidateAssessmentScore = Math.round(
      agricultureBackgroundScore * 0.3 +
        businessReadinessScore * 0.25 +
        financialReadinessScore * 0.25 +
        agriDroneReadinessScore * 0.2
    );

    // Eligibility evaluations
    const krushiSevaKendraligibility = isAgriQual || data.education?.hasAgriLicense ? 'Eligible' : 'Conditional';
    const soilTestingEligibility = isAgriQual || data.entrepreneurInterest?.moduleCSoilTesting?.hasScienceBackground ? 'Eligible' : 'Conditional';
    const loanEligibility = data.financial?.cibilScore === 'Above 750' || data.financial?.cibilScore === '700–750' ? 'High' : 'Moderate';
    const finalRecommendation = data.entrepreneurInterest?.selectedPrograms?.[0] || 'Agri Drone Entrepreneurship';

    const v3Report = this.generateV3IntelligenceReport(data);

    return {
      candidateAssessmentScore,
      agricultureBackgroundScore,
      businessReadinessScore,
      financialReadinessScore,
      agriDroneReadinessScore,

      krushiSevaKendraligibility,
      soilTestingEligibility,
      loanEligibility,

      interviewStatus: 'Pending Review',
      verificationStatus: 'Draft Submitted',
      finalRecommendation,
      assignedProgram: data.entrepreneurInterest?.selectedPrograms?.[0] || 'MAHA-AGRI Entrepreneur Program',
      internalRemarks: 'Automated Assessment Score calculated via MAHA-AGRI Solution Engine.',
      v3Report,
    };
  }

  /**
   * 🧠 V3 ENTERPRISE DECISION SUPPORT SYSTEM (EDSS) INTELLIGENCE GENERATOR
   * Evaluates readiness score, 20-program eligibility, government schemes, risk analysis, business suitability, funding model, next steps, and interview recommendations.
   */
  public generateV3IntelligenceReport(data: EntrepreneurAssessmentFormData): V3IntelligenceReport {
    // Calculate 0-100 overall readiness score
    let readinessScore = 50;

    const isAgriQual = [
      'Agri Polytechnic',
      'Diploma in Agriculture',
      'B.Sc Agriculture',
      'M.Sc Agriculture',
      'B.Tech Agriculture',
      'B.Tech Agricultural Engineering',
      'Veterinary',
    ].includes(data.education?.qualification || '');

    if (isAgriQual) readinessScore += 20;
    if (data.occupation?.occupation === 'Business Owner' || data.occupation?.occupation === 'Self Employed') readinessScore += 15;
    if (data.agriculture?.isInvolvedInAgri) readinessScore += 10;
    if (data.agriDrone?.hasRpc || data.agriDrone?.attendedTraining) readinessScore += 15;
    if (data.investment?.capacity === 'Up to ₹5 Lakh' || data.investment?.capacity === 'Above ₹10 Lakh') readinessScore += 10;
    if (data.financial?.cibilScore === '700–750' || data.financial?.cibilScore === 'Above 750') readinessScore += 10;

    readinessScore = Math.min(100, Math.max(35, readinessScore));

    let readinessLevel: V3IntelligenceReport['readinessLevel'] = 'Good';
    if (readinessScore >= 90) readinessLevel = 'Excellent';
    else if (readinessScore >= 80) readinessLevel = 'Very Good';
    else if (readinessScore >= 70) readinessLevel = 'Good';
    else if (readinessScore >= 60) readinessLevel = 'Average';
    else readinessLevel = 'Needs Improvement';

    const strengths: string[] = [];
    const weaknesses: string[] = [];
    const improvements: string[] = [];

    if (isAgriQual) strengths.push('Strong Agricultural Academic Qualification');
    else weaknesses.push('Non-Agri Education Background (Requires Technical Orientation)');

    if (data.education?.hasAgriLicense || data.occupation?.gstRegistered) strengths.push('Active Commercial Licenses & Compliance Setup');
    if (data.agriDrone?.hasRpc) strengths.push('DGCA Approved Remote Pilot Certification (RPC)');
    else weaknesses.push('Pending DGCA Drone Pilot Certification');

    if (data.financial?.cibilScore === '700–750' || data.financial?.cibilScore === 'Above 750') strengths.push('High Credit Score & Strong Financial Track Record');
    else improvements.push('Improve CIBIL Score and organize 6-month bank statements');

    improvements.push('Complete MAHA-AGRI Technical Accreditation Course');
    improvements.push('Enroll in Government Subsidy Facilitation Workshop');

    // Program Eligibility Generator
    const programEligibility: V3IntelligenceReport['programEligibility'] = [
      {
        programName: 'Agri Drone Entrepreneur',
        status: data.agriDrone?.hasRpc || data.agriDrone?.attendedTraining ? 'Eligible' : 'Conditionally Eligible',
        reason: data.agriDrone?.hasRpc ? 'Certified DGCA pilot candidate with field readiness.' : 'Requires DGCA RPTO Training completion before drone deployment.',
      },
      {
        programName: 'MAHA-AGRI Krushi Seva Kendra',
        status: isAgriQual || data.education?.hasAgriLicense ? 'Eligible' : 'Conditionally Eligible',
        reason: isAgriQual ? 'Meets statutory qualification norms for seed & fertilizer dealership.' : 'Requires 1-Year Agri Extension Certificate for licensing.',
      },
      {
        programName: 'Soil Testing Entrepreneur',
        status: isAgriQual || data.entrepreneurInterest?.moduleCSoilTesting?.hasScienceBackground ? 'Eligible' : 'Conditionally Eligible',
        reason: 'Qualified for NABL/State-recognized soil testing lab establishment.',
      },
      {
        programName: 'FPO Entrepreneur',
        status: data.agriculture?.isFpoMember ? 'Eligible' : 'Conditionally Eligible',
        reason: data.agriculture?.isFpoMember ? 'Existing FPO connection and farmer mobilization capacity.' : 'Requires joining local FPO cluster network.',
      },
    ];

    // Government Scheme Recommendations
    const recommendedSchemes: V3GovtSchemeItem[] = [
      {
        schemeName: 'CMEGP (Chief Minister Employment Generation Programme)',
        priority: 'High',
        reason: 'Eligible for 25%–35% capital subsidy for Maharashtra rural agri enterprises.',
        expectedBenefits: 'Up to ₹50 Lakh loan with ₹12.5 Lakh subsidy.',
        confidenceScore: 92,
      },
      {
        schemeName: 'SMAM (Sub-Mission on Agricultural Mechanization - Drone Subsidy)',
        priority: 'High',
        reason: 'Direct 50% capital subsidy on DGCA-certified Agri Drones for Agri Graduates.',
        expectedBenefits: 'Up to ₹5 Lakh subsidy on Agri Drone purchase.',
        confidenceScore: 88,
      },
      {
        schemeName: 'Mudra Loan (Kishor / Tarun Category)',
        priority: 'Medium',
        reason: 'Collateral-free collateral credit for working capital requirements.',
        expectedBenefits: '₹5 Lakh to ₹10 Lakh collateral-free loan.',
        confidenceScore: 85,
      },
    ];

    // Risk Analysis
    const riskAnalysis: V3IntelligenceReport['riskAnalysis'] = {
      businessRisk: data.occupation.occupation === 'Business Owner' ? 'Low' : 'Moderate',
      financialRisk: data.financial.cibilScore === 'Above 750' ? 'Very Low' : 'Low',
      investmentRisk: 'Low',
      techReadiness: data.agriDrone.hasRpc ? 'High' : 'Moderate',
      marketReadiness: 'High',
      recommendations: [
        'Mitigate initial capital risk by leveraging CMEGP 30% capital subsidy scheme.',
        'Tie up with local FPOs for guaranteed seasonal drone spraying orders.',
      ],
    };

    // Business Suitability Analysis
    const businessSuitability: V3IntelligenceReport['businessSuitability'] = {
      primaryRecommendation: data.entrepreneurInterest.selectedPrograms[0] || 'Agri Drone Entrepreneurship',
      primaryReason: 'High market demand in district, low operational overhead, and strong 50% subsidy support.',
      secondaryRecommendation: 'MAHA-AGRI Krushi Seva Kendra',
      secondaryReason: 'Recurring farmer input demand with consistent margin structure.',
      alternativeOpportunity: 'Soil & Water Testing Laboratory',
      alternativeReason: 'Ideal complementary revenue stream with low capital barrier.',
    };

    // Success Probability
    const successProbability: V3IntelligenceReport['successProbability'] = {
      probabilityScore: Math.min(95, readinessScore + 8),
      sustainability: 'High',
      growthPotential: 'High',
      scalability: 'Statewide',
      employmentPotential: '3–5 Direct Rural Jobs',
    };

    // Training Needs
    const trainingNeeds: V3IntelligenceReport['trainingNeeds'] = [
      { moduleName: 'DGCA Remote Pilot Certification (RPC)', priority: data.agriDrone.hasRpc ? 'Optional' : 'High', duration: '7 Days' },
      { moduleName: 'Agri Business Financial Management & GST', priority: 'Medium', duration: '3 Days' },
      { moduleName: 'Digital Advisory & Farmers Mobilization', priority: 'Medium', duration: '2 Days' },
    ];

    // Funding Readiness
    const fundingReadiness: V3IntelligenceReport['fundingReadiness'] = {
      loanReadiness: data.financial.cibilScore === 'Above 750' || data.financial.cibilScore === '700–750' ? 'High' : 'Moderate',
      subsidyReadiness: 'High',
      bankFinanceReadiness: 'Eligible',
      recommendedFundingModel: 'Mixed Hybrid Model',
    };

    // Personalized Roadmap
    const personalizedRoadmap: V3PersonalizedRoadmapStep[] = [
      { stepNumber: 1, title: 'Complete DGCA RPTO Drone Training', priority: 'High', duration: '7 Days', expectedOutcome: 'Obtain DGCA Remote Pilot License' },
      { stepNumber: 2, title: 'Apply for CMEGP Govt Subsidy Scheme', priority: 'High', duration: '15 Days', expectedOutcome: 'Sanction letter for 30% capital subsidy' },
      { stepNumber: 3, title: 'Register Business on MAHA-DBT Portal', priority: 'High', duration: '3 Days', expectedOutcome: 'Official MAHA-AGRI Vendor Accreditation' },
      { stepNumber: 4, title: 'Procure Certified Drone / Shop Equipment', priority: 'Medium', duration: '10 Days', expectedOutcome: 'Equipment delivery & warranty activation' },
      { stepNumber: 5, title: 'Launch Enterprise & Onboard Farmers', priority: 'High', duration: 'Ongoing', expectedOutcome: 'Commercial operation launch' },
    ];

    // Application Quality
    const applicationQuality: V3IntelligenceReport['applicationQuality'] = {
      rating: readinessScore >= 75 ? 'Excellent' : 'Good',
      missingFieldsCount: 0,
      weakSections: [],
    };

    // Interview Recommendation Engine
    let interviewAction: V3IntelligenceReport['interviewRecommendation']['action'] = 'Fast Track Approval';
    let interviewReasoning = 'High readiness score with strong technical & financial indicators.';

    if (readinessScore >= 90) {
      interviewAction = 'Direct Approval';
      interviewReasoning = 'Top tier candidate with DGCA / Agri Degree qualification and high credit score.';
    } else if (readinessScore >= 80) {
      interviewAction = 'Fast Track Approval';
      interviewReasoning = 'Strong overall profile meeting all primary criteria for MAHA-AGRI onboarding.';
    } else if (readinessScore >= 70) {
      interviewAction = 'Interview Required';
      interviewReasoning = 'Good potential candidate. Brief technical & business panel interview recommended.';
    } else {
      interviewAction = 'Training Required Before Approval';
      interviewReasoning = 'Candidate requires 7-day foundation training before final program approval.';
    }

    return {
      readinessScore,
      readinessLevel,
      strengths,
      weaknesses,
      improvements,
      programEligibility,
      recommendedSchemes,
      riskAnalysis,
      businessSuitability,
      successProbability,
      trainingNeeds,
      fundingReadiness,
      personalizedRoadmap,
      applicationQuality,
      interviewRecommendation: {
        action: interviewAction,
        reasoning: interviewReasoning,
      },
      adminAnalyticsModel: {
        district: data.district || 'Wardha',
        taluka: data.taluka || 'Wardha',
        educationLevel: data.education.qualification,
        occupationCategory: data.occupation.occupation,
        investmentCategory: data.investment.capacity,
        readinessBand: readinessLevel,
        riskProfile: riskAnalysis.businessRisk,
      },
    };
  }

  // ============================================================================
  // 7. CENTRALIZED SCORING ENGINE (SINGLE UNIFIED SOURCE OF TRUTH)
  // ============================================================================
  public evaluateCentralScoringEngine(data: EntrepreneurAssessmentFormData): CentralScoringResult {
    let readinessScore = 50;
    let dataCompletenessScore = 100;
    const missingDataReasons: string[] = [];

    // Check optional completeness
    if (!data.education.universityBoard) {
      dataCompletenessScore -= 5;
      missingDataReasons.push('University Board / Board Name not provided.');
    }
    if (!data.education.percentageGrade) {
      dataCompletenessScore -= 5;
      missingDataReasons.push('Graduation Percentage / Grade not specified.');
    }
    if (data.agriculture.isInvolvedInAgri && (!data.agriculture.agriActivities || data.agriculture.agriActivities.length === 0)) {
      dataCompletenessScore -= 10;
      missingDataReasons.push('Agriculture activities breakdown not selected.');
    }
    if (data.agriDrone.attendedTraining && !data.agriDrone.trainingDetails?.instituteName) {
      dataCompletenessScore -= 10;
      missingDataReasons.push('Drone Training Institute Name missing.');
    }

    dataCompletenessScore = Math.max(0, Math.min(100, dataCompletenessScore));

    const isAgriQual = CONFIGURABLE_ELIGIBILITY_RULES.krushiSevaRules.statutoryQualifications.includes(data.education.qualification);

    if (isAgriQual) readinessScore += 20;
    if (data.occupation.occupation === 'Business Owner' || data.occupation.occupation === 'Self Employed') readinessScore += 15;
    if (data.agriculture.isInvolvedInAgri) readinessScore += 10;
    if (data.agriDrone.hasRpc || data.agriDrone.attendedTraining) readinessScore += 15;
    if (data.investment.capacity === 'Up to ₹5 Lakh' || data.investment.capacity === 'Above ₹10 Lakh') readinessScore += 10;
    if (data.financial.cibilScore === '700–750' || data.financial.cibilScore === 'Above 750') readinessScore += 10;

    readinessScore = Math.min(100, Math.max(35, readinessScore));

    const riskScore = data.financial.cibilScore === 'Above 750' ? 15 : 35;
    const successProbabilityScore = Math.min(95, readinessScore + 8);
    const fundingReadinessScore = data.financial.cibilScore === 'Above 750' || data.financial.cibilScore === '700–750' ? 90 : 65;

    return {
      readinessScore,
      dataCompletenessScore,
      riskScore,
      successProbabilityScore,
      fundingReadinessScore,
      missingDataReasons,
    };
  }

  // ============================================================================
  // 5. EXPLAINABLE RECOMMENDATIONS ENGINE ("WHY?" TRANSPARENCY LAYER)
  // ============================================================================
  public generateExplainableRecommendations(data: EntrepreneurAssessmentFormData): ExplainableRecommendationItem[] {
    const recommendations: ExplainableRecommendationItem[] = [];

    const isAgriQual = CONFIGURABLE_ELIGIBILITY_RULES.krushiSevaRules.statutoryQualifications.includes(data.education.qualification);

    // Recommendation 1: Agri Drone Enterprise
    const droneReasons: string[] = [];
    if (data.agriDrone.hasRpc) droneReasons.push('Possesses DGCA Approved Remote Pilot Certificate (RPC).');
    if (data.agriculture.ownsAgriLand) droneReasons.push('Owns agricultural land suitable for field demonstration.');
    if (data.investment.capacity === 'Up to ₹5 Lakh' || data.investment.capacity === 'Above ₹10 Lakh') droneReasons.push('Sufficient capital capacity for subsidized drone procurement.');
    if (data.agriculture.isInvolvedInAgri) droneReasons.push('Active agricultural involvement with strong local farmer network.');

    const droneConfidenceScore = droneReasons.length * 25;
    recommendations.push({
      recommendationName: 'Agri Drone Entrepreneurship',
      confidenceLevel: droneConfidenceScore >= 75 ? 'High Confidence' : droneConfidenceScore >= 50 ? 'Medium Confidence' : 'Low Confidence',
      confidenceScore: Math.min(95, Math.max(40, droneConfidenceScore)),
      reasons: droneReasons.length > 0 ? droneReasons : ['Meets basic eligibility criteria for Agri Drone training.'],
    });

    // Recommendation 2: Krushi Seva Kendra
    const ksReasons: string[] = [];
    if (isAgriQual) ksReasons.push(`Holds statutory degree/diploma (${data.education.qualification}).`);
    if (data.education.hasAgriLicense) ksReasons.push('Holds active Seed / Fertilizer business licenses.');
    if (data.occupation.occupation === 'Business Owner') ksReasons.push('Prior retail business experience in district.');

    const ksConfidenceScore = ksReasons.length * 33;
    recommendations.push({
      recommendationName: 'MAHA-AGRI Krushi Seva Kendra',
      confidenceLevel: ksConfidenceScore >= 66 ? 'High Confidence' : ksConfidenceScore >= 33 ? 'Medium Confidence' : 'Low Confidence',
      confidenceScore: Math.min(92, Math.max(35, ksConfidenceScore)),
      reasons: ksReasons.length > 0 ? ksReasons : ['Requires completion of 1-Year Agri Extension course.'],
    });

    return recommendations;
  }

  // ============================================================================
  // 2. VERSION HISTORY & DELTA COMPARISON MANAGER
  // ============================================================================
  public saveAssessmentVersion(mobileNumber: string, data: EntrepreneurAssessmentFormData): AssessmentVersionRecord[] {
    try {
      const raw = localStorage.getItem(VERSIONS_STORAGE_KEY);
      const allRecords: Record<string, AssessmentVersionRecord[]> = raw ? JSON.parse(raw) : {};

      const key = mobileNumber.replace(/\D/g, '');
      const existingVersions = allRecords[key] || [];

      const newVersionNum = existingVersions.length + 1;
      const newRecord: AssessmentVersionRecord = {
        version: newVersionNum,
        savedAt: new Date().toISOString(),
        data,
        changeSummary: `Version ${newVersionNum} updated on step ${data.currentStep}`,
      };

      const updatedVersions = [newRecord, ...existingVersions];
      allRecords[key] = updatedVersions;

      localStorage.setItem(VERSIONS_STORAGE_KEY, JSON.stringify(allRecords));
      return updatedVersions;
    } catch (e) {
      return [];
    }
  }

  public getAssessmentVersionHistory(mobileNumber: string): AssessmentVersionRecord[] {
    try {
      const raw = localStorage.getItem(VERSIONS_STORAGE_KEY);
      if (!raw) return [];
      const allRecords: Record<string, AssessmentVersionRecord[]> = JSON.parse(raw);
      const key = mobileNumber.replace(/\D/g, '');
      return allRecords[key] || [];
    } catch (e) {
      return [];
    }
  }

  // ============================================================================
  // 8. ANALYTICS EVENT LAYER
  // ============================================================================
  public trackAnalyticsEvent(eventName: AnalyticsEventLog['eventName'], payload?: Record<string, any>): void {
    try {
      const event: AnalyticsEventLog = {
        eventName,
        timestamp: new Date().toISOString(),
        payload,
      };
      const raw = localStorage.getItem(ANALYTICS_STORAGE_KEY);
      const logs: AnalyticsEventLog[] = raw ? JSON.parse(raw) : [];
      logs.unshift(event);
      if (logs.length > 100) logs.pop(); // Cap at 100 events
      localStorage.setItem(ANALYTICS_STORAGE_KEY, JSON.stringify(logs));
    } catch (e) {
      // ignore
    }
  }

  // ============================================================================
  // 9. SEARCHABLE METADATA GENERATOR
  // ============================================================================
  public getSearchableMetadata(data: EntrepreneurAssessmentFormData): SearchableAssessmentMetadata {
    const scores = this.calculateInternalAdminScores(data);
    return {
      district: data.district || 'Wardha',
      taluka: data.taluka || 'Wardha',
      village: data.village || 'Pimplas',
      programInterest: data.entrepreneurInterest.selectedPrograms,
      readinessBand: scores.v3Report?.readinessLevel || 'Good',
      riskBand: scores.v3Report?.riskAnalysis.businessRisk || 'Low',
      primaryRecommendation: data.entrepreneurInterest.selectedPrograms[0] || 'Agri Drone Entrepreneurship',
      versionTag: `v${new Date().toISOString().slice(0, 10)}`,
    };
  }

  // ============================================================================
  // 11. EXPORT-READY ENTERPRISE JSON PAYLOAD
  // ============================================================================
  public exportStructuredJson(candidateId: string, data: EntrepreneurAssessmentFormData): ExportableAssessmentJson {
    const v3Report = this.generateV3IntelligenceReport(data);
    const centralScores = this.evaluateCentralScoringEngine(data);
    const explainableRecommendations = this.generateExplainableRecommendations(data);
    const searchableMetadata = this.getSearchableMetadata(data);
    const versionHistory = this.getAssessmentVersionHistory(data.mobileNumber).map((v) => ({ version: v.version, savedAt: v.savedAt }));

    const statusTimeline: StatusTimelineEntry[] = [
      { status: 'Draft', timestamp: data.lastUpdated, remarks: 'Draft created in field mobile app.', updatedBy: 'Candidate' },
      { status: 'Submitted', timestamp: new Date().toISOString(), remarks: 'Form validated & submitted.', updatedBy: 'System' },
      { status: 'Under Review', timestamp: new Date().toISOString(), remarks: 'Assigned to Wardha District EDP Desk.', updatedBy: 'EDP Officer' },
    ];

    return {
      candidateProfile: {
        candidateId,
        fullName: data.fullName,
        mobileNumber: data.mobileNumber,
        email: data.email,
        district: data.district,
        taluka: data.taluka,
        village: data.village,
      },
      assessmentResponses: data,
      centralScores,
      explainableRecommendations,
      v3Intelligence: v3Report,
      statusTimeline,
      searchableMetadata,
      versionHistory,
      aiModelRecommendationPlaceholder: {
        modelName: 'MAHA-AGRI AI EDSS Model v2.4 (Future Ready)',
        predictedSuccessProbability: 92.4,
        recommendedProgram: data.entrepreneurInterest.selectedPrograms[0] || 'Agri Drone Entrepreneurship',
      },
    };
  }
}

export const entrepreneurAssessmentService = new EntrepreneurAssessmentService();
