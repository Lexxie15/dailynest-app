import { useCallback, useState, type ReactNode } from 'react';
import { Modal } from './Modal';

export interface Choice<T extends string> {
  label: string;
  value: T;
  primary?: boolean;
}

interface Pending {
  title: string;
  body: ReactNode;
  choices: Choice<string>[];
  resolve: (value: string | null) => void;
}

/**
 * Replacement for window.confirm / prompt.
 *   const { ask, dialog } = useDialog();
 *   const answer = await ask('Title', 'Text', [{label:'Yes', value:'yes', primary:true}, {label:'No', value:'no'}]);
 * answer is the chosen value, or null if the dialog was dismissed. Render {dialog} once.
 */
export function useDialog(): {
  ask: <T extends string>(title: string, body: ReactNode, choices: Choice<T>[]) => Promise<T | null>;
  confirm: (title: string, body: ReactNode, okLabel?: string) => Promise<boolean>;
  dialog: ReactNode;
} {
  const [pending, setPending] = useState<Pending | null>(null);

  const ask = useCallback(
    <T extends string>(title: string, body: ReactNode, choices: Choice<T>[]): Promise<T | null> =>
      new Promise<T | null>((resolve) => {
        setPending({ title, body, choices, resolve: resolve as (value: string | null) => void });
      }),
    []
  );

  const confirm = useCallback(
    async (title: string, body: ReactNode, okLabel = 'Yes, continue'): Promise<boolean> =>
      (await ask(title, body, [
        { label: okLabel, value: 'ok', primary: true },
        { label: 'Cancel', value: 'cancel' }
      ])) === 'ok',
    [ask]
  );

  const close = useCallback(
    (value: string | null) => {
      setPending((p) => {
        p?.resolve(value);
        return null;
      });
    },
    []
  );

  const dialog = pending ? (
    <Modal title={pending.title} onClose={() => close(null)}>
      <div className="modal-body">{pending.body}</div>
      <div className="modal-actions">
        {pending.choices.map((c) => (
          <button key={c.value} type="button" className={c.primary ? 'btn' : 'btn btn-quiet'} onClick={() => close(c.value)}>
            {c.label}
          </button>
        ))}
      </div>
    </Modal>
  ) : null;

  return { ask, confirm, dialog };
}
