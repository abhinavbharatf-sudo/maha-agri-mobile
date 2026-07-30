/**
 * Phase 1: Enterprise Core Security & Permission Engine
 * Abhinav Bharat Foundation Digital Ecosystem
 *
 * Evaluates authorization using: User + Platform + Role + Scope + Permission.
 * Supports 14 Standardized Enterprise Actions:
 * VIEW, CREATE, UPDATE, DELETE, APPROVE, REJECT, VERIFY,
 * EXPORT, PRINT, ASSIGN, TRANSFER, ARCHIVE, RESTORE, HARD_DELETE
 */

export type EnterpriseAction =
  | 'VIEW'
  | 'CREATE'
  | 'UPDATE'
  | 'DELETE'
  | 'APPROVE'
  | 'REJECT'
  | 'VERIFY'
  | 'EXPORT'
  | 'PRINT'
  | 'ASSIGN'
  | 'TRANSFER'
  | 'ARCHIVE'
  | 'RESTORE'
  | 'HARD_DELETE';

export interface UserScopeContext {
  userId: string;
  platformSlug: 'abf' | 'maha-agri' | string;
  roleKey: string;
  assignedRegionIds?: string[];
  assignedDistrictIds?: string[];
  assignedTalukaIds?: string[];
  assignedVillageIds?: string[];
  assignedFarmerIds?: string[];
}

export interface PermissionMatrixRule {
  roleKey: string;
  platformSlug: string;
  moduleSlug: string;
  allowedActions: EnterpriseAction[];
}

// Global Enterprise Default Matrix Rules
export const GLOBAL_PERMISSION_MATRIX: PermissionMatrixRule[] = [
  // 👑 ABF ROOT SUPER ADMIN - Unrestricted Access to ALL Actions & Modules
  {
    roleKey: 'ROOT_SUPER_ADMIN',
    platformSlug: '*',
    moduleSlug: '*',
    allowedActions: [
      'VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT',
      'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN', 'TRANSFER', 'ARCHIVE',
      'RESTORE', 'HARD_DELETE'
    ]
  },

  // 🏛️ ABF PLATFORM ROLES
  {
    roleKey: 'SUPER_ADMIN',
    platformSlug: 'abf',
    moduleSlug: '*',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN', 'TRANSFER', 'ARCHIVE', 'RESTORE']
  },
  {
    roleKey: 'STATE_ADMIN',
    platformSlug: 'abf',
    moduleSlug: '*',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN']
  },
  {
    roleKey: 'HR_MANAGER',
    platformSlug: 'abf',
    moduleSlug: 'hrms',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN']
  },
  {
    roleKey: 'HR_EXECUTIVE',
    platformSlug: 'abf',
    moduleSlug: 'hrms',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'VERIFY', 'EXPORT', 'PRINT']
  },
  {
    roleKey: 'CRM_EXECUTIVE',
    platformSlug: 'abf',
    moduleSlug: 'crm',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'ASSIGN', 'EXPORT']
  },
  {
    roleKey: 'CSM_MANAGER',
    platformSlug: 'abf',
    moduleSlug: 'csm',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'ASSIGN', 'EXPORT']
  },
  {
    roleKey: 'CSM_TELECALLER',
    platformSlug: 'abf',
    moduleSlug: 'csm',
    allowedActions: ['VIEW', 'UPDATE']
  },
  {
    roleKey: 'OFFICE_STAFF',
    platformSlug: 'abf',
    moduleSlug: 'office',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'PRINT']
  },

  // 🌾 MAHA-AGRI PLATFORM ROLES
  {
    roleKey: 'SUPER_ADMIN',
    platformSlug: 'maha-agri',
    moduleSlug: '*',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'DELETE', 'APPROVE', 'REJECT', 'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN', 'TRANSFER', 'ARCHIVE', 'RESTORE']
  },
  {
    roleKey: 'STATE_ADMIN',
    platformSlug: 'maha-agri',
    moduleSlug: '*',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'REJECT', 'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN']
  },
  {
    roleKey: 'REGIONAL_MANAGER',
    platformSlug: 'maha-agri',
    moduleSlug: '*',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN']
  },
  {
    roleKey: 'DISTRICT_COORDINATOR',
    platformSlug: 'maha-agri',
    moduleSlug: '*',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'VERIFY', 'EXPORT', 'PRINT', 'ASSIGN']
  },
  {
    roleKey: 'TALUKA_COORDINATOR',
    platformSlug: 'maha-agri',
    moduleSlug: '*',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'VERIFY', 'PRINT']
  },
  {
    roleKey: 'MAHA_AGRIDOOT',
    platformSlug: 'maha-agri',
    moduleSlug: 'agridoot',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'VERIFY']
  },
  {
    roleKey: 'SOIL_CHEMIST',
    platformSlug: 'maha-agri',
    moduleSlug: 'soil-testing',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'APPROVE', 'VERIFY', 'PRINT', 'EXPORT']
  },
  {
    roleKey: 'FARMER',
    platformSlug: 'maha-agri',
    moduleSlug: 'farmer',
    allowedActions: ['VIEW', 'CREATE', 'PRINT']
  },
  {
    roleKey: 'EDP_AGRI_ENTREPRENEUR',
    platformSlug: 'maha-agri',
    moduleSlug: 'edp',
    allowedActions: ['VIEW', 'CREATE', 'UPDATE', 'PRINT']
  }
];

export class PermissionEngine {
  /**
   * Check if user is authorized to perform an action on a module within a platform
   */
  static isAuthorized(
    context: UserScopeContext,
    moduleSlug: string,
    action: EnterpriseAction
  ): boolean {
    if (context.roleKey === 'ROOT_SUPER_ADMIN') {
      return true;
    }

    const rules = GLOBAL_PERMISSION_MATRIX.filter(
      (rule) =>
        (rule.platformSlug === '*' || rule.platformSlug === context.platformSlug) &&
        (rule.roleKey === '*' || rule.roleKey === context.roleKey) &&
        (rule.moduleSlug === '*' || rule.moduleSlug === moduleSlug)
    );

    for (const rule of rules) {
      if (rule.allowedActions.includes(action)) {
        return true;
      }
    }

    return false;
  }
}
