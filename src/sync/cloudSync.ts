// Keeps one person's data in two places: this browser, and one row in Supabase.
//
// Rules (same as the single-file app):
//  - Every edit is saved to the browser straight away and marked "dirty".
//  - Dirty data is uploaded through the `dailynest_save_state` SQL function, which
//    only accepts the upload if its revision number matches the cloud's.
//  - If another device got there first, nothing is overwritten. The person is asked
//    to choose a side (see resolveUseCloud / resolveUseLocal).
//
// React never talks to Supabase for data. It creates one CloudSync per signed-in user,
// calls markChanged() after each edit, and shows whatever onView() reports.

import { getClient } from '../lib/supabase';
import { today } from '../lib/dates';
import { downloadJson, errorMessage, withTimeout } from '../lib/util';
import { SYNC_RETRY_MS, SYNC_INTERVAL_MS, SYNC_DEBOUNCE_MS, STORAGE_PREFIX } from '../config';
import { emptyState, normalize } from '../state/defaults';
import type { AppState } from '../state/types';

export interface CloudRow {
  data: unknown;
  revision: number;
  updated_at: string;
}

export interface SyncView {
  status: string;
  conflict: boolean;
  dirty: boolean;
}

export interface SyncHost {
  /** The current data. Must always return the newest copy. */
  getState: () => AppState;
  /** Replace the on-screen data with this (it came from the cloud). Must not count as an edit. */
  applyRemote: (state: AppState) => void;
  /** Called whenever the status line, conflict flag or dirty flag changes. */
  onView: (view: SyncView) => void;
  /** Short messages for the toast. */
  onNotice: (text: string) => void;
}

export const storeKey = (userId: string): string => STORAGE_PREFIX + userId;
const metaKey = (userId: string): string => storeKey(userId) + '.sync';

/** Reads this person's saved copy from the browser. Never throws. */
export function loadLocalState(userId: string): { state: AppState; warning?: string } {
  try {
    const raw = localStorage.getItem(storeKey(userId));
    if (raw) return { state: normalize(JSON.parse(raw)) };
  } catch (err) {
    console.error(err);
    return { state: emptyState(), warning: 'Your local data could not be read. It has not been deliberately erased.' };
  }
  return { state: emptyState() };
}

const typing = (): boolean => !!document.querySelector('input:focus,select:focus,textarea:focus');
const stamp = (iso: string): string => new Date(iso).toLocaleString();

export class CloudSync {
  private revision: number | null = null;
  private dirty = false;
  private ready = false;
  private conflict = false;
  private busy = false;
  private generation = 0;
  private status = 'Loading private cloud records…';
  private lastSeen: string | null = null;
  private saveWarned = false;
  private disposed = false;
  private timer: ReturnType<typeof setTimeout> | undefined;
  private interval: ReturnType<typeof setInterval> | undefined;

  private readonly onOnline = (): void => void this.syncNow();
  private readonly onVisible = (): void => {
    if (!document.hidden && !typing()) void this.syncNow();
  };

  constructor(
    private readonly userId: string,
    private readonly host: SyncHost
  ) {}

  // ---------- life cycle ----------

  /** Reads the cloud copy, decides what to do about it, then starts the background syncing. */
  async start(): Promise<void> {
    await this.bootstrap();
    if (this.disposed) return;
    window.addEventListener('online', this.onOnline);
    document.addEventListener('visibilitychange', this.onVisible);
    this.interval = setInterval(() => {
      if (!document.hidden && !typing()) void this.syncNow();
    }, SYNC_INTERVAL_MS);
    if (this.ready && !this.conflict) void this.syncNow();
  }

  dispose(): void {
    this.disposed = true;
    clearTimeout(this.timer);
    clearInterval(this.interval);
    window.removeEventListener('online', this.onOnline);
    document.removeEventListener('visibilitychange', this.onVisible);
  }

  get isDirty(): boolean {
    return this.dirty;
  }

  // ---------- reporting ----------

  private setStatus(text: string): void {
    this.status = text;
    this.emit();
  }

  private emit(): void {
    if (this.disposed) return;
    this.host.onView({ status: this.status, conflict: this.conflict, dirty: this.dirty });
  }

  private failure(err: unknown): void {
    console.error(err);
    this.setStatus(
      'Not synced: ' +
        (errorMessage(err) || 'Connection unavailable') +
        '. Your local changes are retained. Run the included SQL if the cloud table or function is missing.'
    );
  }

  // ---------- browser copy ----------

  private localSave(state: AppState = this.host.getState()): void {
    try {
      localStorage.setItem(storeKey(this.userId), JSON.stringify(state));
      localStorage.setItem(metaKey(this.userId), JSON.stringify({ revision: this.revision, dirty: this.dirty }));
    } catch {
      if (!this.saveWarned) {
        this.saveWarned = true;
        this.host.onNotice('Local saving is blocked. Keep the page open until cloud sync succeeds, or export a backup.');
      }
    }
  }

  /** Call after every edit. Saves to the browser now, and to the cloud a moment later. */
  markChanged(): void {
    if (this.disposed) return;
    this.dirty = true;
    this.generation++;
    this.localSave();
    this.setStatus(
      this.conflict
        ? 'Conflict: both this device and the cloud changed. Resolve it before syncing.'
        : 'Changes pending cloud sync.'
    );
    clearTimeout(this.timer);
    this.timer = setTimeout(() => void this.syncNow(), SYNC_DEBOUNCE_MS);
  }

  // ---------- cloud reads and writes ----------

  async fetchCloudRow(): Promise<CloudRow | null> {
    const client = getClient();
    if (!client) throw new Error('The cloud service could not start in this browser.');
    const { data, error } = await withTimeout<{ data: unknown; error: unknown }>(
      client.from('dailynest_state').select('data,revision,updated_at').eq('user_id', this.userId).maybeSingle()
    );
    if (error) throw error;
    return (data as CloudRow | null) ?? null;
  }

  private takeRemote(row: CloudRow): void {
    const state = normalize(row.data);
    this.revision = row.revision;
    this.dirty = false;
    this.conflict = false;
    this.lastSeen = row.updated_at;
    this.host.applyRemote(state);
    this.localSave(state);
    this.setStatus('Cloud up to date · ' + stamp(row.updated_at));
  }

  private async bootstrap(): Promise<void> {
    this.ready = false;
    try {
      let meta: { revision?: unknown; dirty?: unknown } | null = null;
      try {
        meta = JSON.parse(localStorage.getItem(metaKey(this.userId)) || 'null');
      } catch {
        meta = null;
      }
      this.revision = meta && Number.isInteger(meta.revision) ? (meta.revision as number) : null;
      this.dirty = meta ? !!meta.dirty : !!localStorage.getItem(storeKey(this.userId));

      const row = await this.fetchCloudRow();
      if (this.disposed) return;
      this.ready = true;

      if (row) {
        if (this.dirty) {
          if (this.revision !== row.revision) {
            this.conflict = true;
            this.setStatus('Cloud and local records differ. Resolve conflict; neither copy was overwritten.');
          } else {
            this.setStatus('Local changes ready to upload.');
          }
        } else {
          this.takeRemote(row);
        }
      } else if (this.revision !== null) {
        this.conflict = true;
        this.setStatus('The cloud copy is missing. Resolve before recreating it.');
      } else {
        this.dirty = true;
        this.setStatus('Ready to create your private cloud copy.');
      }
      this.localSave();
      this.emit();
    } catch (err) {
      if (!this.disposed) this.failure(err);
    }
  }

  async syncNow(): Promise<void> {
    if (this.disposed || this.busy || this.conflict) return;
    const client = getClient();
    if (!client) return;
    this.busy = true;
    try {
      if (!this.ready) {
        await this.bootstrap();
        if (this.disposed || !this.ready || this.conflict) return;
      }

      if (this.dirty) {
        const gen = this.generation;
        const payload = JSON.parse(JSON.stringify(this.host.getState())) as AppState;
        this.setStatus('Saving to your private cloud…');
        const { data, error } = await withTimeout(
          client.rpc('dailynest_save_state', { p_data: payload, p_expected_revision: this.revision })
        );
        if (this.disposed) return;
        if (error) throw error;
        const res = data as { ok?: boolean; revision?: number; updated_at?: string } | null;
        if (!res || res.ok !== true || typeof res.revision !== 'number' || !res.updated_at) {
          this.conflict = true;
          this.setStatus('Another device changed your cloud copy. Resolve before uploading.');
          return;
        }
        this.revision = res.revision;
        this.lastSeen = res.updated_at;
        this.dirty = this.generation !== gen; // edited while uploading? then still dirty
        this.localSave();
        this.setStatus(this.dirty ? 'More changes pending…' : 'Cloud saved · ' + stamp(res.updated_at));
        if (this.dirty) {
          clearTimeout(this.timer);
          this.timer = setTimeout(() => void this.syncNow(), SYNC_RETRY_MS);
        }
      } else {
        const row = await this.fetchCloudRow();
        if (this.disposed) return;
        if (row && row.revision !== this.revision) {
          // A local edit made during the read must never be replaced.
          if (this.dirty) {
            this.conflict = true;
            this.setStatus('Both devices changed data. Resolve conflict.');
          } else {
            this.takeRemote(row);
          }
        } else {
          this.setStatus('Cloud up to date' + (this.lastSeen ? ' · ' + stamp(this.lastSeen) : ''));
        }
      }
    } catch (err) {
      if (!this.disposed) this.failure(err);
    } finally {
      if (!this.disposed) this.busy = false;
    }
  }

  // ---------- resolving a conflict ----------

  get isBusy(): boolean {
    return this.busy;
  }

  /** Use the cloud copy. The current local copy is downloaded first as a backup. */
  resolveUseCloud(row: CloudRow): void {
    downloadJson(this.host.getState(), 'dailynest-local-before-conflict-' + today() + '.json');
    this.takeRemote(row);
  }

  /** Replace the cloud with this device's copy. The cloud copy is downloaded first as a backup. */
  async resolveUseLocal(row: CloudRow | null): Promise<void> {
    if (row) downloadJson(row.data, 'dailynest-cloud-before-conflict-' + today() + '.json');
    this.revision = row ? row.revision : null;
    this.conflict = false;
    this.ready = true;
    this.dirty = true;
    this.generation++;
    this.localSave();
    this.emit();
    await this.syncNow();
  }

  /** After a backup was restored: nothing special, it is just an edit. */
  noteRestored(): void {
    this.markChanged();
  }
}
