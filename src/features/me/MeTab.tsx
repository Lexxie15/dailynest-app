import { useState, type FormEvent } from 'react';
import { num } from '../../lib/util';
import { CommitField } from '../../components/CommitField';
import type { Action } from '../../state/actions';
import { hasExamples } from '../../state/selectors';
import type { AppState, WeatherTown } from '../../state/types';

interface Props {
  s: AppState;
  run: (a: Action) => void;
  email: string;
  installStatus: string;
  onInstall: () => void;
  onExport: () => void;
  onRestore: (file: File | undefined) => void;
  onSignOut: () => void;
}

export function MeTab({ s, run, email, installStatus, onInstall, onExport, onRestore, onSignOut }: Props) {
  const P = s.profile;

  return (
    <>
      <div className="dash-header">
        <h2 className="page-title">Me</h2>
        <div className="location-weather">Your details and settings</div>
      </div>

      <div className="card">
        <h3 className="card-title">Profile</h3>
        <div className="form-row">
          <CommitField id="me-name" label="Your name" type="text" maxLength={40} value={P.name} onCommit={(v) => run({ type: 'profile-text', field: 'name', value: v })} />
          <CommitField id="me-loc" label="Location" type="text" maxLength={60} value={P.location} onCommit={(v) => run({ type: 'profile-text', field: 'location', value: v })} />
        </div>
        <p className="note">Your profile label does not set coordinates. Select the forecast town below.</p>
      </div>

      <div className="card">
        <h3 className="card-title">Settings</h3>
        <div className="form-row two">
          <label className="fld" htmlFor="me-water">
            Daily water goal
            <select id="me-water" value={num(P.waterGoal)} onChange={(e) => run({ type: 'profile-water-goal', value: num(e.target.value) })}>
              {[1500, 2000, 2500, 3000, 3500].map((v) => (
                <option key={v} value={v}>
                  {v} ml
                </option>
              ))}
            </select>
          </label>
          <label className="fld" htmlFor="me-cur">
            Money symbol
            <select id="me-cur" value={P.cur} onChange={(e) => run({ type: 'profile-currency', value: e.target.value })}>
              {['$', 'ZiG', 'R', 'P'].map((v) => (
                <option key={v}>{v}</option>
              ))}
            </select>
          </label>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Your data</h3>
        <p className="note" style={{ margin: '0 0 12px' }}>
          Records are cached on this browser and sync to your private Supabase account when connected. Check the sync status before
          switching devices. Offline edits stay here until successfully uploaded. This release syncs one whole-account snapshot and asks you
          to resolve conflicting edits.
        </p>
        <button type="button" className="btn" onClick={onExport}>
          Download a backup
        </button>
        {hasExamples(s) && (
          <button type="button" className="btn btn-quiet" onClick={() => run({ type: 'clear-examples' })}>
            Clear example items
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">Account</h3>
        <p className="note" style={{ margin: '0 0 12px' }}>
          Signed in as {email || 'your account'}.
        </p>
        <button type="button" className="btn btn-quiet" onClick={onSignOut}>
          Sign out
        </button>
      </div>

      <div className="disclaimer">Reminders show inside the app while it is open. There are no background notifications, and nothing here is medical advice.</div>

      <TownSearch current={P.weatherLocation} onChoose={(town) => run({ type: 'choose-town', town })} />

      <div className="card">
        <h3 className="card-title">Install DailyNest</h3>
        <button type="button" className="btn" onClick={onInstall}>
          Install / home-screen help
        </button>
        <p className="note">{installStatus}</p>
      </div>

      <div className="card">
        <h3 className="card-title">Restore a backup</h3>
        <input
          id="backup-file"
          type="file"
          accept=".json,application/json"
          onChange={(e) => {
            const file = e.target.files?.[0];
            e.target.value = '';
            onRestore(file);
          }}
        />
        <p className="note">Restoring replaces this account’s current records and queues them for cloud sync. Export a backup first.</p>
      </div>
    </>
  );
}

function TownSearch({ current, onChoose }: { current: WeatherTown | null; onChoose: (t: WeatherTown) => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WeatherTown[] | null>(null);
  const [message, setMessage] = useState('');

  async function search(e: FormEvent): Promise<void> {
    e.preventDefault();
    const q = query.trim();
    if (q.length < 2) return;
    setMessage('Searching…');
    setResults(null);
    try {
      const r = await fetch(
        'https://geocoding-api.open-meteo.com/v1/search?' + new URLSearchParams({ name: q, count: '8', language: 'en', format: 'json' })
      );
      if (!r.ok) throw new Error('Search failed');
      const j = (await r.json()) as {
        results?: Array<{ name?: string; admin1?: string; country?: string; latitude: number; longitude: number; timezone?: string }>;
      };
      const towns: WeatherTown[] = (j.results ?? []).map((x) => ({
        lat: x.latitude,
        lon: x.longitude,
        label: [x.name, x.admin1, x.country].filter(Boolean).join(', '),
        timezone: x.timezone || 'auto'
      }));
      setResults(towns);
      setMessage(towns.length ? '' : 'No matching towns. Try a nearby town or different spelling.');
    } catch {
      setMessage('Town search unavailable. Check your connection.');
    }
  }

  return (
    <div className="card">
      <h3 className="card-title">Weather town</h3>
      <p className="note">Current: {current ? current.label : 'Not selected'}</p>
      <form onSubmit={search}>
        <label htmlFor="weather-town">Town or city</label>
        <input
          id="weather-town"
          minLength={2}
          maxLength={80}
          placeholder="Binga, Harare, Bulawayo…"
          required
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />
        <button className="btn" type="submit">
          Search towns
        </button>
      </form>
      <div className="town-results">
        {message}
        {results?.map((t, i) => (
          <button
            key={i}
            type="button"
            className="btn"
            style={{ fontSize: 13 }}
            onClick={() => {
              onChoose(t);
              setResults(null);
              setMessage('');
            }}
          >
            {t.label}
          </button>
        ))}
      </div>
      <p className="note">Search and forecasts contact Open-Meteo. Choose the correct country from the results.</p>
    </div>
  );
}
