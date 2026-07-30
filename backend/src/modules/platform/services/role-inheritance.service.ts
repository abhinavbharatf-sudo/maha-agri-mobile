// ============================================================================
// MAHA-AGRI Government Digital Operations Platform (v1.0.1 Patch Refinement)
// Level 1 - 9 Enterprise Hierarchy, Functional Roles & Super Admin Engine
// Payment Verification Lock & External Laboratory Agency Master
// ============================================================================

import { Injectable, Logger, BadRequestException } from '@nestjs/common';

export enum UserRoleLevel {
  FARMER = 'FARMER',                           // L1
  MAHA_AGRIDOOT = 'MAHA_AGRIDOOT',             // L2
  SOIL_CHEMIST = 'SOIL_CHEMIST',               // L3 (Functional Role)
  DRONE_ENTREPRENEUR = 'DRONE_ENTREPRENEUR',   // L4 (Functional Role)
  TALUKA_COORDINATOR = 'TALUKA_COORDINATOR',   // L5 (Field + Taluka Management)
  DISTRICT_COORDINATOR = 'DISTRICT_COORDINATOR', // L6 (Field + District Management)
  REGIONAL_MANAGER = 'REGIONAL_MANAGER',       // L7 (Field + Regional Operations)
  STATE_ADMIN = 'STATE_ADMIN',                 // L8 (Statewide Operational Head)
  SUPER_ADMIN = 'SUPER_ADMIN',                 // L9 (Platform Owner & Multi-Tenant Lead)
}

export enum TestingAgencyType {
  INTERNAL_GOVT = 'INTERNAL_GOVT',
  EXTERNAL_NABL_PRIVATE = 'EXTERNAL_NABL_PRIVATE',
  UNIVERSITY_RESEARCH = 'UNIVERSITY_RESEARCH',
  NGO_SECTION8 = 'NGO_SECTION8',
}

export interface MenuItem {
  id: string;
  title: string;
  icon: string;
  route: string;
  category: 'FIELD' | 'TALUKA' | 'DISTRICT' | 'REGIONAL' | 'STATE' | 'SUPER_ADMIN';
}

@Injectable()
export class RoleInheritanceService {
  private readonly logger = new Logger(RoleInheritanceService.name);

  // Payment Lock Guard: Sample cannot enter laboratory testing without Payment Verification
  validatePaymentLock(isPaymentVerified: boolean): void {
    if (!isPaymentVerified) {
      throw new BadRequestException('PAYMENT_LOCKED: Soil sample testing is locked until fee payment is verified');
    }
  }

  // Role Permissions Matrix with Cumulative Inheritance
  getEffectivePermissions(primaryRole: UserRoleLevel): string[] {
    const permissionsMap: Record<UserRoleLevel, string[]> = {
      [UserRoleLevel.FARMER]: [
        'FARMER_PROFILE_VIEW',
        'LAND_HOLDING_VIEW',
        'SOIL_TEST_REQUEST',
        'DRONE_SPRAY_BOOK',
        'DOCUMENT_VAULT_VIEW',
      ],
      [UserRoleLevel.MAHA_AGRIDOOT]: [
        'FIELD_FARMER_REGISTRATION',
        'FIELD_GPS_ATTENDANCE',
        'FIELD_SAMPLE_COLLECTION',
        'FIELD_QR_SCAN',
        'FIELD_DRONE_LEAD_GEN',
        'FIELD_SURVEY',
        'FIELD_SERVICE_REQUESTS',
        'FIELD_COMPLAINT_REGISTRATION',
        'FIELD_DOCUMENT_UPLOAD',
        'FIELD_FARMER_VERIFICATION',
      ],
      [UserRoleLevel.SOIL_CHEMIST]: [
        'LAB_SAMPLE_RECEIPT',
        'LAB_PAYMENT_VERIFY',
        'LAB_12_PARAM_TEST_ENTRY',
        'LAB_QC_APPROVAL',
        'SOIL_HEALTH_CARD_GENERATE',
      ],
      [UserRoleLevel.DRONE_ENTREPRENEUR]: [
        'DRONE_CANDIDATE_PORTAL',
        'DRONE_WORKSHOP_VIEW',
        'DRONE_BOOKING_MANAGE',
        'DRONE_LOAN_APPLY',
      ],
      [UserRoleLevel.TALUKA_COORDINATOR]: [
        // Inherits MAHA_AGRIDOOT Field Permissions
        'FIELD_FARMER_REGISTRATION',
        'FIELD_GPS_ATTENDANCE',
        'FIELD_SAMPLE_COLLECTION',
        'FIELD_QR_SCAN',
        'FIELD_DRONE_LEAD_GEN',
        'FIELD_SURVEY',
        'FIELD_SERVICE_REQUESTS',
        'FIELD_COMPLAINT_REGISTRATION',
        'FIELD_DOCUMENT_UPLOAD',
        'FIELD_FARMER_VERIFICATION',
        // Plus Taluka Management
        'TALUKA_DAILY_TARGETS',
        'TALUKA_WORK_ALLOCATION',
        'TALUKA_ATTENDANCE_APPROVAL',
        'TALUKA_PENDING_SAMPLES',
        'TALUKA_ANALYTICS',
        'TALUKA_COMPLAINTS',
        'TALUKA_STAFF_MONITORING',
      ],
      [UserRoleLevel.DISTRICT_COORDINATOR]: [
        // Inherits Taluka + MAHA_AGRIDOOT
        'FIELD_FARMER_REGISTRATION',
        'FIELD_GPS_ATTENDANCE',
        'FIELD_SAMPLE_COLLECTION',
        'FIELD_QR_SCAN',
        'FIELD_DRONE_LEAD_GEN',
        'FIELD_SURVEY',
        'FIELD_SERVICE_REQUESTS',
        'FIELD_COMPLAINT_REGISTRATION',
        'FIELD_DOCUMENT_UPLOAD',
        'FIELD_FARMER_VERIFICATION',
        'TALUKA_DAILY_TARGETS',
        'TALUKA_WORK_ALLOCATION',
        'TALUKA_ATTENDANCE_APPROVAL',
        'TALUKA_PENDING_SAMPLES',
        'TALUKA_ANALYTICS',
        'TALUKA_COMPLAINTS',
        'TALUKA_STAFF_MONITORING',
        // Plus District Management
        'DISTRICT_DASHBOARD',
        'DISTRICT_TALUKA_MONITORING',
        'DISTRICT_PERFORMANCE_REPORTS',
        'DISTRICT_APPROVALS',
        'DISTRICT_REVENUE_DASHBOARD',
        'DISTRICT_SAMPLE_TRACKING',
        'DISTRICT_DRONE_OPERATIONS',
        'DISTRICT_STAFF_TRANSFERS',
      ],
      [UserRoleLevel.REGIONAL_MANAGER]: [
        // Inherits District + Taluka + MAHA_AGRIDOOT
        'FIELD_FARMER_REGISTRATION',
        'FIELD_GPS_ATTENDANCE',
        'FIELD_SAMPLE_COLLECTION',
        'FIELD_QR_SCAN',
        'FIELD_DRONE_LEAD_GEN',
        'FIELD_SURVEY',
        'FIELD_SERVICE_REQUESTS',
        'FIELD_COMPLAINT_REGISTRATION',
        'FIELD_DOCUMENT_UPLOAD',
        'FIELD_FARMER_VERIFICATION',
        'TALUKA_DAILY_TARGETS',
        'TALUKA_WORK_ALLOCATION',
        'TALUKA_ATTENDANCE_APPROVAL',
        'TALUKA_PENDING_SAMPLES',
        'TALUKA_ANALYTICS',
        'TALUKA_COMPLAINTS',
        'TALUKA_STAFF_MONITORING',
        'DISTRICT_DASHBOARD',
        'DISTRICT_TALUKA_MONITORING',
        'DISTRICT_PERFORMANCE_REPORTS',
        'DISTRICT_APPROVALS',
        'DISTRICT_REVENUE_DASHBOARD',
        'DISTRICT_SAMPLE_TRACKING',
        'DISTRICT_DRONE_OPERATIONS',
        'DISTRICT_STAFF_TRANSFERS',
        // Plus Regional Operations
        'REGIONAL_DASHBOARD',
        'REGIONAL_DISTRICT_COMPARISON',
        'REGIONAL_TARGET_ACHIEVEMENT',
        'REGIONAL_REVENUE_ANALYTICS',
        'REGIONAL_ESCALATION_CENTER',
        'REGIONAL_REPORTS',
        'REGIONAL_DISTRICT_RANKING',
      ],
      [UserRoleLevel.STATE_ADMIN]: [
        'STATE_OPERATIONS_HEAD',
        'STATEWIDE_REPORTS',
        'STATE_USER_APPROVALS',
        'STATE_FINANCE_MONITORING',
        'STATE_CAMPAIGN_MANAGEMENT',
        'STATE_MIS_DASHBOARD',
      ],
      [UserRoleLevel.SUPER_ADMIN]: [
        '*', // Inherits Every Permission + Multi-Tenant Control
        'PLATFORM_CONFIGURATION',
        'MULTI_TENANT_ORGANIZATIONS',
        'SECURITY_KEYS_JWT',
        'PAYMENT_GATEWAY_MASTER',
        'TESTING_AGENCY_MASTERS',
        'FEATURE_FLAGS_MANAGEMENT',
      ],
    };

    return permissionsMap[primaryRole] || [];
  }

  // Dynamic Menu Builder based on Cumulative Role Claims
  resolveDynamicMenu(primaryRole: UserRoleLevel): {
    supportedModes: ('FIELD' | 'MANAGEMENT')[];
    defaultMode: 'FIELD' | 'MANAGEMENT';
    menus: MenuItem[];
  } {
    const menus: MenuItem[] = [];
    const supportedModes: ('FIELD' | 'MANAGEMENT')[] = ['FIELD'];
    let defaultMode: 'FIELD' | 'MANAGEMENT' = 'FIELD';

    // Field Activities Menu (Shared for MAHA_AGRIDOOT, Taluka, District, Regional)
    if ([
      UserRoleLevel.MAHA_AGRIDOOT,
      UserRoleLevel.TALUKA_COORDINATOR,
      UserRoleLevel.DISTRICT_COORDINATOR,
      UserRoleLevel.REGIONAL_MANAGER
    ].includes(primaryRole)) {
      menus.push(
        { id: 'f-01', title: 'Farmer Registration', icon: 'person_add', route: '/field/farmer-reg', category: 'FIELD' },
        { id: 'f-02', title: 'GPS Attendance', icon: 'location_on', route: '/field/attendance', category: 'FIELD' },
        { id: 'f-03', title: 'Soil Sample Collection', icon: 'science', route: '/field/soil-sample', category: 'FIELD' },
        { id: 'f-04', title: 'QR Code Scanner', icon: 'qr_code_scanner', route: '/field/qr-scan', category: 'FIELD' },
        { id: 'f-05', title: 'Drone Lead Generation', icon: 'flight_takeoff', route: '/field/drone-lead', category: 'FIELD' },
      );
    }

    // Management Modes & Menus
    if ([UserRoleLevel.TALUKA_COORDINATOR, UserRoleLevel.DISTRICT_COORDINATOR, UserRoleLevel.REGIONAL_MANAGER].includes(primaryRole)) {
      supportedModes.push('MANAGEMENT');
      defaultMode = 'MANAGEMENT';

      if (primaryRole === UserRoleLevel.TALUKA_COORDINATOR) {
        menus.push(
          { id: 't-01', title: 'Taluka Targets & Allocation', icon: 'assignment', route: '/taluka/targets', category: 'TALUKA' },
          { id: 't-02', title: 'Attendance Approvals', icon: 'fact_check', route: '/taluka/attendance', category: 'TALUKA' },
          { id: 't-03', title: 'Taluka Soil Analytics', icon: 'analytics', route: '/taluka/analytics', category: 'TALUKA' },
        );
      }

      if (primaryRole === UserRoleLevel.DISTRICT_COORDINATOR) {
        menus.push(
          { id: 'd-01', title: 'District Command Center', icon: 'dashboard', route: '/district/command', category: 'DISTRICT' },
          { id: 'd-02', title: 'Taluka Monitoring & Approvals', icon: 'rule', route: '/district/monitoring', category: 'DISTRICT' },
          { id: 'd-03', title: 'District Revenue & Drones', icon: 'payments', route: '/district/revenue', category: 'DISTRICT' },
        );
      }

      if (primaryRole === UserRoleLevel.REGIONAL_MANAGER) {
        menus.push(
          { id: 'r-01', title: 'Regional Dashboard', icon: 'public', route: '/regional/dashboard', category: 'REGIONAL' },
          { id: 'r-02', title: 'District Comparison & Ranking', icon: 'leaderboard', route: '/regional/ranking', category: 'REGIONAL' },
          { id: 'r-03', title: 'Regional Escalation Center', icon: 'warning', route: '/regional/escalations', category: 'REGIONAL' },
        );
      }
    }

    // Super Admin Dedicated Console
    if (primaryRole === UserRoleLevel.SUPER_ADMIN) {
      menus.push(
        { id: 'sa-01', title: 'Multi-Tenant Organizations', icon: 'corporate_fare', route: '/super-admin/orgs', category: 'SUPER_ADMIN' },
        { id: 'sa-02', title: 'Platform Security & JWT Keys', icon: 'vpn_key', route: '/super-admin/security', category: 'SUPER_ADMIN' },
        { id: 'sa-03', title: 'Payment Gateway Master', icon: 'account_balance_wallet', route: '/super-admin/payment-gateways', category: 'SUPER_ADMIN' },
        { id: 'sa-04', title: 'External Lab Agency Master', icon: 'biotech', route: '/super-admin/lab-agencies', category: 'SUPER_ADMIN' },
      );
    }

    return { supportedModes, defaultMode, menus };
  }
}
