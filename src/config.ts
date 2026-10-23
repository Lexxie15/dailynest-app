// Project settings. The values after "||" are your current Supabase project, so
// the app still works if the two environment variables are not set.
// The publishable key is meant to be public; row-level security protects data.

export const SUPABASE_URL: string =
  (import.meta.env.VITE_SUPABASE_URL as string | undefined) || 'https://fwfqkkmghjlbattcpgpk.supabase.co';

export const SUPABASE_ANON_KEY: string =
  (import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined) || 'sb_publishable_iUlyKrr4rVZaTh9DaL2rrw_e9pE6vYt';

/**
 * Where email links (confirm account, reset password) should open. Leave empty for the website,
 * which uses its own address. The Android app MUST set this to the hosted site, because inside
 * the app the address is https://localhost, which a phone cannot open from an email.
 */
export const SITE_URL: string = (import.meta.env.VITE_SITE_URL as string | undefined) || '';

/** How long to wait for Supabase before giving up and showing an error. */
export const REQUEST_TIMEOUT_MS = 20000;

/** Wait this long after an edit before uploading (so quick taps are saved together). */
export const SYNC_DEBOUNCE_MS = 1000;
/** If more edits arrived during an upload, try again after this long. */
export const SYNC_RETRY_MS = 700;
/** Background check for changes made on another device. */
export const SYNC_INTERVAL_MS = 60000;

/** Local storage key prefix. Kept identical to the single-file app so existing local data is found. */
export const STORAGE_PREFIX = 'dailynest.v1.';
