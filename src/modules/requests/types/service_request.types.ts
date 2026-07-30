/**
 * Module 04: Universal Service Request Engine TypeScript Types (Enhanced Enterprise)
 * Location: /src/modules/requests/types/service_request.types.ts
 */

export type ServiceCode = 'SRV001' | 'SRV002' | 'SRV003' | 'SRV004';

export type ServiceRequestStatus =
  | 'SUBMITTED'
  | 'ASSIGNED'
  | 'FIELD_VISIT'
  | 'LAB_VERIFICATION'
  | 'APPROVED'
  | 'COMPLETED'
  | 'REJECTED';

export type RequestPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export type RequestSource =
  | 'MOBILE_APP'
  | 'PORTAL_WEBSITE'
  | 'CALL_CENTER'
  | 'TALUKA_OFFICE'
  | 'CSV_IMPORT'
  | 'API_SYNC';

export type SlaStatusLevel =
  | 'TARGET_SLA'   // Green: On Track (<80% time used)
  | 'WARNING_SLA'  // Amber: Warning (80-95% time used)
  | 'CRITICAL_SLA' // Red: Critical (>95% time used)
  | 'EXPIRED_SLA'; // Dark Red: Overdue & Escalated

export interface ChecklistItem {
  id: string;
  label: string;
  isCompleted: boolean;
  completedAt?: string;
  completedBy?: string;
}

export interface ServiceRequestCase {
  caseId: string;
  caseCode: string; // CASE-2026-0048
  caseType: string; // SOIL_TESTING_CASE, DRONE_SPRAYING_CASE
  status: string;
  createdDate: string;
}

export interface ServiceCatalogItem {
  id: string;
  serviceCode: ServiceCode;
  serviceName: string;
  category: string;
  slaHours: number;
  isActive: boolean;
}

export interface ServiceRequest {
  id: string;
  requestCode: string; // MA-REQ-000155
  serviceCode: ServiceCode;
  serviceName: string;
  applicantUppId: string; // Link to UPP Permanent ID (UPP-000000123)
  applicantName: string;

  // Case Abstraction Layer
  caseInfo?: ServiceRequestCase;

  // Request Source
  requestSource: RequestSource;

  status: ServiceRequestStatus;
  priority: RequestPriority;

  district: string;
  taluka: string;
  village?: string;

  // Advanced SLA Engine
  slaDeadline: string;
  slaLevel: SlaStatusLevel;
  isOverdue: boolean;

  // Universal Verification Checklist
  checklist?: ChecklistItem[];

  assignedToUserId?: string;
  assignedToName?: string;

  createdAt: string;
  updatedAt: string;
}

export interface RequestStatusLog {
  id: string;
  requestId: string;
  fromStatus: ServiceRequestStatus;
  toStatus: ServiceRequestStatus;
  remarks: string;
  changedAt: string;
}

export interface RequestFilterQuery {
  searchQuery?: string;
  serviceCode?: ServiceCode | 'ALL';
  status?: ServiceRequestStatus | 'ALL';
  priority?: RequestPriority | 'ALL';
  source?: RequestSource | 'ALL';
  district?: string;
  isOverdue?: boolean;
}
