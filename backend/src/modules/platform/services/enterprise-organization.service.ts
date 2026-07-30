// ============================================================================
// MAHA-AGRI Government Digital Operations Platform (v1.1.0 Enterprise Foundation)
// Organization & Project Hierarchy, Multi-Role Mapping, Project Permissions,
// Laboratory Billing, Chain of Custody & Enterprise Approval Matrix
// ============================================================================

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { UserRoleLevel, TestingAgencyType } from './role-inheritance.service';

export interface MultiRoleUser {
  userId: string;
  fullName: string;
  mobileNumber: string;
  organizationId: string; // e.g. "org-abhinav-bharat"
  assignedRoles: UserRoleLevel[];
  activeRole: UserRoleLevel;
  assignedProjectIds: string[];
}

export interface CustodyEvent {
  eventId: string;
  sampleId: string;
  stage: 'COLLECTED' | 'RECEIVED' | 'PAYMENT_VERIFIED' | 'ASSIGNED_LAB' | 'TESTING_STARTED' | 'QC_APPROVED' | 'REPORT_GENERATED' | 'DELIVERED';
  actorUserId: string;
  actorRole: UserRoleLevel;
  timestamp: string;
  gpsLat?: number;
  gpsLng?: number;
  deviceId?: string;
  remarks?: string;
}

export interface LabBillingRecord {
  sampleId: string;
  labAgencyType: TestingAgencyType;
  baseCostInr: number;
  subsidizedCostInr: number;
  farmerPaidInr: number;
  billingStatus: 'PENDING' | 'VERIFIED' | 'RECONCILED';
}

@Injectable()
export class EnterpriseOrganizationService {
  private readonly logger = new Logger(EnterpriseOrganizationService.name);

  private usersMap = new Map<string, MultiRoleUser>();
  private custodyChainMap = new Map<string, CustodyEvent[]>();
  private labBillingMap = new Map<string, LabBillingRecord>();
  private labCapacityMap = new Map<string, { dailyMaxCapacity: number; currentCount: number }>();

  constructor() {
    // Seed Wardha Govt Lab Capacity (500 samples/day)
    this.labCapacityMap.set('agency-01', { dailyMaxCapacity: 500, currentCount: 420 });
  }

  // 1. Multi-Role User Mapping & Role Switcher
  async registerMultiRoleUser(params: {
    userId: string;
    fullName: string;
    mobileNumber: string;
    organizationId: string;
    assignedRoles: UserRoleLevel[];
    assignedProjectIds: string[];
  }): Promise<MultiRoleUser> {
    const user: MultiRoleUser = {
      userId: params.userId,
      fullName: params.fullName,
      mobileNumber: params.mobileNumber,
      organizationId: params.organizationId || 'org-maha-agri-govt',
      assignedRoles: params.assignedRoles,
      activeRole: params.assignedRoles[0] || UserRoleLevel.MAHA_AGRIDOOT,
      assignedProjectIds: params.assignedProjectIds || ['proj-soil-health', 'proj-edp-drone'],
    };

    this.usersMap.set(params.userId, user);
    this.logger.log(`[Enterprise Organization] Multi-Role User Registered: ${user.fullName} with Roles [${user.assignedRoles.join(', ')}]`);
    return user;
  }

  async switchActiveRole(userId: string, targetRole: UserRoleLevel) {
    const user = this.usersMap.get(userId);
    if (!user) {
      // Create user on the fly if not existing
      return {
        success: true,
        userId,
        activeRole: targetRole,
        message: `Switched active role to ${targetRole}`,
      };
    }

    if (!user.assignedRoles.includes(targetRole) && user.activeRole !== UserRoleLevel.SUPER_ADMIN) {
      throw new BadRequestException(`Role ${targetRole} is not assigned to user ${userId}`);
    }

    user.activeRole = targetRole;
    return {
      success: true,
      userId,
      activeRole: user.activeRole,
      message: `Active role switched to ${user.activeRole} without re-authentication`,
    };
  }

  // 2. Chain of Custody Logging
  async logCustodyEvent(event: Omit<CustodyEvent, 'eventId' | 'timestamp'>) {
    const custodyEvent: CustodyEvent = {
      ...event,
      eventId: `custody-${Date.now()}`,
      timestamp: new Date().toISOString(),
    };

    const history = this.custodyChainMap.get(event.sampleId) || [];
    history.push(custodyEvent);
    this.custodyChainMap.set(event.sampleId, history);

    this.logger.log(`[Chain of Custody] Sample ${event.sampleId} stage moved to ${event.stage} by User ${event.actorUserId}`);
    return custodyEvent;
  }

  async getSampleChainOfCustody(sampleId: string) {
    return {
      success: true,
      sampleId,
      chainOfCustody: this.custodyChainMap.get(sampleId) || [],
    };
  }

  // 3. Laboratory Billing & Cost Tracking
  async calculateAndRecordLabBilling(sampleId: string, labAgencyType: TestingAgencyType) {
    const pricingMap: Record<TestingAgencyType, number> = {
      [TestingAgencyType.INTERNAL_GOVT]: 0,
      [TestingAgencyType.EXTERNAL_NABL_PRIVATE]: 350,
      [TestingAgencyType.UNIVERSITY_RESEARCH]: 250,
      [TestingAgencyType.NGO_SECTION8]: 150,
    };

    const cost = pricingMap[labAgencyType] ?? 0;
    const record: LabBillingRecord = {
      sampleId,
      labAgencyType,
      baseCostInr: cost,
      subsidizedCostInr: Math.max(0, cost - 100),
      farmerPaidInr: cost === 0 ? 0 : 50,
      billingStatus: 'VERIFIED',
    };

    this.labBillingMap.set(sampleId, record);
    return record;
  }

  // 4. Lab Capacity Warning & Overflow Routing
  async checkLabCapacity(labAgencyId: string) {
    const capacity = this.labCapacityMap.get(labAgencyId) || { dailyMaxCapacity: 500, currentCount: 120 };
    const isCapacityExceeded = capacity.currentCount >= capacity.dailyMaxCapacity;

    return {
      success: true,
      labAgencyId,
      dailyMaxCapacity: capacity.dailyMaxCapacity,
      currentCount: capacity.currentCount,
      isCapacityExceeded,
      warningMessage: isCapacityExceeded
        ? 'CAPACITY_EXCEEDED: Laboratory daily processing threshold reached. Recommend routing overflow samples to external NABL lab.'
        : 'Capacity Healthy',
    };
  }

  // 5. Enterprise Approval Matrix Engine
  async evaluateApprovalMatrix(action: 'SAMPLE_DELETE' | 'REPORT_REOPEN' | 'PAYMENT_OVERRIDE' | 'PRICE_CHANGE' | 'EXTERNAL_LAB_APPROVE', requesterRole: UserRoleLevel) {
    const requiredApprovalMap: Record<string, UserRoleLevel[]> = {
      'SAMPLE_DELETE': [UserRoleLevel.DISTRICT_COORDINATOR, UserRoleLevel.STATE_ADMIN, UserRoleLevel.SUPER_ADMIN],
      'REPORT_REOPEN': [UserRoleLevel.SOIL_CHEMIST, UserRoleLevel.DISTRICT_COORDINATOR, UserRoleLevel.STATE_ADMIN, UserRoleLevel.SUPER_ADMIN],
      'PAYMENT_OVERRIDE': [UserRoleLevel.STATE_ADMIN, UserRoleLevel.SUPER_ADMIN],
      'PRICE_CHANGE': [UserRoleLevel.SUPER_ADMIN],
      'EXTERNAL_LAB_APPROVE': [UserRoleLevel.STATE_ADMIN, UserRoleLevel.SUPER_ADMIN],
    };

    const allowedRoles = requiredApprovalMap[action] || [];
    const isPermitted = allowedRoles.includes(requesterRole) || requesterRole === UserRoleLevel.SUPER_ADMIN;

    if (!isPermitted) {
      throw new BadRequestException(`APPROVAL_REQUIRED: Action ${action} requires authorization from [${allowedRoles.join(', ')}]`);
    }

    return {
      success: true,
      action,
      requesterRole,
      isAuthorized: true,
    };
  }
}
