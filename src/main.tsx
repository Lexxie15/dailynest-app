import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

createRoot(document.getElementById('root') as HTMLElement).render(
  <StrictMode>
    <App />
  </StrictMode>
);

// Offline support. Only in the built site, never in `npm run dev`, and never inside the Android app shell.
if ('serviceWorker' in navigator && import.meta.env.PROD && /^https?:$/.test(location.protocol) && location.hostname !== 'localhost') {
  navigator.serviceWorker
    .register(import.meta.env.BASE_URL + 'sw.js')
    .catch((err) => console.error('Offline setup failed', err));
}
