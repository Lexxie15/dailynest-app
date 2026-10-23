import { today } from '../lib/dates';
import { taskMeta } from '../state/selectors';
import type { Action } from '../state/actions';
import type { Task } from '../state/types';

interface Props {
  task: Task;
  /** Show the "Tomorrow" and remove buttons (used in Plan). */
  withActions: boolean;
  run: (a: Action) => void;
}

export function TaskRow({ task: x, withActions, run }: Props) {
  return (
    <div className={'task-item' + (x.done ? ' done' : '')}>
      <button
        type="button"
        className={'task-check' + (x.done ? ' checked' : '')}
        aria-label={(x.done ? 'Mark not done: ' : 'Mark done: ') + x.title}
        onClick={() => run({ type: 'task-toggle', id: x.id })}
      />
      <div className="task-content">
        <p className="task-title">
          {x.title}
          {x.ex && <span className="tag">Example</span>}
        </p>
        <p className="task-meta">{taskMeta(x)}</p>
      </div>
      {withActions && (
        <div className="row-actions">
          {x.date === today() && !x.done && (
            <button type="button" className="tiny" onClick={() => run({ type: 'task-tomorrow', id: x.id })}>
              Tomorrow
            </button>
          )}
          <button type="button" className="tiny" aria-label={'Remove ' + x.title} onClick={() => run({ type: 'task-del', id: x.id })}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
