import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { SUPABASE_ANON_KEY, SUPABASE_URL } from '../config';

let client: SupabaseClient | null | undefined;

/**
 * The one Supabase client for the whole app. Everything that talks to Supabase
 * (sign-in in src/auth, cloud saving in src/sync) gets it from here.
 * Returns null if it cannot be created.
 */
export function getClient(): SupabaseClient | null {
  if (client !== undefined) return client;
  try {
    client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (err) {
    // Some preview windows block browser storage. Retry without saving the session.
    try {
      client = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
        auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false }
      });
    } catch (err2) {
      console.error(err, err2);
      client = null;
    }
  }
  return client;
}
