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
  isDevelopment: boolean;
}

function resolveEnv(): AppEnv {
  const envObj = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : process.env;
  const raw = envObj.VITE_APP_ENV;
  if (raw === 'production' || raw === 'staging') return raw;
  return 'development';
}

const envObj = typeof import.meta !== 'undefined' && import.meta.env ? import.meta.env : process.env;

const env: EnvConfig = {
  supabaseUrl: envObj.VITE_SUPABASE_URL || '',
  supabaseAnonKey: envObj.VITE_SUPABASE_ANON_KEY || '',
  appName: envObj.VITE_APP_NAME ?? 'Abhinav Bharat Foundation',
  appEnv: resolveEnv(),
  isProduction: resolveEnv() === 'production',
  isDevelopment: resolveEnv() === 'development',
};

if (!env.supabaseUrl || !env.supabaseAnonKey) {
  console.error('[env] Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY');
}

export default env;
export type { EnvConfig, AppEnv };
