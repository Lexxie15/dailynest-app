// The shape of everything one person saves. This whole object is what gets
// stored in the browser and synced to Supabase as a single JSON record.

export type TabId = 'today' | 'plan' | 'home' | 'money' | 'me';

export interface Task {
  id: string;
  title: string;
  time: string; // "HH:MM" or ""
  mins: number;
  area: string;
  date: string; // "YYYY-MM-DD"
  done: boolean;
  ex?: boolean; // example item
  routineId?: string;
}

export interface StockItem {
  id: string;
  name: string;
  area: string;
  qty: number;
  unit: string;
  low: number; // counts as "low" at or below this amount
  ex?: boolean;
}

export interface ShopItem {
  id: string;
  name: string;
  unit: string;
  qty: number;
  stockId: string | null;
  done: boolean;
}

export interface Routine {
  id: string;
  name: string;
  area: string; // Laundry | Cleaning | Personal
  every: number; // days
  last: string; // "YYYY-MM-DD"
  ex?: boolean;
}

export interface Bill {
  id: string;
  name: string;
  amt: number;
  day: number; // due day of month, 1-28
  paid: string; // "YYYY-MM" of the month it was last paid, or ""
}

export interface Spend {
  id: string;
  date: string;
  amt: number;
  note: string;
}

export interface WeatherTown {
  lat: number;
  lon: number;
  label: string;
  timezone: string;
}

export interface Profile {
  name: string;
  location: string;
  weatherLocation: WeatherTown | null;
  waterGoal: number;
  cur: string;
}

export interface MoneyState {
  income: number;
  savings: number;
  bills: Bill[];
  tx: Spend[];
}

export interface AppState {
  v: number;
  profile: Profile;
  tasks: Task[];
  water: Record<string, number>; // date -> ml
  energy: Record<string, string>; // date -> Low | Okay | Good | Great
  focusMin: Record<string, number>; // date -> minutes
  stock: StockItem[];
  shop: ShopItem[];
  routines: Routine[];
  money: MoneyState;
}

export interface WeatherOk {
  err?: undefined;
  temp: number;
  code: number;
  hi: number;
  rain: number;
  uv: number;
  fetched: number;
}
export interface WeatherErr {
  err: true;
}
/** null means "still loading". */
export type Weather = WeatherOk | WeatherErr | null;
