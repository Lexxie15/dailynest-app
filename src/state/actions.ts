// Every change to the saved data goes through applyAction.
// It never edits the old state: it returns a fresh copy (plus an optional toast message).
// To add a feature: add a case to `Action`, handle it in the switch, call run({...}) from a screen.

import { addDays, monthKey, today } from '../lib/dates';
import { fmtQty, num, round2, uid } from '../lib/util';
import { byId, formatMoney, stockLow } from './selectors';
import { normalize } from './defaults';
import type { AppState, ShopItem, StockItem, WeatherTown } from './types';

export type PlanDay = 'today' | 'tomorrow';

export type Action =
  | { type: 'water' }
  | { type: 'energy'; value: string }
  | { type: 'task-toggle'; id: string }
  | { type: 'task-del'; id: string }
  | { type: 'task-tomorrow'; id: string }
  | { type: 'task-add'; title: string; time: string; mins: number; area: string; day: PlanDay }
  | { type: 'routine-toggle'; id: string }
  | { type: 'routine-done'; id: string }
  | { type: 'routine-del'; id: string }
  | { type: 'routine-plan'; id: string; day: PlanDay }
  | { type: 'routine-add'; name: string; area: string; every: number }
  | { type: 'stock-inc'; id: string }
  | { type: 'stock-dec'; id: string }
  | { type: 'stock-del'; id: string }
  | { type: 'stock-add'; name: string; area: string; unit: string; qty: number; low: number }
  | { type: 'stock-tolist'; id: string }
  | { type: 'low-tolist' }
  | { type: 'shop-add'; name: string; qty: number }
  | { type: 'shop-toggle'; id: string }
  | { type: 'shop-del'; id: string }
  | { type: 'shop-finish' }
  | { type: 'spend-add'; amt: number; note: string }
  | { type: 'tx-del'; id: string }
  | { type: 'bill-add'; name: string; amt: number; day: number }
  | { type: 'bill-toggle'; id: string }
  | { type: 'bill-del'; id: string }
  | { type: 'money-set'; field: 'income' | 'savings'; value: number }
  | { type: 'profile-text'; field: 'name' | 'location'; value: string }
  | { type: 'profile-water-goal'; value: number }
  | { type: 'profile-currency'; value: string }
  | { type: 'choose-town'; town: WeatherTown }
  | { type: 'focus-logged'; minutes: number }
  | { type: 'clear-examples' }
  | { type: 'replace-all'; data: unknown };

export interface ActionResult {
  state: AppState;
  toast?: string;
}

const stepFor = (unit: string): number => (unit === 'kg' || unit === 'L' ? 0.5 : 1);

function shopEntryFromStock(i: StockItem): ShopItem {
  return {
    id: uid(),
    name: i.name,
    unit: i.unit,
    qty: Math.max(1, Math.round((num(i.low) * 2 - num(i.qty)) * 2) / 2),
    stockId: i.id,
    done: false
  };
}

const withStock = (s: AppState, id: string, fn: (i: StockItem) => StockItem): AppState => ({
  ...s,
  stock: s.stock.map((i) => (i.id === id ? fn(i) : i))
});

export function applyAction(s: AppState, a: Action): ActionResult {
  const t = today();

  switch (a.type) {
    case 'water':
      return { state: { ...s, water: { ...s.water, [t]: num(s.water[t]) + 250 } } };

    case 'energy':
      return { state: { ...s, energy: { ...s.energy, [t]: a.value } } };

    case 'task-toggle':
      return { state: { ...s, tasks: s.tasks.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)) } };

    case 'task-del':
      return { state: { ...s, tasks: s.tasks.filter((x) => x.id !== a.id) } };

    case 'task-tomorrow': {
      if (!byId(s.tasks, a.id)) return { state: s };
      return {
        state: { ...s, tasks: s.tasks.map((x) => (x.id === a.id ? { ...x, date: addDays(t, 1), ex: false } : x)) },
        toast: 'Moved to tomorrow'
      };
    }

    case 'task-add': {
      const title = a.title.trim();
      if (!title) return { state: s };
      return {
        state: {
          ...s,
          tasks: [
            ...s.tasks,
            {
              id: uid(),
              title,
              time: a.time,
              mins: Math.min(480, Math.max(5, num(a.mins) || 30)),
              area: a.area,
              date: a.day === 'today' ? t : addDays(t, 1),
              done: false
            }
          ]
        }
      };
    }

    case 'routine-toggle': {
      return {
        state: {
          ...s,
          routines: s.routines.map((r) =>
            r.id === a.id ? { ...r, last: r.last === t ? addDays(t, -num(r.every)) : t, ex: false } : r
          )
        }
      };
    }

    case 'routine-done': {
      if (!byId(s.routines, a.id)) return { state: s };
      return {
        state: { ...s, routines: s.routines.map((r) => (r.id === a.id ? { ...r, last: t, ex: false } : r)) },
        toast: 'Marked done'
      };
    }

    case 'routine-del':
      return { state: { ...s, routines: s.routines.filter((r) => r.id !== a.id) } };

    case 'routine-plan': {
      const r = byId(s.routines, a.id);
      if (!r) return { state: s };
      return {
        state: {
          ...s,
          tasks: [
            ...s.tasks,
            {
              id: uid(),
              title: r.name,
              time: '',
              mins: r.area === 'Laundry' ? 30 : 15,
              area: 'Home',
              date: a.day === 'today' ? t : addDays(t, 1),
              done: false,
              routineId: r.id
            }
          ]
        }
      };
    }

    case 'routine-add': {
      const name = a.name.trim();
      if (!name) return { state: s };
      return {
        state: {
          ...s,
          routines: [
            ...s.routines,
            { id: uid(), name, area: a.area, every: Math.min(365, Math.max(1, num(a.every) || 7)), last: t }
          ]
        }
      };
    }

    case 'stock-inc':
      return {
        state: withStock(s, a.id, (i) => ({ ...i, qty: round2(num(i.qty) + stepFor(i.unit)), ex: false }))
      };

    case 'stock-dec':
      return {
        state: withStock(s, a.id, (i) => ({ ...i, qty: Math.max(0, round2(num(i.qty) - stepFor(i.unit))), ex: false }))
      };

    case 'stock-del':
      return {
        state: {
          ...s,
          stock: s.stock.filter((i) => i.id !== a.id),
          shop: s.shop.map((x) => (x.stockId === a.id ? { ...x, stockId: null } : x))
        }
      };

    case 'stock-add': {
      const name = a.name.trim();
      if (!name) return { state: s };
      return {
        state: {
          ...s,
          stock: [
            ...s.stock,
            { id: uid(), name, area: a.area, qty: num(a.qty), unit: a.unit.trim(), low: num(a.low) }
          ]
        }
      };
    }

    case 'stock-tolist': {
      const i = byId(s.stock, a.id);
      if (!i || s.shop.some((x) => x.stockId === i.id)) return { state: s };
      return { state: { ...s, shop: [...s.shop, shopEntryFromStock(i)] }, toast: 'Added to your shopping list' };
    }

    case 'low-tolist': {
      const add: ShopItem[] = [];
      for (const i of stockLow(s)) {
        if (!s.shop.some((x) => x.stockId === i.id)) add.push(shopEntryFromStock(i));
      }
      const n = add.length;
      return {
        state: { ...s, shop: [...s.shop, ...add] },
        toast: n ? n + ' item' + (n === 1 ? '' : 's') + ' added to your list' : 'Those are already on your list'
      };
    }

    case 'shop-add': {
      const name = a.name.trim();
      if (!name) return { state: s };
      return { state: { ...s, shop: [...s.shop, { id: uid(), name, qty: num(a.qty) || 1, unit: '', stockId: null, done: false }] } };
    }

    case 'shop-toggle':
      return { state: { ...s, shop: s.shop.map((x) => (x.id === a.id ? { ...x, done: !x.done } : x)) } };

    case 'shop-del':
      return { state: { ...s, shop: s.shop.filter((x) => x.id !== a.id) } };

    case 'shop-finish': {
      const bought = s.shop.filter((x) => x.done);
      const stock = s.stock.map((i) => {
        const add = bought.filter((x) => x.stockId === i.id).reduce((sum, x) => sum + num(x.qty), 0);
        return add ? { ...i, qty: round2(num(i.qty) + add) } : i;
      });
      return {
        state: { ...s, stock, shop: s.shop.filter((x) => !x.done) },
        toast: bought.length + ' item' + (bought.length === 1 ? '' : 's') + ' bought. Stock updated.'
      };
    }

    case 'spend-add': {
      const amt = num(a.amt);
      if (!(amt > 0)) return { state: s };
      return {
        state: { ...s, money: { ...s.money, tx: [...s.money.tx, { id: uid(), date: t, amt, note: a.note.trim() }] } },
        toast: formatMoney(amt, s.profile.cur) + ' logged'
      };
    }

    case 'tx-del':
      return { state: { ...s, money: { ...s.money, tx: s.money.tx.filter((x) => x.id !== a.id) } } };

    case 'bill-add': {
      const name = a.name.trim();
      if (!name) return { state: s };
      return {
        state: {
          ...s,
          money: {
            ...s.money,
            bills: [
              ...s.money.bills,
              { id: uid(), name, amt: num(a.amt), day: Math.min(28, Math.max(1, num(a.day) || 1)), paid: '' }
            ]
          }
        }
      };
    }

    case 'bill-toggle': {
      const mk = monthKey();
      return {
        state: {
          ...s,
          money: {
            ...s.money,
            bills: s.money.bills.map((b) => (b.id === a.id ? { ...b, paid: b.paid === mk ? '' : mk } : b))
          }
        }
      };
    }

    case 'bill-del':
      return { state: { ...s, money: { ...s.money, bills: s.money.bills.filter((b) => b.id !== a.id) } } };

    case 'money-set':
      return { state: { ...s, money: { ...s.money, [a.field]: Math.max(0, num(a.value)) } } };

    case 'profile-text':
      return {
        state: { ...s, profile: { ...s.profile, [a.field]: a.value.trim() } },
        toast: 'Saved locally; cloud sync pending'
      };

    case 'profile-water-goal':
      return {
        state: { ...s, profile: { ...s.profile, waterGoal: num(a.value) } },
        toast: 'Saved locally; cloud sync pending'
      };

    case 'profile-currency':
      return {
        state: { ...s, profile: { ...s.profile, cur: a.value } },
        toast: 'Saved locally; cloud sync pending'
      };

    case 'choose-town':
      return {
        state: { ...s, profile: { ...s.profile, weatherLocation: { ...a.town }, location: a.town.label } },
        toast: 'Weather town updated'
      };

    case 'focus-logged':
      return { state: { ...s, focusMin: { ...s.focusMin, [t]: num(s.focusMin[t]) + a.minutes } } };

    case 'clear-examples': {
      const stock = s.stock.filter((x) => !x.ex);
      return {
        state: {
          ...s,
          tasks: s.tasks.filter((x) => !x.ex),
          stock,
          routines: s.routines.filter((x) => !x.ex),
          shop: s.shop.filter((x) => !x.stockId || !!byId(stock, x.stockId))
        },
        toast: 'Example items cleared'
      };
    }

    case 'replace-all':
      return { state: normalize(a.data), toast: 'Backup restored locally; check cloud status.' };
  }
}

// Used by screens that show an amount next to its unit.
export const qtyText = (i: { qty: number; unit: string }): string => fmtQty(num(i.qty)) + ' ' + i.unit;
