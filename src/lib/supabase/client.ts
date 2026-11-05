/**
 * Supabase client singleton.
 *
 * The entire app imports `supabase` from here — never creates a second client.
 * The client is typed against the Database interface for type-safe table access.
 * Service modules that need looser typing for inserts/updates import
 * `supabaseUntyped` which uses the default generic (tables resolved at runtime).
 */

import { createClient } from '@supabase/supabase-js';
import env from '../config/env';
import type { Database } from '../types/database';

export const supabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  }
);

/**
 * Isolated Candidate Portal Supabase client.
 *
 * Dedicated to candidate-side authentication and profile operations. Uses an
 * isolated auth storage key (`maha_candidate_auth_token`) so that Candidate
 * WhatsApp OTP logins, token refreshes, and sign-outs NEVER overwrite or
 * interfere with Admin/HR staff authentication sessions in concurrent browser
 * tabs or workflows.
 */
export const candidateSupabase = createClient<Database>(
  env.supabaseUrl,
  env.supabaseAnonKey,
  {
    auth: {
      storageKey: 'maha_candidate_auth_token',
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  }
);

/**
 * Untyped client for service-layer inserts/updates where the generated
 * Database types are too strict for partial payloads. Return values are
 * cast to the correct types at the service boundary.
 */
export const supabaseUntyped = supabase as any;
