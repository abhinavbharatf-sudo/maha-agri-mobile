/**
 * Universal Service Request Engine Business Service (Enhanced Enterprise)
 * Location: /src/modules/requests/services/ServiceRequestEngineService.ts
 * Manages Service Request creation (MA-REQ-000155), Case Abstraction,
 * Advanced 4-Tier SLA Engine (Target, Warning, Critical, Expired), and Request Sources.
 */

import { ServiceRequest, ServiceRequestStatus, RequestPriority, ServiceCode, RequestStatusLog, SlaStatusLevel } from '../types/service_request.types';
import { PlatformEventBus } from '../../../core/events/EventBus';

export class ServiceRequestEngineService {
  private static reqCounter = 155;

  /**
   * Generates Request Code (MA-REQ-000155)
   */
  public static generateRequestCode(): string {
    const seq = (this.reqCounter++).toString().padStart(6, '0');
    return `MA-REQ-${seq}`;
  }

  /**
   * Calculates Advanced SLA Status Level (TARGET_SLA, WARNING_SLA, CRITICAL_SLA, EXPIRED_SLA)
   */
  public static calculateSlaStatusLevel(createdIso: string, deadlineIso: string): SlaStatusLevel {
    const now = new Date().getTime();
    const start = new Date(createdIso).getTime();
    const end = new Date(deadlineIso).getTime();

    if (now >= end) return 'EXPIRED_SLA';

    const totalDuration = end - start;
    const elapsed = now - start;
    const ratio = elapsed / totalDuration;

    if (ratio > 0.95) return 'CRITICAL_SLA';
    if (ratio > 0.8) return 'WARNING_SLA';
    return 'TARGET_SLA';
  }

  /**
   * Transition Service Request Status
   */
  public static transitionStatus(
    request: ServiceRequest,
    newStatus: ServiceRequestStatus,
    remarks: string,
    assignedToName?: string
  ): { updatedRequest: ServiceRequest; statusLog: RequestStatusLog } {
    const statusLog: RequestStatusLog = {
      id: `LOG-${Date.now()}`,
      requestId: request.id,
      fromStatus: request.status,
      toStatus: newStatus,
      remarks,
      changedAt: new Date().toISOString(),
    };

    const updatedRequest: ServiceRequest = {
      ...request,
      status: newStatus,
      assignedToName: assignedToName || request.assignedToName,
      updatedAt: new Date().toISOString(),
    };

    PlatformEventBus.getInstance().publish({
      eventType: 'core.request_status_changed',
      entityType: 'SERVICE_REQUEST',
      entityId: request.id,
      payload: {
        requestCode: request.requestCode,
        fromStatus: request.status,
        toStatus: newStatus,
        assignedTo: assignedToName,
      },
    }).catch((err) => console.error('[ServiceRequestEngineService] Event error:', err));

    return { updatedRequest, statusLog };
  }
}
