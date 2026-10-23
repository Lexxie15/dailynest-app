// Date helpers. Dates are plain "YYYY-MM-DD" strings in the person's own time zone.

export const pad = (n: number): string => String(n).padStart(2, '0');

export const dkey = (d: Date = new Date()): string =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const today = (): string => dkey();

export function addDays(key: string, n: number): string {
  const d = new Date(key + 'T12:00:00');
  d.setDate(d.getDate() + n);
  return dkey(d);
}

export function daysBetween(a: string, b: string): number {
  return Math.round((new Date(b + 'T12:00:00').getTime() - new Date(a + 'T12:00:00').getTime()) / 864e5);
}

export const monthKey = (): string => today().slice(0, 7);

export function daysLeftInMonth(): number {
  const n = new Date();
  return new Date(n.getFullYear(), n.getMonth() + 1, 0).getDate() - n.getDate() + 1;
}

export function greeting(): string {
  const h = new Date().getHours();
  return h < 12 ? 'Morning' : h < 17 ? 'Afternoon' : 'Evening';
}
