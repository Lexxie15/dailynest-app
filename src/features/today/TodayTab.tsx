import { greeting, today } from '../../lib/dates';
import { num } from '../../lib/util';
import { TaskRow } from '../../components/TaskRow';
import type { Action } from '../../state/actions';
import {
  attention,
  dayTasks,
  formatMoney,
  moneyNow,
  stockLow,
  stockRemaining,
  waterToday,
  weatherLine
} from '../../state/selectors';
import type { AppState, TabId, Weather } from '../../state/types';
import type { FocusTimer } from '../../hooks/useFocusTimer';

interface Props {
  s: AppState;
  run: (a: Action) => void;
  go: (t: TabId) => void;
  weather: Weather;
  focus: FocusTimer;
}

export function TodayTab({ s, run, go, weather, focus }: Props) {
  const t = today();
  const all = dayTasks(s, t);
  const open = all.filter((x) => !x.done);
  const done = all.length - open.length;
  const name = s.profile.name || 'there';
  const goal = num(s.profile.waterGoal);
  const water = waterToday(s);
  const m = moneyNow(s);
  const low = stockLow(s);
  const att = attention(s, weather);
  const energy = s.energy[t] || '';
  const personal = s.routines.filter((r) => r.area === 'Personal');
  const cur = (v: number): string => formatMoney(v, s.profile.cur);
  const focusLogged = num(s.focusMin[t]);

  return (
    <>
      <div className="dash-header">
        <h2 className="greeting">
          {greeting()}, {name}
        </h2>
        <div className="location-weather">
          {s.profile.weatherLocation ? s.profile.weatherLocation.label : 'Weather location not selected'} ·{' '}
          <span>{weatherLine(s, weather)}</span>
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Your day, at a glance</h3>
        <div className="stat-grid">
          <div className="stat-box">
            <span className="stat-value">{open.length}</span>
            <span className="stat-label">Priorities left{done ? ' · ' + done + ' done' : ''}</span>
          </div>
          <div className="stat-box">
            <span className="stat-value">{water} ml</span>
            <span className="stat-label">Water today of {goal} ml</span>
            <button type="button" className="btn tiny primary mini" onClick={() => run({ type: 'water' })}>
              + 250 ml
            </button>
          </div>
        </div>
      </div>

      {att.length > 0 && (
        <div className="card">
          <h3 className="card-title">Needs attention</h3>
          {att.slice(0, 5).map((a, i) => (
            <div className="attn" key={i}>
              <p>{a.text}</p>
              {a.go ? (
                <button type="button" className="tiny" onClick={() => go(a.go as TabId)}>
                  Open
                </button>
              ) : a.act === 'water' ? (
                <button type="button" className="tiny primary" onClick={() => run({ type: 'water' })}>
                  + 250 ml
                </button>
              ) : null}
            </div>
          ))}
        </div>
      )}

      <div className="card">
        <h3 className="card-title">
          <span>Your top priorities</span>
          <button type="button" className="link-btn" onClick={() => go('plan')}>
            Open plan
          </button>
        </h3>
        {!open.length && (
          <p className="empty">{done ? 'Everything planned for today is done.' : 'Nothing planned for today. Add a task in Plan.'}</p>
        )}
        {open.slice(0, 3).map((x) => (
          <TaskRow key={x.id} task={x} withActions={false} run={run} />
        ))}
      </div>

      <div className="focus-banner">
        <h3>Today's Focus</h3>
        <p>{(focusLogged ? focusLogged + ' minutes of focus logged today. ' : '') + 'One thing at a time.'}</p>
        {focus.running && <div className="focus-clock">{focus.clock}</div>}
        {focus.running ? (
          <button type="button" className="btn-white" onClick={focus.stop}>
            Stop
          </button>
        ) : (
          <button type="button" className="btn-white" onClick={focus.start}>
            Start 25-min focus
          </button>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">
          <span>Running low at home</span>
          <button type="button" className="link-btn" onClick={() => go('home')}>
            Open home
          </button>
        </h3>
        {!low.length && <p className="empty">Nothing is low. You are stocked up.</p>}
        {low.slice(0, 3).map((i) => (
          <div className="task-item" key={i.id}>
            <div className="task-content">
              <p className="task-title">{i.name}</p>
              <p className="task-meta">
                {i.area} · {stockRemaining(i)}
              </p>
            </div>
          </div>
        ))}
      </div>

      <div className="card">
        <h3 className="card-title">
          <span>Available to spend</span>
          <button type="button" className="link-btn" onClick={() => go('money')}>
            Open money
          </button>
        </h3>
        {!m.income ? (
          <p className="empty">Set your monthly income in Money and this shows what you can spend after bills and savings.</p>
        ) : (
          <>
            <span className={'big-money' + (m.available < 0 ? ' neg' : '')}>{cur(m.available)}</span>
            <p className="note" style={{ textAlign: 'center' }}>
              About {cur(Math.max(0, m.perDay))} a day for the rest of the month
            </p>
            <div className="money-breakdown">
              <div className="money-item">
                <span className="money-val">{cur(m.bills)}</span>
                <span className="money-lbl">Bills reserved</span>
              </div>
              <div className="money-item">
                <span className="money-val" style={{ color: 'var(--success)' }}>
                  {cur(m.savings)}
                </span>
                <span className="money-lbl">Savings reserved</span>
              </div>
            </div>
          </>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">How's your energy?</h3>
        <div className="energy-row">
          {['Low', 'Okay', 'Good', 'Great'].map((e) => (
            <button
              key={e}
              type="button"
              className={'energy-btn' + (energy === e ? ' active' : '')}
              onClick={() => run({ type: 'energy', value: e })}
            >
              {e}
            </button>
          ))}
        </div>
        <h3 className="card-title" style={{ marginTop: 20 }}>
          Personal routines
        </h3>
        {!personal.length && <p className="empty">Add routines such as skincare in Home.</p>}
        {personal.map((r) => {
          const isDone = r.last === t;
          return (
            <div className={'task-item' + (isDone ? ' done' : '')} key={r.id}>
              <button
                type="button"
                className={'task-check' + (isDone ? ' checked' : '')}
                aria-label={(isDone ? 'Mark not done: ' : 'Mark done: ') + r.name}
                onClick={() => run({ type: 'routine-toggle', id: r.id })}
              />
              <div className="task-content">
                <p className="task-title">{r.name}</p>
              </div>
            </div>
          );
        })}
      </div>
    </>
  );
}
