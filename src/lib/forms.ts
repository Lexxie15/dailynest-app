import type { FormEvent } from 'react';

/**
 * Reads a submitted form. Use inside onSubmit:
 *   const f = readForm(e);  f.get('title');  f.finish();
 * finish() puts the fields back to their starting values and focuses the first one.
 */
export function readForm(e: FormEvent<HTMLFormElement>): { get: (name: string) => string; finish: () => void } {
  e.preventDefault();
  const form = e.currentTarget;
  const data = new FormData(form);
  return {
    get: (name) => String(data.get(name) ?? ''),
    finish: () => {
      form.reset();
      form.querySelector('input')?.focus();
    }
  };
}
