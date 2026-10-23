import { REQUEST_TIMEOUT_MS, SITE_URL } from '../config';

export const uid = (): string =>
  typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? crypto.randomUUID()
    : Math.random().toString(36).slice(2, 11);

export const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

export const round2 = (v: number): number => Math.round(v * 100) / 100;

export const fmtQty = (v: number): string => (Number.isInteger(v) ? String(v) : String(round2(v)));

export const plural = (n: number, one: string, many: string = one + 's'): string => (n === 1 ? one : many);

/** Rejects with Error("timeout") if the promise takes longer than `ms`. */
export function withTimeout<T>(promise: PromiseLike<T>, ms: number = REQUEST_TIMEOUT_MS): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error('timeout')), ms);
  });
  return Promise.race([Promise.resolve(promise), timeout]).finally(() => clearTimeout(timer));
}

export function errorMessage(err: unknown): string {
  if (err && typeof err === 'object' && 'message' in err) return String((err as { message: unknown }).message);
  return typeof err === 'string' ? err : '';
}

export function friendlyError(err: unknown): string {
  const msg = errorMessage(err);
  if (msg === 'timeout') return 'The service took too long to answer. Check your connection and try again.';
  if (/failed to fetch|networkerror|load failed|network request failed/i.test(msg)) {
    return 'Could not reach the service. Check your connection and try again.';
  }
  return msg || 'Something went wrong. Please try again.';
}

/** True when running inside the Android app (Capacitor) rather than a browser. */
export function isNativeApp(): boolean {
  const cap = (window as unknown as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return cap?.isNativePlatform?.() === true;
}

/** Where Supabase should send people after they click an email link. */
export function redirectUrl(): string | undefined {
  if (isNativeApp()) return SITE_URL || undefined;
  return /^https?:/.test(window.location.protocol) ? window.location.origin + window.location.pathname : undefined;
}

/** Saves any JSON value as a file download. */
export function downloadJson(data: unknown, filename: string): void {
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
