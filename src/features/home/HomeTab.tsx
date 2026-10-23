import { daysBetween, today } from '../../lib/dates';
import { readForm } from '../../lib/forms';
import { fmtQty, num, plural } from '../../lib/util';
import type { Action } from '../../state/actions';
import { onShoppingList, routineDue, routineGap, routineStatus, shopToBuy, stockLow } from '../../state/selectors';
import type { AppState } from '../../state/types';

interface Props {
  s: AppState;
  run: (a: Action) => void;
}

export function HomeTab({ s, run }: Props) {
  const low = stockLow(s);
  const t = today();
  const stock = s.stock.slice().sort((a, b) => a.area.localeCompare(b.area) || a.name.localeCompare(b.name));
  const routines = s.routines.slice().sort((a, b) => routineGap(b) - routineGap(a));

  return (
    <>
      <div className="dash-header">
        <h2 className="page-title">Home</h2>
        <div className="location-weather">Stock, shopping and routines</div>
      </div>

      {/* ---- Running low ---- */}
      <div className="card">
        <h3 className="card-title">
          <span>Running low</span>
          <span>
            {low.length} {plural(low.length, 'item')}
          </span>
        </h3>
        {!low.length ? (
          <p className="empty">Nothing is low. You are stocked up.</p>
        ) : (
          <>
            {low.map((i) => {
              const onList = onShoppingList(s, i.id);
              const out = num(i.qty) <= 0;
              return (
                <div className="task-item" key={i.id}>
                  <div className="task-content">
                    <p className="task-title">
                      {i.name}
                      <span className={'pill ' + (out ? 'crit' : 'warn')} style={{ marginLeft: 8 }}>
                        {out ? 'Out' : 'Low'}
                      </span>
                    </p>
                    <p className="task-meta">
                      {fmtQty(num(i.qty))} {i.unit} left
                    </p>
                  </div>
                  <div className="row-actions">
                    <button
                      type="button"
                      className={'tiny' + (onList ? '' : ' primary')}
                      disabled={onList}
                      onClick={() => run({ type: 'stock-tolist', id: i.id })}
                    >
                      {onList ? 'On list' : 'To list'}
                    </button>
                  </div>
                </div>
              );
            })}
            <button type="button" className="btn" onClick={() => run({ type: 'low-tolist' })}>
              Add all low items to my shopping list
            </button>
          </>
        )}
      </div>

      {/* ---- Shopping list ---- */}
      <div className="card">
        <h3 className="card-title">
          <span>Shopping list</span>
          <span>{shopToBuy(s)} to buy</span>
        </h3>
        {!s.shop.length && <p className="empty">Your list is empty.</p>}
        {s.shop.map((x) => (
          <div className={'task-item' + (x.done ? ' done' : '')} key={x.id}>
            <button
              type="button"
              className={'task-check' + (x.done ? ' checked' : '')}
              aria-label={(x.done ? 'Not bought: ' : 'Bought: ') + x.name}
              onClick={() => run({ type: 'shop-toggle', id: x.id })}
            />
            <div className="task-content">
              <p className="task-title">{x.name}</p>
              <p className="task-meta">
                {fmtQty(num(x.qty))}
                {x.unit ? ' ' + x.unit : ''}
              </p>
            </div>
            <div className="row-actions">
              <button type="button" className="tiny" aria-label={'Remove ' + x.name} onClick={() => run({ type: 'shop-del', id: x.id })}>
                ×
              </button>
            </div>
          </div>
        ))}
        {s.shop.some((x) => x.done) && (
          <>
            <button type="button" className="btn" onClick={() => run({ type: 'shop-finish' })}>
              I bought the ticked items
            </button>
            <p className="note">Ticked items that come from your stock list are added back to your stock.</p>
          </>
        )}
        <form
          onSubmit={(e) => {
            const f = readForm(e);
            run({ type: 'shop-add', name: f.get('name'), qty: num(f.get('qty')) });
            f.finish();
          }}
        >
          <div className="form-row two">
            <label className="fld span-all" htmlFor="sh-name">
              Add an item
              <input id="sh-name" name="name" type="text" maxLength={80} required placeholder="e.g. Tomatoes" />
            </label>
            <label className="fld" htmlFor="sh-qty">
              Amount
              <input id="sh-qty" name="qty" type="number" min={0} step={0.5} defaultValue={1} />
            </label>
            <div style={{ alignSelf: 'end' }}>
              <button className="btn" type="submit">
                Add
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ---- Stock ---- */}
      <div className="card">
        <h3 className="card-title">
          <span>Stock at home</span>
          <span>{s.stock.length} tracked</span>
        </h3>
        {!s.stock.length && <p className="empty">Add the things you always want in the house.</p>}
        {stock.map((i) => (
          <div className="stock-row" key={i.id}>
            <div className="task-content">
              <p className="task-title" style={{ margin: 0 }}>
                {i.name}
                {i.ex && <span className="tag">Example</span>}
              </p>
              <p className="task-meta">
                {i.area} · low at {fmtQty(num(i.low))} {i.unit}
              </p>
            </div>
            <div className="stepper">
              <button type="button" aria-label={'Use some ' + i.name} onClick={() => run({ type: 'stock-dec', id: i.id })}>
                −
              </button>
              <b>
                {fmtQty(num(i.qty))} {i.unit}
              </b>
              <button type="button" aria-label={'Add some ' + i.name} onClick={() => run({ type: 'stock-inc', id: i.id })}>
                +
              </button>
            </div>
            <button type="button" className="tiny" aria-label={'Remove ' + i.name} onClick={() => run({ type: 'stock-del', id: i.id })}>
              ×
            </button>
          </div>
        ))}
        <form
          onSubmit={(e) => {
            const f = readForm(e);
            run({
              type: 'stock-add',
              name: f.get('name'),
              area: f.get('area'),
              unit: f.get('unit'),
              qty: num(f.get('qty')),
              low: num(f.get('low'))
            });
            f.finish();
          }}
        >
          <div className="form-row two">
            <label className="fld span-all" htmlFor="st-name">
              New item
              <input id="st-name" name="name" type="text" maxLength={60} required placeholder="e.g. Rice" />
            </label>
            <label className="fld" htmlFor="st-area">
              Where
              <select id="st-area" name="area" defaultValue="Kitchen">
                <option>Kitchen</option>
                <option>Laundry</option>
                <option>Bathroom</option>
                <option>Other</option>
              </select>
            </label>
            <label className="fld" htmlFor="st-unit">
              Unit
              <input id="st-unit" name="unit" type="text" maxLength={10} placeholder="kg, L, pack" />
            </label>
            <label className="fld" htmlFor="st-qty">
              Have now
              <input id="st-qty" name="qty" type="number" min={0} step={0.5} defaultValue={1} />
            </label>
            <label className="fld" htmlFor="st-low">
              Low at
              <input id="st-low" name="low" type="number" min={0} step={0.5} defaultValue={1} />
            </label>
            <div className="span-all">
              <button className="btn" type="submit">
                Add to stock
              </button>
            </div>
          </div>
        </form>
      </div>

      {/* ---- Routines ---- */}
      <div className="card">
        <h3 className="card-title">
          <span>Laundry and cleaning</span>
          <span>{routineDue(s).length} due</span>
        </h3>
        {!routines.length && <p className="empty">No routines yet. Add one below.</p>}
        {routines.map((r) => {
          const [label, style] = routineStatus(r);
          const ago = daysBetween(r.last || '1970-01-01', t);
          return (
            <div className="task-item" key={r.id}>
              <div className="task-content">
                <p className="task-title">
                  {r.name}
                  {r.ex && <span className="tag">Example</span>}
                </p>
                <p className="task-meta">
                  {r.area} · every {num(r.every)} d · last {ago === 0 ? 'today' : ago > 9000 ? 'never' : ago + ' d ago'}
                </p>
              </div>
              <div className="row-actions">
                <span className={'pill ' + style}>{label}</span>
                <button type="button" className="tiny primary" onClick={() => run({ type: 'routine-done', id: r.id })}>
                  {r.area === 'Laundry' ? 'Washed' : 'Done'}
                </button>
                <button type="button" className="tiny" aria-label={'Remove ' + r.name} onClick={() => run({ type: 'routine-del', id: r.id })}>
                  ×
                </button>
              </div>
            </div>
          );
        })}
        <form
          onSubmit={(e) => {
            const f = readForm(e);
            run({ type: 'routine-add', name: f.get('name'), area: f.get('area'), every: num(f.get('every')) });
            f.finish();
          }}
        >
          <div className="form-row two">
            <label className="fld span-all" htmlFor="ro-name">
              New routine
              <input id="ro-name" name="name" type="text" maxLength={60} required placeholder="e.g. Wash curtains" />
            </label>
            <label className="fld" htmlFor="ro-area">
              Group
              <select id="ro-area" name="area" defaultValue="Laundry">
                <option>Laundry</option>
                <option>Cleaning</option>
                <option>Personal</option>
              </select>
            </label>
            <label className="fld" htmlFor="ro-every">
              Every (days)
              <input id="ro-every" name="every" type="number" min={1} max={365} defaultValue={7} />
            </label>
            <div className="span-all">
              <button className="btn" type="submit">
                Add routine
              </button>
            </div>
          </div>
        </form>
      </div>
    </>
  );
}
