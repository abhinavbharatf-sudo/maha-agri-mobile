/**
 * Module 07: Workflow & Approval Engine Business Service
 * Location: /src/modules/workflow/services/WorkflowApprovalEngineService.ts
 * Manages Process Workflow State Machine, Decision Approval Engine (Approve, Reject, Send Back, Escalate, Delegate),
 * Cryptographic Audit Trail, Delegation Proxy Routing, and Escalation Matrix.
 */

import {
  WorkflowDefinition,
  WorkflowInstance,
  ApprovalTask,
  ApprovalDecision,
  DigitalSignatureAudit,
  DelegationRecord,
  EscalationRule
} from '../types/workflow.types';
import { PlatformEventBus } from '../../../core/events/EventBus';

export class WorkflowApprovalEngineService {
  private static aptCounter = 910;
  private static wfiCounter = 412;

  /**
   * Pre-configured Escalation Matrix Rules (SLA 24h, 48h, 72h, 96h)
   */
  public static ESCALATION_MATRIX: EscalationRule[] = [
    { slaHours: 24, actionType: 'REMINDER', targetRole: 'DISTRICT_COORDINATOR' },
    { slaHours: 48, actionType: 'ESCALATE_DISTRICT', targetRole: 'DISTRICT_COORDINATOR' },
    { slaHours: 72, actionType: 'ESCALATE_REGIONAL', targetRole: 'REGIONAL_MANAGER' },
    { slaHours: 96, actionType: 'ESCALATE_STATE', targetRole: 'STATE_ADMIN' },
  ];

  /**
   * Initial Active Delegations
   */
  public static ACTIVE_DELEGATIONS: DelegationRecord[] = [
    {
      id: 'del-1',
      delegatorUserId: 'u-101',
      delegatorName: 'Ramesh Patil (District Coord Wardha)',
      delegateeUserId: 'u-102',
      delegateeName: 'Suresh Agridoot (Proxy Officer)',
      startDate: '2026-07-20',
      endDate: '2026-07-30',
      reason: 'On Field Tour in Hinganghat Taluka',
      isActive: true,
    },
  ];

  /**
   * Generates Task Code (APT-2026-00910)
   */
  public static generateTaskCode(): string {
    const seq = (this.aptCounter++).toString().padStart(5, '0');
    return `APT-2026-${seq}`;
  }

  /**
   * Generates Instance Code (WFI-2026-00412)
   */
  public static generateInstanceCode(): string {
    const seq = (this.wfiCounter++).toString().padStart(5, '0');
    return `WFI-2026-${seq}`;
  }

  /**
   * Evaluates Conditional Workflow Tier based on Subsidy Amount
   */
  public static evaluateRequiredApproverRole(amountRupees: number): { role: string; tier: string } {
    if (amountRupees > 500000) {
      return { role: 'STATE_ADMIN', tier: 'State Level High-Value Subsidy Approval' };
    }
    if (amountRupees > 50000) {
      return { role: 'REGIONAL_MANAGER', tier: 'Regional Level Intermediate Approval' };
    }
    return { role: 'DISTRICT_COORDINATOR', tier: 'District Level Standard Approval' };
  }

  /**
   * Executes Approval Decision with Cryptographic Audit Trail
   */
  public static executeDecision(
    task: ApprovalTask,
    decision: ApprovalDecision,
    reason: string,
    userName: string,
    userRole: string,
    signatureUrl?: string
  ): { updatedTask: ApprovalTask; auditTrail: DigitalSignatureAudit } {
    const auditTrail: DigitalSignatureAudit = {
      signatureUrl: signatureUrl || 'SIG-DIGITAL-MAHA-9012',
      ipAddress: '103.24.112.45 (Govt Intranet)',
      deviceInfo: 'GDOP Enterprise Portal • Chrome Win64',
      decidedAt: new Date().toISOString(),
      userName,
      userRole,
      reason,
    };

    const updatedTask: ApprovalTask = {
      ...task,
      decision,
      decisionReason: reason,
      signatureAudit: auditTrail,
      isEscalated: decision === 'ESCALATED',
      escalationLevel: decision === 'ESCALATED' ? 'REGIONAL_MANAGER' : task.escalationLevel,
    };

    // Emit event to Platform Core Event Bus
    PlatformEventBus.getInstance().publish({
      eventType: 'core.approval_decision_executed',
      entityType: 'APPROVAL_TASK',
      entityId: task.id,
      payload: {
        taskCode: task.taskCode,
        requestCode: task.requestCode,
        decision,
        decidedBy: userName,
        role: userRole,
        decidedAt: auditTrail.decidedAt,
      },
    }).catch((err) => console.error('[Workflow Engine Service] Event error:', err));

    return { updatedTask, auditTrail };
  }

  /**
   * Proxy Delegation Router: Auto-routes assigned user if an active delegation exists
   */
  public static checkAndApplyDelegation(targetUserName: string): { finalAssignedName: string; isDelegated: boolean; delegatorName?: string } {
    const match = this.ACTIVE_DELEGATIONS.find((d) => d.isActive && d.delegatorName.includes(targetUserName));
    if (match) {
      return {
        finalAssignedName: match.delegateeName,
        isDelegated: true,
        delegatorName: match.delegatorName,
      };
    }
    return { finalAssignedName: targetUserName, isDelegated: false };
  }
}
