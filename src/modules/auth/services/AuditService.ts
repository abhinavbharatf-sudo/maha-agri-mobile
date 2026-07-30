/**
 * AuditService
 * Business logic layer for rich-metadata security event auditing.
 */

import type { AuditMetadata, SecurityAuditEvent, MahaAgriRoleKey } from '../types/auth.types';
import type { IAuthRepository } from '../repositories/AuthRepository';
import { getDeviceMetadata, getGpsCoordinates } from '../utils/device.utils';

export class AuditService {
  constructor(private authRepo: IAuthRepository) {}

  async logEvent(params: {
    event: SecurityAuditEvent;
    result: 'SUCCESS' | 'FAILURE';
    userId?: string;
    employeeCode?: string;
    roleKey?: MahaAgriRoleKey;
    sessionId?: string;
    reason?: string;
    includeGps?: boolean;
  }): Promise<void> {
    try {
      const deviceMeta = getDeviceMetadata();
      const gps = params.includeGps ? await getGpsCoordinates() : null;

      const entry: AuditMetadata = {
        eventId: `evt_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        event: params.event,
        userId: params.userId,
        employeeCode: params.employeeCode,
        roleKey: params.roleKey,
        device: deviceMeta.device,
        browser: deviceMeta.browser,
        operatingSystem: deviceMeta.operatingSystem,
        gpsCoordinates: gps,
        timestamp: new Date().toISOString(),
        sessionId: params.sessionId,
        result: params.result,
        reason: params.reason,
      };

      await this.authRepo.logAuditEvent(entry);
    } catch (err) {
      console.warn('[AuditService] Failed to record audit log:', err);
    }
  }
}
