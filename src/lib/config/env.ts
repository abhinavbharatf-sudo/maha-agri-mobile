/**
 * Typed environment configuration.
 *
 * Centralises all environment access so the rest of the codebase never reads
 * import.meta.env directly. This makes it easy to audit what the app depends on
 * and to swap providers later without a sweeping refactor.
 */

type AppEnv = 'development' | 'staging' | 'production';

interface EnvConfig {
  supabaseUrl: string;
  supabaseAnonKey: string;
  appName: string;
  appEnv: AppEnv;
  isProduction: boolean;
  isStaging: boolean;
  isDevelopment: boolean;
  projectRef: string;
  isStagingDatabase: boolean;
  isProductionDatabase: boolean;
  isLiveDatabase: boolean;
}

function getRawEnv(): Record<string, any> {
  if (typeof import.meta !== 'undefined' && import.meta.env) {
    return import.meta.env;
  }
  if (typeof process !== 'undefined' && process.env) {
    return process.env;
  }
  return {};
}

function resolveEnv(): AppEnv {
  const envObj = getRawEnv();
  const raw = envObj.VITE_APP_ENV;
  if (raw === 'production' || raw === 'staging') return raw;
  return 'development';
}

function extractProjectRef(url: string): string {
  try {
    if (!url) return '';
    const parsed = new URL(url);
    const hostParts = parsed.hostname.split('.');
    return hostParts[0] || '';
  } catch {
    return '';
  }
}

const envObj = getRawEnv();

const currentAppEnv = resolveEnv();
const activeUrl = envObj.VITE_SUPABASE_URL || '';
const activeKey = envObj.VITE_SUPABASE_ANON_KEY || '';
const activeProjectRef = extractProjectRef(activeUrl);

const STAGING_REF = 'vlpschmvotaunsxcunnn';
const PRODUCTION_REF = 'dmtetjahbxedugszztla';

const isStagingDatabase = activeProjectRef === STAGING_REF && activeKey && !activeKey.includes('PASTE_');
const isProductionDatabase = activeProjectRef === PRODUCTION_REF && activeKey && !activeKey.includes('PASTE_');
const isLiveDatabase = Boolean(isStagingDatabase || isProductionDatabase);

const env: EnvConfig = {
  supabaseUrl: activeUrl,
  supabaseAnonKey: activeKey,
  appName: envObj.VITE_APP_NAME ?? 'Abhinav Bharat Foundation',
  appEnv: currentAppEnv,
  isProduction: currentAppEnv === 'production',
  isStaging: currentAppEnv === 'staging',
  isDevelopment: currentAppEnv === 'development',
  projectRef: activeProjectRef,
  isStagingDatabase: Boolean(isStagingDatabase),
  isProductionDatabase: Boolean(isProductionDatabase),
  isLiveDatabase,
};

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.error('[env] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export default env;
export type { EnvConfig, AppEnv };
