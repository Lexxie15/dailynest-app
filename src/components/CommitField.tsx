import { useEffect, useState, type InputHTMLAttributes } from 'react';

interface Props extends Omit<InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'onBlur' | 'onFocus'> {
  id: string;
  label: string;
  value: string | number;
  /** Called with the typed text when the person leaves the field or presses Enter, and only if it changed. */
  onCommit: (text: string) => void;
}

/** A labelled input that saves when finished, not on every keystroke. */
export function CommitField({ id, label, value, onCommit, ...rest }: Props) {
  const shown = String(value);
  const [draft, setDraft] = useState(shown);
  const [focused, setFocused] = useState(false);

  useEffect(() => {
    if (!focused) setDraft(shown);
  }, [shown, focused]);

  const commit = (): void => {
    if (draft !== shown) onCommit(draft);
  };

  return (
    <label className="fld" htmlFor={id}>
      {label}
      <input
        {...rest}
        id={id}
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onFocus={() => setFocused(true)}
        onBlur={() => {
          setFocused(false);
          commit();
        }}
        onKeyDown={(e) => {
          if (e.key === 'Enter') {
            e.preventDefault();
            commit();
          }
        }}
      />
    </label>
  );
}
