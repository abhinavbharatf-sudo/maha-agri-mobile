/**
 * MAHA-AGRI Authentication Constants
 */

import type { MahaAgriRoleKey } from '../types/auth.types';

export const MAHA_AGRI_ROLES_HIERARCHY: Record<MahaAgriRoleKey, { name: string; level: number; defaultRoute: string }> = {
  SUPER_ADMIN: { name: 'Super Admin', level: 1, defaultRoute: '/dashboard' },
  STATE_ADMIN: { name: 'State Admin', level: 2, defaultRoute: '/admin' },
  REGIONAL_MANAGER: { name: 'Regional Manager', level: 3, defaultRoute: '/crm/dashboard' },
  DISTRICT_COORDINATOR: { name: 'District Coordinator', level: 4, defaultRoute: '/crm/dashboard' },
  TALUKA_COORDINATOR: { name: 'Taluka Coordinator', level: 5, defaultRoute: '/crm/dashboard' },
  MAHA_AGRIDOOT: { name: 'MAHA-AGRIDOOT Field Staff', level: 6, defaultRoute: '/crm/dashboard' },
};

export const AUTH_STORAGE_KEYS = {
  SESSION: 'maha_agri_auth_session',
  ACTIVE_ROLE: 'maha_agri_active_role',
  TOKEN: 'maha_agri_auth_token',
} as const;

export const SECURITY_CONFIG = {
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION_MINUTES: 15,
  OTP_LENGTH: 6,
  OTP_EXPIRY_MINUTES: 10,
  PASSWORD_MIN_LENGTH: 8,
} as const;
