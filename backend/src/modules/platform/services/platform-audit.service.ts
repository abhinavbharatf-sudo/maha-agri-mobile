// ============================================================================
// MAHA-AGRI Government Digital Operations Platform
// Priority 1: Platform Core Module v1.0 — Domain 7: Audit Engine Service
// Standardized 9-Column Audit Envelope & User Activity Logs
// ============================================================================

import { Injectable, Logger } from '@nestjs/common';

@Injectable()
export class PlatformAuditService {
  private readonly logger = new Logger(PlatformAuditService.name);
  private auditLogsMap = new Map<string, any[]>();

  async logAuditRecord(params: {
    userId?: string;
    moduleName: string;
    actionType: string;
    resourceName: string;
    actionDetails: string;
    ipAddress?: string;
  }) {
    const logId = `audit-${Date.now()}`;
    const record = {
      id: logId,
      userId: params.userId || 'SYSTEM',
      moduleName: params.moduleName,
      actionType: params.actionType,
      resourceName: params.resourceName,
      actionDetails: params.actionDetails,
      ipAddress: params.ipAddress || '127.0.0.1',
      timestamp: new Date().toISOString(),
    };

    const logs = this.auditLogsMap.get(params.moduleName) || [];
    logs.push(record);
    this.auditLogsMap.set(params.moduleName, logs);

    this.logger.log(`[Platform Core Audit Engine] Audit record logged for module '${params.moduleName}' (${params.actionType})`);
    return { success: true, data: record };
  }

  async getModuleAuditLogs(moduleName: string) {
    return {
      success: true,
      moduleName,
      data: this.auditLogsMap.get(moduleName) || [],
    };
  }
}
