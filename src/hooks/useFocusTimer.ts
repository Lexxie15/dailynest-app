import { useEffect, useRef, useState } from 'react';
import { pad } from '../lib/dates';

const FOCUS_MINUTES = 25;

export interface FocusTimer {
  running: boolean;
  /** "24:59" style text. */
  clock: string;
  start: () => void;
  stop: () => void;
}

/** A 25-minute focus countdown. Calls onDone(25) when it finishes; stopping early logs nothing. */
export function useFocusTimer(onDone: (minutes: number) => void): FocusTimer {
  const [end, setEnd] = useState(0);
  const [now, setNow] = useState(() => Date.now());
  const done = useRef(onDone);
  done.current = onDone;

  useEffect(() => {
    if (!end) return;
    const id = setInterval(() => {
      const n = Date.now();
      setNow(n);
      if (n >= end) {
        clearInterval(id);
        setEnd(0);
        done.current(FOCUS_MINUTES);
      }
    }, 1000);
    return () => clearInterval(id);
  }, [end]);

  const secs = Math.max(0, Math.round((end - now) / 1000));
  return {
    running: end > 0,
    clock: pad(Math.floor(secs / 60)) + ':' + pad(secs % 60),
    start: () => {
      const n = Date.now();
      setNow(n);
      setEnd(n + FOCUS_MINUTES * 60 * 1000);
    },
    stop: () => setEnd(0)
  };
}
