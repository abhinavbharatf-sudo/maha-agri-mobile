/**
 * Module 05: Mission Execution Engine (MEE) TypeScript Types (Enhanced Enterprise)
 * Location: /src/modules/mission/types/mission.types.ts
 */

export type MissionStatus =
  | 'SCHEDULED'
  | 'IN_PROGRESS'
  | 'OFFLINE_RECORDED'
  | 'EVIDENCE_CAPTURED'
  | 'VERIFIED'
  | 'COMPLETED'
  | 'FAILED'
  | 'RETRY_QUEUED';

export type SyncStatus = 'PENDING' | 'SYNCED' | 'CONFLICT' | 'FAILED';

export type ConflictResolutionMode = 'KEEP_SERVER' | 'KEEP_LOCAL' | 'MERGE' | 'MANUAL_REVIEW';

export interface EvidenceValidationRules {
  maxGpsAccuracyMeters: number; // e.g. 5m
  maxPhotoAgeMinutes: number;   // e.g. 2 mins
  requireSignature: boolean;
  requireQrCode: boolean;
}

export interface MissionTemplate {
  id: string;
  templateCode: string; // TPL-SOIL-01, TPL-DRONE-01
  templateName: string;
  defaultTasks: string[];
  validationRules: EvidenceValidationRules;
  requiredDocuments: string[];
}

export interface MissionTask {
  id: string;
  taskName: string;
  taskSequence: number;
  isCompleted: boolean;
  completedAt?: string;
  notes?: string;
}

export interface EvidenceBundle {
  id: string;
  missionId: string;
  gpsLatitude: number;
  gpsLongitude: number;
  gpsAccuracyMeters: number;
  photoUrl: string;
  photoCapturedAt: string;
  qrCodeData?: string;
  digitalSignatureUrl?: string;
  isVerified: boolean;
  validationPassed: boolean;
  validationErrors?: string[];
  verifiedAt: string;
}

export interface OfflineSyncQueueItem {
  id: string;
  missionCode: string;
  payloadJson: any;
  syncStatus: SyncStatus;
  conflictMode?: ConflictResolutionMode;
  retryCount: number;
  queuedAt: string;
  syncedAt?: string;
}

export interface Mission {
  id: string;
  missionCode: string; // MSN-2026-00048
  requestCode: string; // MA-REQ-000155
  caseCode: string; // CASE-2026-0048
  applicantUppId: string; // UPP-000000125
  applicantName: string;

  templateCode?: string;
  serviceName: string;
  assignedStaffId: string;
  assignedStaffName: string;

  status: MissionStatus;
  retryCount?: number;

  district: string;
  taluka: string;
  village?: string;
  targetAddress: string;

  gpsLatitude?: number;
  gpsLongitude?: number;

  tasks: MissionTask[];
  evidence?: EvidenceBundle;
  validationRules?: EvidenceValidationRules;

  scheduledDate: string;
  startedAt?: string;
  completedAt?: string;

  createdAt: string;
  updatedAt: string;
}

export interface MissionAnalyticsMetrics {
  totalMissions: number;
  completed: number;
  pending: number;
  failed: number;
  offlineQueued: number;
  overdue: number;
  avgCompletionTimeMinutes: number;
  evidenceScorePercentage: number;
}

export interface AttendanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  dutyStatus: 'ON_DUTY' | 'ON_BREAK' | 'OFF_DUTY';
  dutyStartedAt: string;
  dutyEndedAt?: string;
  gpsLatitude: number;
  gpsLongitude: number;
}
