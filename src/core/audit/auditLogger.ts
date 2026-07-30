/**
 * Phase 1: Enterprise Action Audit Logger
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Tracks every system event with:
 * User, Role, Platform, Action, Entity, IP, Device, Timestamp, Soft-Delete status.
 */

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  roleKey: string;
  platformSlug: string;
  action: string;
  entityType: string;
  entityId?: string;
  details?: string;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  is_active: boolean;
  deleted_at?: string | null;
  deleted_by?: string | null;
}

class AuditLoggerService {
  private logs: AuditLogEntry[] = [];

  constructor() {
    // Seed sample enterprise audit log entries for monitoring
    this.logs = [
      {
        id: 'audit-001',
        userId: 'usr_super_admin_001',
        userName: 'Abhinav Founder (Root Admin)',
        roleKey: 'ROOT_SUPER_ADMIN',
        platformSlug: 'root',
        action: 'SYSTEM_LOGIN',
        entityType: 'AUTHENTICATION',
        details: 'User authenticated successfully via Mobile Number 9876543210',
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
        timestamp: new Date().toISOString(),
        is_active: true,
      },
      {
        id: 'audit-002',
        userId: 'user-mha-26',
        userName: 'Radhika Joshi (Soil Chemist)',
        roleKey: 'SOIL_CHEMIST',
        platformSlug: 'maha-agri',
        action: 'VERIFY_SOIL_REPORT',
        entityType: 'SOIL_SAMPLE',
        entityId: 'SOIL-NGP-2026-88',
        details: 'Approved Soil Health Card parameters for Wardha Lab Batch 4',
        ipAddress: '192.168.1.105',
        userAgent: 'Mozilla/5.0 (Windows NT 10.0; Chrome/124.0)',
        timestamp: new Date(Date.now() - 3600000).toISOString(),
        is_active: true,
      },
    ];
  }

  public logAction(entry: Omit<AuditLogEntry, 'id' | 'timestamp' | 'is_active'>): AuditLogEntry {
    const newEntry: AuditLogEntry = {
      ...entry,
      id: `audit-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
      timestamp: new Date().toISOString(),
      is_active: true,
    };
    this.logs.unshift(newEntry);
    return newEntry;
  }

  public getLogs(platformFilter?: string): AuditLogEntry[] {
    if (!platformFilter || platformFilter === '*') {
      return this.logs.filter((l) => l.is_active);
    }
    return this.logs.filter((l) => l.is_active && l.platformSlug === platformFilter);
  }

  public softDeleteLog(logId: string, deletedByUserId: string): boolean {
    const log = this.logs.find((l) => l.id === logId);
    if (log) {
      log.is_active = false;
      log.deleted_at = new Date().toISOString();
      log.deleted_by = deletedByUserId;
      return true;
    }
    return false;
  }
}

export const AuditLogger = new AuditLoggerService();
