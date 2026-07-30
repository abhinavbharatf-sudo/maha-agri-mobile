/**
 * Module 07: Workflow & Approval Engine TypeScript Types
 * Location: /src/modules/workflow/types/workflow.types.ts
 */

export type ApprovalDecision =
  | 'PENDING'
  | 'APPROVED'
  | 'REJECTED'
  | 'RETURNED'
  | 'ESCALATED'
  | 'DELEGATED';

export type EscalationActionType =
  | 'REMINDER'
  | 'ESCALATE_DISTRICT'
  | 'ESCALATE_REGIONAL'
  | 'ESCALATE_STATE';

export interface WorkflowDefinition {
  id: string;
  workflowCode: string; // WF-SUBSIDY-01
  version: string; // v1.0, v2.0
  title: string;
  description: string;
  isParallel: boolean;
  isConditional: boolean;
  amountThresholdRupees: number; // e.g. 50000
  isActive: boolean;
}

export interface WorkflowInstance {
  id: string;
  instanceCode: string; // WFI-2026-00412
  workflowCode: string;
  workflowVersion: string;
  requestCode: string;
  caseCode: string;
  applicantUppId: string;
  applicantName: string;
  currentState: string;
  financialAmountRupees: number;
  isCompleted: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface DigitalSignatureAudit {
  signatureUrl: string;
  ipAddress: string;
  deviceInfo: string;
  decidedAt: string;
  userName: string;
  userRole: string;
  reason?: string;
}

export interface ApprovalTask {
  id: string;
  taskCode: string; // APT-2026-00910
  instanceId: string;
  requestCode: string;
  caseCode: string;
  applicantUppId: string;
  applicantName: string;
  stepName: string;
  approverRole: string; // DISTRICT_COORDINATOR, REGIONAL_MANAGER, STATE_ADMIN
  assignedUserId?: string;
  assignedUserName: string;
  financialAmountRupees: number;

  decision: ApprovalDecision;
  decisionReason?: string;
  signatureAudit?: DigitalSignatureAudit;

  isDelegated: boolean;
  delegatedFromUserName?: string;

  slaDeadline: string;
  isEscalated: boolean;
  escalationLevel?: string;

  createdAt: string;
}

export interface DelegationRecord {
  id: string;
  delegatorUserId: string;
  delegatorName: string;
  delegateeUserId: string;
  delegateeName: string;
  startDate: string;
  endDate: string;
  reason: string;
  isActive: boolean;
}

export interface EscalationRule {
  slaHours: number; // 24, 48, 72, 96
  actionType: EscalationActionType;
  targetRole: string;
}

export type ApprovalInboxFilterView =
  | 'PENDING'
  | 'DELEGATED'
  | 'ESCALATED'
  | 'RETURNED'
  | 'COMPLETED';
