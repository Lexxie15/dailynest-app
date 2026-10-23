// The signed-in app: holds the person's data, keeps it synced, and shows the five tabs.
// Created fresh for each user (App gives it key={user.id}).

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { AuthUser } from './auth/useAuth';
import { BottomNav } from './components/BottomNav';
import { SyncBar } from './components/SyncBar';
import { useDialog } from './components/useDialog';
import { HomeTab } from './features/home/HomeTab';
import { MeTab } from './features/me/MeTab';
import { MoneyTab } from './features/money/MoneyTab';
import { PlanTab } from './features/plan/PlanTab';
import { TodayTab } from './features/today/TodayTab';
import { useFocusTimer } from './hooks/useFocusTimer';
import { useInstallPrompt } from './hooks/useInstallPrompt';
import { useToast } from './hooks/useToast';
import { useWeather } from './hooks/useWeather';
import { today } from './lib/dates';
import { downloadJson, errorMessage, friendlyError } from './lib/util';
import { applyAction, type Action, type PlanDay } from './state/actions';
import { navBadge } from './state/selectors';
import type { AppState, TabId } from './state/types';
import { CloudSync, loadLocalState, type SyncView } from './sync/cloudSync';

interface Props {
  user: AuthUser;
  onSignOut: () => Promise<void>;
}

export function Workspace({ user, onSignOut }: Props) {
  const toast = useToast();
  const { ask, confirm, dialog } = useDialog();
  const install = useInstallPrompt();

  const [state, setState] = useState<AppState>(() => {
    const { state: saved } = loadLocalState(user.id);
    // First visit: use the name and place given at sign-up.
    return {
      ...saved,
      profile: {
        ...saved.profile,
        name: saved.profile.name || user.name,
        location: saved.profile.location || user.location
      }
    };
  });
  const stateRef = useRef(state);
  const syncRef = useRef<CloudSync | null>(null);

  const [ready, setReady] = useState(false);
  const [view, setView] = useState<SyncView>({ status: 'Loading private cloud records…', conflict: false, dirty: false });
  const [tab, setTab] = useState<TabId>('today');
  const [planDay, setPlanDay] = useState<PlanDay>('today');

  const { show } = toast;

  // Start the cloud sync for this person; stop it when they leave.
  useEffect(() => {
    const sync = new CloudSync(user.id, {
      getState: () => stateRef.current,
      applyRemote: (next) => {
        stateRef.current = next;
        setState(next);
      },
      onView: setView,
      onNotice: show
    });
    syncRef.current = sync;
    let alive = true;
    void sync.start().finally(() => {
      if (alive) setReady(true);
    });
    return () => {
      alive = false;
      sync.dispose();
      syncRef.current = null;
    };
  }, [user.id, show]);

  /** The one way screens change data. */
  const run = useCallback(
    (action: Action) => {
      const res = applyAction(stateRef.current, action);
      if (res.state !== stateRef.current) {
        stateRef.current = res.state;
        setState(res.state);
        syncRef.current?.markChanged();
      }
      if (res.toast) show(res.toast);
    },
    [show]
  );

  const weather = useWeather(state.profile.weatherLocation);
  const focus = useFocusTimer(
    useCallback(
      (minutes: number) => {
        run({ type: 'focus-logged', minutes });
        show(minutes + ' minutes of focus logged. Take a short break.');
      },
      [run, show]
    )
  );

  const go = useCallback((next: TabId) => {
    setTab(next);
    window.scrollTo(0, 0);
  }, []);

  const badges = useMemo(
    () => ({ home: navBadge(state, 'home'), money: navBadge(state, 'money') }),
    [state]
  );

  // ----- things the Me tab and the sync bar ask for -----

  async function resolveConflict(): Promise<void> {
    const sync = syncRef.current;
    if (!sync || sync.isBusy) return;
    try {
      const row = await sync.fetchCloudRow();
      const choice = await ask('Resolve sync conflict', (
        <>
          <p>This device and the cloud both have changes. They are whole-account copies, not an automatic merge.</p>
          <p>
            <b>Use cloud copy</b> replaces this device with the latest cloud copy (a backup of this device downloads first).
          </p>
          <p>
            <b>Use this device</b> replaces the cloud with this device’s copy (a backup of the cloud copy downloads first).
          </p>
        </>
      ), [
        { label: 'Use cloud copy', value: 'cloud' as const },
        { label: 'Use this device', value: 'local' as const },
        { label: 'Cancel', value: 'cancel' as const }
      ]);
      if (choice === 'cloud') {
        if (!row) {
          show('There is no cloud copy to use.');
          return;
        }
        sync.resolveUseCloud(row);
      } else if (choice === 'local') {
        const ok = await confirm(
          'Replace the cloud copy?',
          'The cloud records will be replaced with this device’s copy. Other devices must refresh before editing.',
          'Replace cloud copy'
        );
        if (ok) await sync.resolveUseLocal(row);
      }
    } catch (err) {
      show('Could not read the cloud copy: ' + friendlyError(err));
    }
  }

  async function signOut(): Promise<void> {
    if (syncRef.current?.isDirty) {
      const ok = await confirm(
        'Sign out with unsynced changes?',
        'This device has changes not yet saved to the cloud. They will stay cached here, but will not appear on another device until synced.',
        'Sign out anyway'
      );
      if (!ok) return;
    }
    try {
      await onSignOut();
    } catch (err) {
      show('Could not finish signing out: ' + friendlyError(err));
    }
  }

  function exportBackup(): void {
    try {
      downloadJson(stateRef.current, 'dailynest-backup-' + today() + '.json');
      show('Backup downloaded');
    } catch {
      show('Could not create the backup here. Open the app in a normal browser tab.');
    }
  }

  async function restoreBackup(file: File | undefined): Promise<void> {
    if (!file) return;
    try {
      if (file.size > 5000000) throw new Error('Backup is too large.');
      const raw = JSON.parse(await file.text());
      const lists = ['tasks', 'stock', 'shop', 'routines'];
      if (!raw || !raw.profile || !raw.money || !lists.every((k) => Array.isArray(raw[k]))) {
        throw new Error('Not a compatible DailyNest backup.');
      }
      const ok = await confirm(
        'Restore this backup?',
        'This replaces this account’s current records with the selected backup. A copy of the current records downloads first.',
        'Restore backup'
      );
      if (!ok) return;
      downloadJson(stateRef.current, 'dailynest-before-restore-' + today() + '.json');
      run({ type: 'replace-all', data: raw });
    } catch (err) {
      show('Restore failed: ' + errorMessage(err));
    }
  }

  if (!ready) {
    return (
      <div className="auth-wrapper">
        <div className="auth-container">
          <div className="logo">⌂ DAILYNEST</div>
          <div className="message success" role="status">
            Loading your private records…
          </div>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="dashboard-wrapper">
        <SyncBar status={view.status} conflict={view.conflict} onSync={() => void syncRef.current?.syncNow()} onResolve={() => void resolveConflict()} />
        <section aria-label={tab}>
          {tab === 'today' && <TodayTab s={state} run={run} go={go} weather={weather} focus={focus} />}
          {tab === 'plan' && <PlanTab s={state} run={run} weather={weather} planDay={planDay} setPlanDay={setPlanDay} />}
          {tab === 'home' && <HomeTab s={state} run={run} />}
          {tab === 'money' && <MoneyTab s={state} run={run} />}
          {tab === 'me' && (
            <MeTab
              s={state}
              run={run}
              email={user.email}
              installStatus={install.status}
              onInstall={() => void install.install(show)}
              onExport={exportBackup}
              onRestore={(f) => void restoreBackup(f)}
              onSignOut={() => void signOut()}
            />
          )}
        </section>
      </div>
      <BottomNav tab={tab} badges={badges} onGo={go} />
      {toast.text && (
        <div className="toast" role="status">
          {toast.text}
        </div>
      )}
      {dialog}
    </>
  );
}
