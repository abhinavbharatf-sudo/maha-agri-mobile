/**
 * Phase 2 Foundation Service 1: Generic Workflow Engine
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Configurable state-machine supporting transitions, conditions, role permissions,
 * approval/rejection/verification, audit logging, and process history tracking.
 * Reusable across Recruitment, Soil Testing, EDP, Loan, Farmer Services & future modules.
 */

import { AuditLogger } from '../audit/auditLogger';

export interface WorkflowState {
  key: string;
  label: string;
  color: string; // Tailwind color token
  progressPercentage: number;
  isInitial?: boolean;
  isTerminal?: boolean;
}

export interface WorkflowTransition {
  id: string;
  fromState: string;
  toState: string;
  actionLabel: string;
  requiredRole: string[]; // Allowed role keys
  requiredPermission?: string;
  requiresNotes?: boolean;
  nextAllowedActions?: string[];
}

export interface WorkflowDefinition {
  workflowId: string;
  platformSlug: string;
  moduleSlug: string;
  name: string;
  version: string;
  states: WorkflowState[];
  transitions: WorkflowTransition[];
}

export interface WorkflowHistoryRecord {
  id: string;
  entityId: string;
  workflowId: string;
  fromState: string;
  toState: string;
  actionLabel: string;
  performedByUserId: string;
  performedByUserName: string;
  performedByRole: string;
  notes?: string;
  timestamp: string;
}

export class WorkflowEngineService {
  private definitions: Map<string, WorkflowDefinition> = new Map();
  private history: WorkflowHistoryRecord[] = [];

  constructor() {
    this.seedDefaultWorkflows();
  }

  /**
   * Seed core process workflows (EDP Lifecycle, Soil Lab Testing, HR Recruitment, Loan Approvals)
   */
  private seedDefaultWorkflows() {
    // 1. EDP-AGRI Entrepreneur 17-Stage Lifecycle Workflow
    const edpWorkflow: WorkflowDefinition = {
      workflowId: 'wf-edp-lifecycle',
      platformSlug: 'maha-agri',
      moduleSlug: 'edp',
      name: 'EDP Entrepreneur Lifecycle Process',
      version: 'v1.0.0',
      states: [
        { key: 'REGISTERED', label: '1. Registered', color: 'slate', progressPercentage: 5, isInitial: true },
        { key: 'DOCS_PENDING', label: '2. Documents Pending', color: 'amber', progressPercentage: 15 },
        { key: 'DOCS_VERIFIED', label: '3. Documents Verified', color: 'blue', progressPercentage: 25 },
        { key: 'TRAINING_ASSIGNED', label: '4. Training Assigned', color: 'indigo', progressPercentage: 35 },
        { key: 'TRAINING_IN_PROGRESS', label: '5. Training In Progress', color: 'purple', progressPercentage: 50 },
        { key: 'TRAINING_COMPLETED', label: '6. Training Completed', color: 'teal', progressPercentage: 60 },
        { key: 'ASSESSMENT_PASSED', label: '7. Assessment Passed', color: 'cyan', progressPercentage: 70 },
        { key: 'CERTIFIED', label: '8. Certified Entrepreneur', color: 'emerald', progressPercentage: 80 },
        { key: 'LOAN_APPROVED', label: '9. Loan Approved', color: 'emerald', progressPercentage: 90 },
        { key: 'BUSINESS_ACTIVE', label: '10. Business Active & Operating', color: 'green', progressPercentage: 100, isTerminal: true },
      ],
      transitions: [
        {
          id: 'tr-01',
          fromState: 'REGISTERED',
          toState: 'DOCS_PENDING',
          actionLabel: 'Submit Documents',
          requiredRole: ['EDP_AGRI_ENTREPRENEUR', 'MAHA_AGRIDOOT', 'ROOT_SUPER_ADMIN'],
        },
        {
          id: 'tr-02',
          fromState: 'DOCS_PENDING',
          toState: 'DOCS_VERIFIED',
          actionLabel: 'Verify Verification Documents',
          requiredRole: ['DISTRICT_COORDINATOR', 'TALUKA_COORDINATOR', 'SUPER_ADMIN', 'ROOT_SUPER_ADMIN'],
          requiresNotes: true,
        },
        {
          id: 'tr-03',
          fromState: 'DOCS_VERIFIED',
          toState: 'TRAINING_ASSIGNED',
          actionLabel: 'Assign EDP Training Course',
          requiredRole: ['DISTRICT_COORDINATOR', 'SUPER_ADMIN', 'ROOT_SUPER_ADMIN'],
        },
        {
          id: 'tr-04',
          fromState: 'TRAINING_ASSIGNED',
          toState: 'TRAINING_IN_PROGRESS',
          actionLabel: 'Begin Training Modules',
          requiredRole: ['EDP_AGRI_ENTREPRENEUR'],
        },
        {
          id: 'tr-05',
          fromState: 'TRAINING_IN_PROGRESS',
          toState: 'TRAINING_COMPLETED',
          actionLabel: 'Mark Training Complete',
          requiredRole: ['EDP_AGRI_ENTREPRENEUR', 'DISTRICT_COORDINATOR'],
        },
        {
          id: 'tr-06',
          fromState: 'TRAINING_COMPLETED',
          toState: 'ASSESSMENT_PASSED',
          actionLabel: 'Record Assessment Passing Grade',
          requiredRole: ['DISTRICT_COORDINATOR', 'SUPER_ADMIN'],
        },
        {
          id: 'tr-07',
          fromState: 'ASSESSMENT_PASSED',
          toState: 'CERTIFIED',
          actionLabel: 'Issue Government Certificate',
          requiredRole: ['STATE_ADMIN', 'SUPER_ADMIN', 'ROOT_SUPER_ADMIN'],
        },
        {
          id: 'tr-08',
          fromState: 'CERTIFIED',
          toState: 'LOAN_APPROVED',
          actionLabel: 'Approve Equipment Loan',
          requiredRole: ['STATE_ADMIN', 'SUPER_ADMIN'],
        },
        {
          id: 'tr-09',
          fromState: 'LOAN_APPROVED',
          toState: 'BUSINESS_ACTIVE',
          actionLabel: 'Deploy Agri-Drone Operations',
          requiredRole: ['EDP_AGRI_ENTREPRENEUR', 'DISTRICT_COORDINATOR'],
        },
      ],
    };

    this.definitions.set(edpWorkflow.workflowId, edpWorkflow);
  }

  public registerWorkflow(def: WorkflowDefinition): void {
    this.definitions.set(def.workflowId, def);
  }

  public getWorkflow(workflowId: string): WorkflowDefinition | undefined {
    return this.definitions.get(workflowId);
  }

  /**
   * Execute state transition with role permission enforcement and audit log tracking
   */
  public executeTransition(params: {
    workflowId: string;
    entityId: string;
    fromState: string;
    toState: string;
    userId: string;
    userName: string;
    userRole: string;
    notes?: string;
  }): { success: boolean; error?: string; historyRecord?: WorkflowHistoryRecord } {
    const wf = this.getWorkflow(params.workflowId);
    if (!wf) {
      return { success: false, error: 'Workflow definition not found.' };
    }

    // Find valid transition
    const transition = wf.transitions.find(
      (t) => t.fromState === params.fromState && t.toState === params.toState
    );

    if (!transition) {
      return { success: false, error: `Invalid transition from ${params.fromState} to ${params.toState}.` };
    }

    // Role check
    if (!transition.requiredRole.includes(params.userRole) && params.userRole !== 'ROOT_SUPER_ADMIN') {
      return { success: false, error: `Role '${params.userRole}' is not authorized to execute this transition.` };
    }

    const record: WorkflowHistoryRecord = {
      id: `wf-hist-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      entityId: params.entityId,
      workflowId: params.workflowId,
      fromState: params.fromState,
      toState: params.toState,
      actionLabel: transition.actionLabel,
      performedByUserId: params.userId,
      performedByUserName: params.userName,
      performedByRole: params.userRole,
      notes: params.notes,
      timestamp: new Date().toISOString(),
    };

    this.history.unshift(record);

    // Audit log
    AuditLogger.logAction({
      userId: params.userId,
      userName: params.userName,
      roleKey: params.userRole,
      platformSlug: wf.platformSlug,
      action: `WORKFLOW_TRANSITION_${transition.actionLabel.toUpperCase().replace(/\s+/g, '_')}`,
      entityType: wf.moduleSlug.toUpperCase(),
      entityId: params.entityId,
      details: `Moved ${params.entityId} from ${params.fromState} to ${params.toState}. Notes: ${params.notes || 'None'}`,
      ipAddress: '127.0.0.1',
      userAgent: 'WorkflowEngine/v1.0',
    });

    return { success: true, historyRecord: record };
  }

  public getHistoryForEntity(entityId: string): WorkflowHistoryRecord[] {
    return this.history.filter((h) => h.entityId === entityId);
  }
}

export const WorkflowEngine = new WorkflowEngineService();
