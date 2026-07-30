/**
 * RBAC — Role-Based Access Control.
 *
 * Role hierarchy is ordered from most to least privileged. `hasRoleAtLeast`
 * lets guards express "admin or higher" without enumerating every role.
 * Permissions are keyed as "module:action" strings stored in rbac_permissions.
 */

import type { RoleKey } from '../types/database';

export const ROLE_HIERARCHY: RoleKey[] = [
  'ROOT_SUPER_ADMIN',
  'STATE_ADMIN',
  'DISTRICT_COORDINATOR',
  'TALUKA_COORDINATOR',
  'MAHA_AGRIDOOT',
  'EDP_AGRI_ENTREPRENEUR',
  'DRONE_ENTREPRENEUR',
  'FARMER',
  'super_admin',
  'admin',
  'hr_manager',
  'crm_manager',
  'hr_executive',
  'team_leader',
  'telecaller',
  'editor',
  'staff',
  'volunteer',
  'member',
];

export function roleRank(role: RoleKey): number {
  return ROLE_HIERARCHY.indexOf(role);
}

export function hasRoleAtLeast(userRole: RoleKey | null, required: RoleKey): boolean {
  if (!userRole) return false;
  return roleRank(userRole) <= roleRank(required);
}

export function hasRole(userRole: RoleKey | null, ...roles: RoleKey[]): boolean {
  if (!userRole) return false;
  return roles.includes(userRole);
}

export type PermissionKey =
  | 'users:read'
  | 'users:write'
  | 'users:delete'
  | 'cms:read'
  | 'cms:write'
  | 'cms:publish'
  | 'files:read'
  | 'files:write'
  | 'audit:read'
  | 'notifications:read'
  | 'notifications:write'
  | 'settings:read'
  | 'settings:write';

export function hasPermission(
  permissions: Set<string>,
  key: PermissionKey
): boolean {
  return permissions.has(key);
}

export function hasAnyPermission(
  permissions: Set<string>,
  keys: PermissionKey[]
): boolean {
  return keys.some((k) => permissions.has(k));
}
