// ============================================================================
// MAHA-AGRI Government Digital Operations Platform (v1.2.0 Enterprise Release)
// Dynamic Workflow Engine, Drag-and-Drop Form Builder, Feature Flag System,
// Payment Verification Lock, Payment Sources & External Lab Dispatch Panel
// ============================================================================

import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { TestingAgencyType } from './role-inheritance.service';

export enum PaymentStatus {
  PAID = 'PAID',
  PARTIALLY_PAID = 'PARTIALLY_PAID',
  UNPAID = 'UNPAID',
  PAYMENT_PENDING = 'PAYMENT_PENDING',
  EXEMPT = 'EXEMPT',
}

export enum PaymentSource {
  ONLINE_GATEWAY = 'ONLINE_GATEWAY',
  OFFLINE_CASH = 'OFFLINE_CASH',
  BANK_TRANSFER = 'BANK_TRANSFER',
  INSTITUTION_CREDIT = 'INSTITUTION_CREDIT',
  NGO_SPONSORED = 'NGO_SPONSORED',
  GOVT_SPONSORED = 'GOVT_SPONSORED',
  CORPORATE_SPONSORED = 'CORPORATE_SPONSORED',
  INTERNAL_ADJUSTMENT = 'INTERNAL_ADJUSTMENT',
}

export interface WorkflowState {
  stateId: string;
  stateName: string;
  allowedTransitions: string[];
  isLockedIfPaymentPending: boolean;
}

export interface DynamicFormSchema {
  formId: string;
  formName: string;
  projectId: string;
  fields: { name: string; label: string; type: 'text' | 'number' | 'select' | 'file' | 'date'; required: boolean }[];
}

export interface ExternalLabDispatch {
  dispatchId: string;
  sampleId: string;
  labAgencyId: string;
  testingAgencyType: TestingAgencyType;
  dispatchDate: string;
  courierTrackingNumber: string;
  expectedReportDate: string;
  labChargesInr: number;
  contactPerson: string;
  status: 'DISPATCHED' | 'RECEIVED_BY_EXTERNAL_LAB' | 'REPORT_IMPORTED' | 'VERIFIED';
}

@Injectable()
export class DynamicEnginesService {
  private readonly logger = new Logger(DynamicEnginesService.name);

  private featureFlagsMap = new Map<string, boolean>([
    ['DRONE_MODULE', true],
    ['SOIL_MODULE', true],
    ['NURSERY_MODULE', true],
    ['WATER_TESTING_MODULE', true],
    ['LIVESTOCK_MODULE', false],
    ['EXTERNAL_LAB_DISPATCH', true],
  ]);

  private workflowsMap = new Map<string, WorkflowState[]>();
  private formSchemasMap = new Map<string, DynamicFormSchema>();
  private externalDispatchesMap = new Map<string, ExternalLabDispatch>();

  constructor() {
    // Default Soil Workflow Engine Configuration
    this.workflowsMap.set('proj-soil-health', [
      { stateId: 'COLLECTED', stateName: 'Sample Collected', allowedTransitions: ['PAYMENT_VERIFIED', 'PAYMENT_PENDING'], isLockedIfPaymentPending: false },
      { stateId: 'PAYMENT_VERIFIED', stateName: 'Payment Verified', allowedTransitions: ['ASSIGNED_LAB'], isLockedIfPaymentPending: false },
      { stateId: 'ASSIGNED_LAB', stateName: 'Assigned to Laboratory', allowedTransitions: ['TESTING_IN_PROGRESS'], isLockedIfPaymentPending: true },
      { stateId: 'TESTING_IN_PROGRESS', stateName: '12-Param Testing', allowedTransitions: ['QC_APPROVED'], isLockedIfPaymentPending: true },
      { stateId: 'QC_APPROVED', stateName: 'QC Approved', allowedTransitions: ['REPORT_GENERATED'], isLockedIfPaymentPending: true },
      { stateId: 'REPORT_GENERATED', stateName: 'Soil Health Card Issued', allowedTransitions: ['DELIVERED'], isLockedIfPaymentPending: true },
    ]);
  }

  // 1. Feature Flag Management (No-Code Module Toggle)
  async getFeatureFlags() {
    return {
      success: true,
      flags: Object.fromEntries(this.featureFlagsMap),
    };
  }

  async setFeatureFlag(flagName: string, isEnabled: boolean) {
    this.featureFlagsMap.set(flagName, isEnabled);
    this.logger.log(`[Feature Flag] Flag ${flagName} set to ${isEnabled}`);
    return { success: true, flagName, isEnabled };
  }

  // 2. Strict Payment Verification Lock Enforcement
  validatePaymentLock(paymentStatus: PaymentStatus, userHasOverride: boolean = false): { isLocked: boolean; reason?: string } {
    if ((paymentStatus === PaymentStatus.UNPAID || paymentStatus === PaymentStatus.PAYMENT_PENDING) && !userHasOverride) {
      return {
        isLocked: true,
        reason: 'Payment Verification Pending: Test Entry, QC Approval and Report Generation are locked until payment is verified or override is granted.',
      };
    }
    return { isLocked: false };
  }

  // 3. Dynamic Form Builder Engine (JSON Schema Generation)
  async saveFormSchema(schema: DynamicFormSchema) {
    this.formSchemasMap.set(schema.formId, schema);
    this.logger.log(`[Form Builder] Saved Form Schema ${schema.formName} (${schema.formId}) for Project ${schema.projectId}`);
    return { success: true, schema };
  }

  async getFormSchema(formId: string) {
    return {
      success: true,
      data: this.formSchemasMap.get(formId) || null,
    };
  }

  // 4. External Laboratory Panel & Dispatch Tracking
  async dispatchToExternalLab(params: {
    sampleId: string;
    labAgencyId: string;
    testingAgencyType: TestingAgencyType;
    courierTrackingNumber: string;
    expectedReportDate: string;
    labChargesInr: number;
    contactPerson: string;
  }): Promise<ExternalLabDispatch> {
    const dispatch: ExternalLabDispatch = {
      dispatchId: `dispatch-${Date.now()}`,
      sampleId: params.sampleId,
      labAgencyId: params.labAgencyId,
      testingAgencyType: params.testingAgencyType,
      dispatchDate: new Date().toISOString(),
      courierTrackingNumber: params.courierTrackingNumber,
      expectedReportDate: params.expectedReportDate,
      labChargesInr: params.labChargesInr,
      contactPerson: params.contactPerson,
      status: 'DISPATCHED',
    };

    this.externalDispatchesMap.set(params.sampleId, dispatch);
    this.logger.log(`[External Lab Panel] Sample ${params.sampleId} dispatched to ${params.labAgencyId} via Courier #${params.courierTrackingNumber}`);
    return dispatch;
  }

  async getExternalDispatchStatus(sampleId: string) {
    const dispatch = this.externalDispatchesMap.get(sampleId);
    if (!dispatch) throw new NotFoundException(`External dispatch record for sample ${sampleId} not found`);
    return { success: true, data: dispatch };
  }
}
