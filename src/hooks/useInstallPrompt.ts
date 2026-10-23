import { useEffect, useRef, useState } from 'react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
}

const DEFAULT_STATUS =
  'On Android Chrome, open the menu and choose Install app or Add to home screen. Availability depends on the browser.';

/** "Add to home screen" support. install() shows the browser's prompt if there is one, otherwise `onHelp` gets the help text. */
export function useInstallPrompt(): { status: string; install: (onHelp: (text: string) => void) => Promise<void> } {
  const deferred = useRef<BeforeInstallPromptEvent | null>(null);
  const [status, setStatus] = useState(DEFAULT_STATUS);

  useEffect(() => {
    const onPrompt = (e: Event): void => {
      e.preventDefault();
      deferred.current = e as BeforeInstallPromptEvent;
      setStatus('Installation is available. Tap the button above.');
    };
    const onInstalled = (): void => {
      deferred.current = null;
      setStatus('DailyNest is installed.');
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  async function install(onHelp: (text: string) => void): Promise<void> {
    const ev = deferred.current;
    if (ev) {
      deferred.current = null;
      await ev.prompt();
    } else {
      onHelp(status);
    }
  }

  return { status, install };
}
