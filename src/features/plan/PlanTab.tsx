import { addDays, today } from '../../lib/dates';
import { readForm } from '../../lib/forms';
import { num } from '../../lib/util';
import { TaskRow } from '../../components/TaskRow';
import type { Action, PlanDay } from '../../state/actions';
import { dayTasks, isWeatherOk, planAdvice, routineDue, routineStatus } from '../../state/selectors';
import type { AppState, Weather } from '../../state/types';

interface Props {
  s: AppState;
  run: (a: Action) => void;
  weather: Weather;
  planDay: PlanDay;
  setPlanDay: (d: PlanDay) => void;
}

export function PlanTab({ s, run, weather, planDay, setPlanDay }: Props) {
  const key = planDay === 'today' ? today() : addDays(today(), 1);
  const list = dayTasks(s, key);
  const mins = list.filter((x) => !x.done).reduce((a, x) => a + num(x.mins), 0);
  const done = list.filter((x) => x.done).length;
  const dueRoutines = routineDue(s)
    .filter((r) => !list.some((x) => x.routineId === r.id))
    .slice(0, 4);

  return (
    <>
      <div className="dash-header">
        <h2 className="page-title">Plan</h2>
        <div className="location-weather">
          {new Date(key + 'T12:00:00').toLocaleDateString(undefined, { weekday: 'long', day: 'numeric', month: 'long' })}
        </div>
      </div>

      <div className="card">
        <div className="seg" role="group" aria-label="Day">
          <button type="button" aria-pressed={planDay === 'today'} onClick={() => setPlanDay('today')}>
            Today
          </button>
          <button type="button" aria-pressed={planDay === 'tomorrow'} onClick={() => setPlanDay('tomorrow')}>
            Tomorrow
          </button>
        </div>
        <h3 className="card-title">
          <span>Tasks</span>
          <span>{list.length ? done + ' of ' + list.length + ' done · ' + mins + ' min left' : ''}</span>
        </h3>
        {!list.length && <p className="empty">Nothing planned for this day yet. Add a task below.</p>}
        {list.map((x) => (
          <TaskRow key={x.id} task={x} withActions run={run} />
        ))}

        <form
          onSubmit={(e) => {
            const f = readForm(e);
            run({ type: 'task-add', title: f.get('title'), time: f.get('time'), mins: num(f.get('mins')), area: f.get('area'), day: planDay });
            f.finish();
          }}
        >
          <div className="form-row">
            <label className="fld span-all" htmlFor="pl-title">
              Task
              <input id="pl-title" name="title" type="text" maxLength={100} required placeholder="What needs doing?" />
            </label>
            <div className="form-row three" style={{ marginTop: 0 }}>
              <label className="fld" htmlFor="pl-time">
                Time
                <input id="pl-time" name="time" type="time" />
              </label>
              <label className="fld" htmlFor="pl-mins">
                Minutes
                <input id="pl-mins" name="mins" type="number" min={5} max={480} step={5} defaultValue={30} />
              </label>
              <label className="fld" htmlFor="pl-area">
                Type
                <select id="pl-area" name="area" defaultValue="Work">
                  <option>Work</option>
                  <option>Home</option>
                  <option>Errands</option>
                  <option>Personal</option>
                </select>
              </label>
            </div>
            <button className="btn" type="submit">
              Add to {planDay === 'today' ? 'today' : 'tomorrow'}
            </button>
          </div>
        </form>
      </div>

      {dueRoutines.length > 0 && (
        <div className="card">
          <h3 className="card-title">Due at home</h3>
          {dueRoutines.map((r) => (
            <div className="task-item" key={r.id}>
              <div className="task-content">
                <p className="task-title">{r.name}</p>
                <p className="task-meta">
                  {r.area} · {routineStatus(r)[0]}
                </p>
              </div>
              <div className="row-actions">
                <button type="button" className="tiny primary" onClick={() => run({ type: 'routine-plan', id: r.id, day: planDay })}>
                  Add to plan
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {isWeatherOk(weather) && (
        <div className="card">
          <h3 className="card-title">Planning around the weather</h3>
          <p className="note" style={{ margin: 0 }}>
            {planAdvice(weather)}
          </p>
        </div>
      )}
    </>
  );
}
