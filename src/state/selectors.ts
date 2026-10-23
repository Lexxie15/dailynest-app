// Everything the screens show that is worked out from the saved data.
// None of these change anything; they only read.

import { daysBetween, daysLeftInMonth, monthKey, today } from '../lib/dates';
import { fmtQty, num, plural } from '../lib/util';
import type { AppState, Bill, Routine, ShopItem, StockItem, Task, TabId, Weather, WeatherOk } from './types';

export const byId = <T extends { id: string }>(list: T[], id: string): T | undefined => list.find((x) => x.id === id);

export const isWeatherOk = (w: Weather): w is WeatherOk => !!w && !w.err;

export function dayTasks(s: AppState, key: string): Task[] {
  return s.tasks
    .filter((t) => t.date === key)
    .sort((a, b) => (a.time || '99:99').localeCompare(b.time || '99:99'));
}

export const waterToday = (s: AppState): number => num(s.water[today()]);

export const stockLow = (s: AppState): StockItem[] => s.stock.filter((i) => num(i.qty) <= num(i.low));

export const routineGap = (r: Routine): number => daysBetween(r.last || '1970-01-01', today()) - num(r.every || 1);

export const routineDue = (s: AppState): Routine[] => s.routines.filter((r) => routineGap(r) >= 0 && r.area !== 'Personal');

/** [label, style] */
export function routineStatus(r: Routine): [string, 'crit' | 'warn' | 'good'] {
  const g = routineGap(r);
  if (g > 0) return ['Overdue ' + g + ' d', 'crit'];
  if (g === 0) return ['Due today', 'warn'];
  return ['In ' + -g + ' d', 'good'];
}

export interface MoneyNow {
  spent: number;
  bills: number;
  savings: number;
  income: number;
  available: number;
  perDay: number;
}

/** available = income - all bills - savings - spent this month */
export function moneyNow(s: AppState): MoneyNow {
  const m = s.money;
  const mk = monthKey();
  const spent = m.tx.filter((x) => x.date.slice(0, 7) === mk).reduce((a, x) => a + num(x.amt), 0);
  const bills = m.bills.reduce((a, b) => a + num(b.amt), 0);
  const available = num(m.income) - bills - num(m.savings) - spent;
  return { spent, bills, savings: num(m.savings), income: num(m.income), available, perDay: available / daysLeftInMonth() };
}

export function formatMoney(v: number, cur: string): string {
  const c = cur || '$';
  const n = Math.abs(v);
  const text = n.toLocaleString(undefined, { minimumFractionDigits: n < 1000 ? 2 : 0, maximumFractionDigits: 2 });
  return (v < 0 ? '−' : '') + c + (c.length > 1 ? ' ' : '') + text;
}

export function billsDueSoon(s: AppState): Bill[] {
  const mk = monthKey();
  const d = new Date().getDate();
  return s.money.bills.filter((b) => b.paid !== mk && num(b.day) - d <= 3 && num(b.day) - d >= -10);
}

export function billStatus(b: Bill): [string, 'good' | 'crit' | 'warn' | 'mute'] {
  const diff = num(b.day) - new Date().getDate();
  if (b.paid === monthKey()) return ['Paid', 'good'];
  if (diff < 0) return ['Overdue', 'crit'];
  if (diff <= 3) return ['Due soon', 'warn'];
  return ['Upcoming', 'mute'];
}

export function onShoppingList(s: AppState, stockId: string): boolean {
  return s.shop.some((x) => x.stockId === stockId);
}

export function navBadge(s: AppState, tab: TabId): number {
  if (tab === 'home') return stockLow(s).length + routineDue(s).length;
  if (tab === 'money') return billsDueSoon(s).length;
  return 0;
}

export function weatherCodeText(c: number): string {
  if (c === 0) return 'Clear';
  if (c <= 3) return 'Partly cloudy';
  if (c === 45 || c === 48) return 'Fog';
  if (c >= 51 && c <= 67) return 'Rain';
  if (c >= 80 && c <= 82) return 'Showers';
  if (c >= 95) return 'Thunderstorms';
  return 'Cloudy';
}

export function weatherLine(s: AppState, w: Weather): string {
  if (!s.profile.weatherLocation) return 'Choose your weather town in Me';
  if (!w) return 'Weather loading…';
  if (w.err) return 'Weather unavailable right now';
  const stale = w.fetched && Date.now() - w.fetched > 3600000 ? 'Cached · ' : '';
  return (
    stale +
    Math.round(w.temp) + '° ' + weatherCodeText(w.code) +
    ' · high ' + Math.round(w.hi) + '°' +
    ' · UV ' + Math.round(w.uv) +
    ' · rain ' + Math.round(w.rain) + '%'
  );
}

export interface Attention {
  text: string;
  go: TabId | null;
  act?: 'water';
}

export function attention(s: AppState, w: Weather): Attention[] {
  const out: Attention[] = [];
  const h = new Date().getHours();
  const goal = num(s.profile.waterGoal);
  const water = waterToday(s);
  const cur = s.profile.cur;

  if (isWeatherOk(w) && w.uv >= 3) {
    out.push({ text: 'UV is ' + Math.round(w.uv) + ' today. Put on sunscreen before you go out and reapply every 2 hours outdoors.', go: null });
  }
  if (isWeatherOk(w) && w.hi >= 33) {
    out.push({ text: 'It is hot today (' + Math.round(w.hi) + '°). Drink a little extra and keep outdoor jobs to the morning.', go: null });
  }
  if (h >= 11 && water < goal * 0.4) {
    out.push({ text: 'Water is at ' + water + ' ml of ' + goal + ' ml. Have a glass now.', go: null, act: 'water' });
  } else if (h >= 16 && water < goal * 0.75) {
    out.push({ text: 'Water is at ' + water + ' ml of ' + goal + ' ml. Catch up before evening.', go: null, act: 'water' });
  }

  const low = stockLow(s);
  if (low.length) {
    out.push({
      text:
        low.length + ' ' + plural(low.length, 'item is', 'items are') + ' low at home: ' +
        low.slice(0, 3).map((i) => i.name).join(', ') + (low.length > 3 ? '…' : '') + '.',
      go: 'home'
    });
  }
  for (const b of billsDueSoon(s)) {
    out.push({ text: b.name + ' (' + formatMoney(num(b.amt), cur) + ') is due on day ' + b.day + '.', go: 'money' });
  }
  const due = routineDue(s);
  if (due.length) {
    out.push({
      text:
        due.length + ' home ' + plural(due.length, 'routine is', 'routines are') + ' due: ' +
        due.slice(0, 2).map((r) => r.name).join(', ') + (due.length > 2 ? '…' : '') + '.',
      go: 'home'
    });
  }
  return out;
}

export function planAdvice(w: WeatherOk): string {
  const a: string[] = [];
  if (w.hi >= 33) a.push('Hot day: put errands and outdoor jobs before 10:00 or after 15:30.');
  if (w.rain >= 50) a.push('Rain is likely, so keep indoor tasks for the afternoon and dry laundry inside.');
  else if (w.hi >= 30) a.push('Good drying weather. Wash early and hang laundry out before 10:00.');
  if (w.uv >= 3) a.push('UV is ' + Math.round(w.uv) + '. Wear sunscreen for anything outdoors.');
  return a.join(' ') || 'A mild day. Plan outdoor jobs whenever suits you.';
}

export function taskMeta(t: Task): string {
  return [t.time || null, t.area, t.mins ? t.mins + ' minutes' : null].filter(Boolean).join(' · ');
}

export function stockRemaining(i: StockItem): string {
  return num(i.qty) <= 0 ? 'none left' : fmtQty(num(i.qty)) + ' ' + i.unit + ' remaining';
}

export const shopToBuy = (s: AppState): number => s.shop.filter((x: ShopItem) => !x.done).length;

export function hasExamples(s: AppState): boolean {
  return s.tasks.some((x) => x.ex) || s.stock.some((x) => x.ex) || s.routines.some((x) => x.ex);
}
