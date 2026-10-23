import { useCallback, useEffect, useRef, useState } from 'react';

/** One short message at the bottom of the screen that fades after a moment. */
export function useToast(): { text: string; show: (message: string) => void } {
  const [text, setText] = useState('');
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const show = useCallback((message: string) => {
    setText(message);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setText(''), 2600);
  }, []);

  useEffect(() => () => clearTimeout(timer.current), []);

  return { text, show };
}
