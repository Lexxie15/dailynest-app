import { daysLeftInMonth, monthKey } from '../../lib/dates';
import { readForm } from '../../lib/forms';
import { num } from '../../lib/util';
import { CommitField } from '../../components/CommitField';
import type { Action } from '../../state/actions';
import { billStatus, formatMoney, moneyNow } from '../../state/selectors';
import type { AppState } from '../../state/types';

interface Props {
  s: AppState;
  run: (a: Action) => void;
}

export function MoneyTab({ s, run }: Props) {
  const m = moneyNow(s);
  const M = s.money;
  const mk = monthKey();
  const cur = (v: number): string => formatMoney(v, s.profile.cur);
  const tx = M.tx
    .filter((x) => x.date.slice(0, 7) === mk)
    .sort((a, b) => (a.date < b.date ? 1 : -1))
    .slice(0, 12);
  const bills = M.bills.slice().sort((a, b) => num(a.day) - num(b.day));

  return (
    <>
      <div className="dash-header">
        <h2 className="page-title">Money</h2>
        <div className="location-weather">
          {new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' })} · {daysLeftInMonth()} days left
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Available to spend</h3>
        {!m.income ? (
          <p className="empty">Enter your monthly income below to see what is left after bills and savings.</p>
        ) : (
          <>
            <span className={'big-money' + (m.available < 0 ? ' neg' : '')}>{cur(m.available)}</span>
            <p className="note" style={{ textAlign: 'center' }}>
              {m.available < 0 ? 'You are over budget this month.' : 'About ' + cur(m.perDay) + ' a day for the rest of the month'}
            </p>
          </>
        )}
        <div className="money-breakdown">
          <div className="money-item">
            <span className="money-val">{cur(m.bills)}</span>
            <span className="money-lbl">Bills</span>
          </div>
          <div className="money-item">
            <span className="money-val" style={{ color: 'var(--success)' }}>
              {cur(m.savings)}
            </span>
            <span className="money-lbl">Savings</span>
          </div>
          <div className="money-item">
            <span className="money-val">{cur(m.spent)}</span>
            <span className="money-lbl">Spent</span>
          </div>
        </div>
        <div className="form-row two">
          <CommitField
            id="mo-income"
            label="Monthly income"
            type="number"
            min={0}
            step={1}
            value={num(M.income)}
            onCommit={(v) => run({ type: 'money-set', field: 'income', value: num(v) })}
          />
          <CommitField
            id="mo-savings"
            label="Save each month"
            type="number"
            min={0}
            step={1}
            value={num(M.savings)}
            onCommit={(v) => run({ type: 'money-set', field: 'savings', value: num(v) })}
          />
        </div>
      </div>

      <div className="card">
        <h3 className="card-title">Log spending</h3>
        <form
          onSubmit={(e) => {
            const f = readForm(e);
            run({ type: 'spend-add', amt: num(f.get('amt')), note: f.get('note') });
            f.finish();
          }}
        >
          <div className="form-row two">
            <label className="fld" htmlFor="sp-amt">
              Amount
              <input id="sp-amt" name="amt" type="number" min={0} step={0.01} inputMode="decimal" required />
            </label>
            <label className="fld" htmlFor="sp-note">
              What for
              <input id="sp-note" name="note" type="text" maxLength={60} placeholder="Market, airtime" />
            </label>
            <div className="span-all">
              <button className="btn" type="submit">
                Log it
              </button>
            </div>
          </div>
        </form>
        {tx.length > 0 && (
          <>
            <h3 className="card-title" style={{ marginTop: 20 }}>
              Recent this month
            </h3>
            {tx.map((x) => (
              <div className="task-item" key={x.id}>
                <div className="task-content">
                  <p className="task-title">
                    {cur(num(x.amt))}
                    {x.note ? ' · ' + x.note : ''}
                  </p>
                  <p className="task-meta">
                    {new Date(x.date + 'T12:00:00').toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                  </p>
                </div>
                <div className="row-actions">
                  <button type="button" className="tiny" aria-label="Delete this entry" onClick={() => run({ type: 'tx-del', id: x.id })}>
                    ×
                  </button>
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      <div className="card">
        <h3 className="card-title">
          <span>Bills and rent</span>
          <span>
            {M.bills.filter((b) => b.paid === mk).length} of {M.bills.length} paid
          </span>
        </h3>
        {!M.bills.length && <p className="empty">No bills yet. Add rent and anything that repeats every month.</p>}
        {bills.map((b) => {
          const [label, style] = billStatus(b);
          const paid = b.paid === mk;
          return (
            <div className="task-item" key={b.id}>
              <div className="task-content">
                <p className="task-title">{b.name}</p>
                <p className="task-meta">
                  {cur(num(b.amt))} · due day {num(b.day)}
                </p>
              </div>
              <div className="row-actions">
                <span className={'pill ' + style}>{label}</span>
                <button type="button" className={'tiny' + (paid ? '' : ' primary')} onClick={() => run({ type: 'bill-toggle', id: b.id })}>
                  {paid ? 'Undo' : 'Paid'}
                </button>
                <button type="button" className="tiny" aria-label={'Remove ' + b.name} onClick={() => run({ type: 'bill-del', id: b.id })}>
                  ×
                </button>
              </div>
            </div>
          );
        })}
        <form
          onSubmit={(e) => {
            const f = readForm(e);
            run({ type: 'bill-add', name: f.get('name'), amt: num(f.get('amt')), day: num(f.get('day')) });
            f.finish();
          }}
        >
          <div className="form-row three">
            <label className="fld span-all" htmlFor="bi-name">
              Bill
              <input id="bi-name" name="name" type="text" maxLength={50} required placeholder="Rent, Wi-Fi" />
            </label>
            <label className="fld" htmlFor="bi-amt">
              Amount
              <input id="bi-amt" name="amt" type="number" min={0} step={0.01} required />
            </label>
            <label className="fld" htmlFor="bi-day">
              Due day
              <input id="bi-day" name="day" type="number" min={1} max={28} defaultValue={1} />
            </label>
            <div style={{ alignSelf: 'end' }}>
              <button className="btn" type="submit">
                Add
              </button>
            </div>
          </div>
        </form>
        <p className="note">
          Bills count against your available money from the start of the month, whether or not you have paid them yet. Marking one paid
          does not change the total.
        </p>
      </div>
    </>
  );
}
