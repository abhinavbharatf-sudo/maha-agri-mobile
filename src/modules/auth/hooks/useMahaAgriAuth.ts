/**
 * Custom React Hook for MAHA-AGRI Authentication Operations
 */

import { useMahaAgriAuthContext } from '../context/MahaAgriAuthContext';

export function useMahaAgriAuth() {
  return useMahaAgriAuthContext();
}
