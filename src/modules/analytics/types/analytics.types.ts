/**
 * Module 09: Operational Intelligence & Analytics Platform (OIAP) TypeScript Types
 * Location: /src/modules/analytics/types/analytics.types.ts
 */

export type ReportCategory = 'OPERATIONAL' | 'FINANCIAL' | 'AUDIT' | 'COMPLIANCE' | 'PERFORMANCE';

export type ExportFormat = 'PDF' | 'EXCEL' | 'CSV';

export type ExportJobStatus = 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';

export type TimeFilterRange =
  | 'TODAY'
  | 'YESTERDAY'
  | 'THIS_WEEK'
  | 'THIS_MONTH'
  | 'FINANCIAL_YEAR'
  | 'CUSTOM_RANGE';

export interface GeographicDrillDown {
  state: string; // Maharashtra
  region?: string; // Western Maharashtra, Vidarbha
  district?: string; // Pune, Wardha, Nagpur
  taluka?: string; // Haveli, Arvi, Katol
  village?: string;
}

export interface OiapEvent {
  id: string;
  eventCode: string; // EVENT-2026-09012
  eventType: string; // core.request_created, core.mission_completed, etc.
  moduleSource: 'REQUESTS' | 'MISSION' | 'FORMS' | 'WORKFLOW' | 'PAYMENTS' | 'AUTH' | 'UPP';
  entityId: string;
  payloadJson: any;
  district?: string;
  taluka?: string;
  createdAt: string;
}

export interface KpiMetric {
  id: string;
  kpiCode: string;
  schemeCode: string;
  kpiName: string;
  currentValue: number;
  targetThreshold: number;
  unit: string;
  achievementPercentage: number;
}

export interface ReportTemplate {
  id: string;
  reportCode: string; // RPT-DISTRICT-WEEKLY
  title: string;
  category: ReportCategory;
  createdByName: string;
  createdAt: string;
}

export interface ExportJob {
  id: string;
  jobCode: string; // EXP-2026-00412
  reportTitle: string;
  exportFormat: ExportFormat;
  status: ExportJobStatus;
  fileUrl?: string;
  requestedByName: string;
  createdAt: string;
}

export interface ScheduledReportConfig {
  id: string;
  scheduleCode: string;
  reportTitle: string;
  frequency: 'DAILY' | 'WEEKLY' | 'MONTHLY' | 'QUARTERLY';
  recipientRole: string;
  nextRunAt: string;
}

export interface OiapOverallMetrics {
  totalEventsProcessed: number;
  activeKpiScore: number;
  totalExportsGenerated: number;
  scheduledReportsActive: number;
  systemHealthIndex: number;
}
