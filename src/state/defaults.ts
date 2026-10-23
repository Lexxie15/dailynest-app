import { uid } from '../lib/util';
import type { AppState } from './types';

export function emptyState(): AppState {
  return {
    v: 1,
    profile: { name: '', location: '', weatherLocation: null, waterGoal: 2000, cur: '$' },
    tasks: [],
    water: {},
    energy: {},
    focusMin: {},
    stock: [],
    shop: [],
    routines: [],
    money: { income: 0, savings: 0, bills: [], tx: [] }
  };
}

const SAFE_ID = /^[a-zA-Z0-9_-]{1,100}$/;

/**
 * Makes any stored or downloaded data safe to use: fills in missing fields,
 * forces lists to be lists, and replaces any odd-looking ids.
 */
export function normalize(raw: unknown): AppState {
  const d = emptyState();
  const r = (raw && typeof raw === 'object' ? raw : {}) as Partial<AppState>;
  const out: AppState = Object.assign({}, d, r);
  out.profile = Object.assign({}, d.profile, r.profile || {});
  out.money = Object.assign({ income: 0, savings: 0, bills: [], tx: [] }, r.money || {});
  if (!Array.isArray(out.tasks)) out.tasks = [];
  if (!Array.isArray(out.stock)) out.stock = [];
  if (!Array.isArray(out.shop)) out.shop = [];
  if (!Array.isArray(out.routines)) out.routines = [];
  if (!Array.isArray(out.money.bills)) out.money.bills = [];
  if (!Array.isArray(out.money.tx)) out.money.tx = [];
  if (!out.water || typeof out.water !== 'object') out.water = {};
  if (!out.energy || typeof out.energy !== 'object') out.energy = {};
  if (!out.focusMin || typeof out.focusMin !== 'object') out.focusMin = {};

  const lists: Array<Array<{ id?: unknown }>> = [out.tasks, out.stock, out.shop, out.routines, out.money.bills, out.money.tx];
  for (const list of lists) {
    for (const item of list) {
      if (item && typeof item === 'object' && !SAFE_ID.test(String(item.id || ''))) item.id = uid();
    }
  }
  return out;
}
