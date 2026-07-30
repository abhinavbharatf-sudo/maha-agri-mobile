/**
 * Enterprise Production Governance & Observability TypeScript Types
 * Location: /src/core/governance/types/governance.types.ts
 */

export interface FeatureFlag {
  id: string;
  flagKey: string; // FLAG_BETA_FORM_BUILDER, FLAG_WHATSAPP_V2
  flagName: string;
  description: string;
  isEnabled: boolean;
  targetScope: 'GLOBAL' | 'PILOT_DISTRICT' | 'SUPER_ADMIN_ONLY';
  pilotDistricts: string[];
  updatedAt: string;
}

export interface ConfigurationEntry {
  id: string;
  configKey: string; // SLA_HOURS, RETRY_COUNT, BATCH_SIZE
  configValue: string;
  dataType: 'NUMBER' | 'STRING' | 'BOOLEAN' | 'JSON';
  category: 'SLA' | 'PAYMENT' | 'NOTIFICATION' | 'SECURITY';
  description: string;
  isReadOnly: boolean;
  updatedAt: string;
}

export interface TenantOrganization {
  id: string;
  tenantCode: string; // TENANT-MAHA-AGRI
  name: string;
  stateName: string; // Maharashtra
  department: string;
  status: 'ACTIVE' | 'SUSPENDED';
}

export interface DataRetentionPolicy {
  id: string;
  moduleName: string;
  archiveRetentionDays: number; // 3650 Days (10 Years)
  purgePolicy: 'NEVER_PURGE' | 'AUTO_PURGE_AFTER_RETENTION' | 'COMPLIANCE_REVIEW';
  status: 'ACTIVE';
}

export interface TelemetryMetric {
  id: string;
  metricName: string;
  metricValue: number;
  unit: string;
  status: 'OPTIMAL' | 'WARNING' | 'CRITICAL';
  timestamp: string;
}
