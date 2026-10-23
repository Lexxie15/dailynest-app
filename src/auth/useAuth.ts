// Everything about who is signed in. Screens call the functions this returns;
// only this file talks to supabase.auth.

import { useCallback, useEffect, useRef, useState } from 'react';
import type { Session } from '@supabase/supabase-js';
import { getClient } from '../lib/supabase';
import { friendlyError, redirectUrl, withTimeout } from '../lib/util';

export type AuthPhase = 'loading' | 'signedOut' | 'recovery' | 'signedIn';

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  location: string;
}

export interface Notice {
  text: string;
  type: 'success' | 'error';
}

const OFFLINE_MSG =
  'The sign-in service could not start, so you cannot sign in yet. Check your connection and reload the page. If you opened this inside a preview window, open the app in your normal browser instead.';

const recoveryInUrl = (): boolean =>
  new URLSearchParams(window.location.search).get('recovery') === '1' || window.location.hash.includes('type=recovery');

const errorInUrl = (): string | null =>
  new URLSearchParams(window.location.hash.replace(/^#/, '')).get('error_description') ||
  new URLSearchParams(window.location.search).get('error_description');

const clearRecoveryFromUrl = (): void => window.history.replaceState(null, '', window.location.pathname);

export function useAuth() {
  const [phase, setPhase] = useState<AuthPhase>(() => (recoveryInUrl() ? 'recovery' : 'loading'));
  const [user, setUser] = useState<AuthUser | null>(null);
  const [notice, setNotice] = useState<Notice | null>(() => {
    const e = errorInUrl();
    return e ? { text: 'The account link could not be used: ' + e + '. Request a fresh link.', type: 'error' } : null;
  });
  const recovery = useRef(phase === 'recovery');

  const applySession = useCallback((session: Session | null) => {
    if (recovery.current) return;
    if (session?.user) {
      const u = session.user;
      const md = (u.user_metadata ?? {}) as Record<string, unknown>;
      const next: AuthUser = {
        id: u.id,
        email: u.email ?? '',
        name: String(md.name ?? md.full_name ?? ''),
        location: String(md.location ?? '')
      };
      setUser((prev) => (prev && prev.id === next.id ? prev : next));
      setPhase('signedIn');
      setNotice(null);
    } else {
      setUser(null);
      setPhase('signedOut');
    }
  }, []);

  useEffect(() => {
    const client = getClient();
    if (!client) {
      setNotice({ text: OFFLINE_MSG, type: 'error' });
      if (!recovery.current) setPhase('signedOut');
      return;
    }
    const { data: sub } = client.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        window.history.replaceState(null, '', window.location.pathname + '?recovery=1');
        recovery.current = true;
        setPhase('recovery');
        return;
      }
      // Never call Supabase from inside this callback (it can deadlock); apply the session afterwards.
      setTimeout(() => applySession(session), 0);
    });

    let cancelled = false;
    withTimeout(client.auth.getSession(), 10000)
      .then(({ data, error }) => {
        if (error) throw error;
        if (!cancelled) applySession(data.session);
      })
      .catch((err) => {
        console.error(err);
        if (!cancelled) applySession(null);
      });

    return () => {
      cancelled = true;
      sub.subscription.unsubscribe();
    };
  }, [applySession]);

  const fail = (err: unknown): void => {
    console.error(err);
    setNotice({ text: friendlyError(err), type: 'error' });
  };

  /** Returns true when sign-in worked. */
  async function signIn(email: string, password: string): Promise<boolean> {
    setNotice(null);
    const client = getClient();
    if (!client) {
      setNotice({ text: OFFLINE_MSG, type: 'error' });
      return false;
    }
    try {
      const { data, error } = await withTimeout(client.auth.signInWithPassword({ email, password }));
      if (error) {
        setNotice({ text: friendlyError(error), type: 'error' });
        return false;
      }
      setNotice({ text: 'Welcome back!', type: 'success' });
      if (data?.session) applySession(data.session);
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }

  async function signUp(name: string, location: string, email: string, password: string): Promise<void> {
    setNotice(null);
    const client = getClient();
    if (!client) {
      setNotice({ text: OFFLINE_MSG, type: 'error' });
      return;
    }
    try {
      const { data, error } = await withTimeout(
        client.auth.signUp({
          email,
          password,
          options: { data: { name, full_name: name, location }, emailRedirectTo: redirectUrl() }
        })
      );
      if (error) setNotice({ text: friendlyError(error), type: 'error' });
      else if (data?.session) applySession(data.session);
      else if (data?.user && Array.isArray(data.user.identities) && data.user.identities.length === 0) {
        setNotice({ text: 'That email already has an account. Try signing in instead.', type: 'error' });
      } else {
        setNotice({ text: 'Account created. Open the confirmation link we emailed you, then sign in.', type: 'success' });
      }
    } catch (err) {
      fail(err);
    }
  }

  async function forgotPassword(email: string): Promise<void> {
    if (!email) {
      setNotice({ text: 'Please enter your email address above first.', type: 'error' });
      return;
    }
    const client = getClient();
    if (!client) {
      setNotice({ text: OFFLINE_MSG, type: 'error' });
      return;
    }
    try {
      const base = redirectUrl();
      const { error } = await withTimeout(
        client.auth.resetPasswordForEmail(email, { redirectTo: base ? base + '?recovery=1' : undefined })
      );
      if (error) setNotice({ text: friendlyError(error), type: 'error' });
      else {
        setNotice({
          text: 'If the account is eligible, a reset email will arrive. Check spam. Email delivery requires the project’s email provider to be configured.',
          type: 'success'
        });
      }
    } catch (err) {
      fail(err);
    }
  }

  /** Throws if sign-out fails, so the caller can tell the person. */
  async function signOut(): Promise<void> {
    const client = getClient();
    if (client) {
      const { error } = await withTimeout(client.auth.signOut({ scope: 'local' }), 10000);
      if (error) throw error;
    }
    recovery.current = false;
    setUser(null);
    setPhase('signedOut');
    setNotice(null);
  }

  /** Returns true when the new password was saved. */
  async function savePassword(password: string, repeat: string): Promise<boolean> {
    if (password !== repeat) {
      setNotice({ text: 'The passwords do not match.', type: 'error' });
      return false;
    }
    try {
      const client = getClient();
      if (!client) throw new Error(OFFLINE_MSG);
      const { error } = await withTimeout(client.auth.updateUser({ password }));
      if (error) throw error;
      const { error: outError } = await client.auth.signOut({ scope: 'local' });
      if (outError) throw outError;
      recovery.current = false;
      clearRecoveryFromUrl();
      setUser(null);
      setPhase('signedOut');
      setNotice({ text: 'Password updated. Sign in with your new password.', type: 'success' });
      return true;
    } catch (err) {
      fail(err);
      return false;
    }
  }

  async function cancelRecovery(): Promise<void> {
    try {
      await getClient()?.auth.signOut({ scope: 'local' });
    } catch (err) {
      console.error(err);
    }
    recovery.current = false;
    clearRecoveryFromUrl();
    setUser(null);
    setPhase('signedOut');
    setNotice(null);
  }

  return { phase, user, notice, setNotice, signIn, signUp, forgotPassword, signOut, savePassword, cancelRecovery };
}

export type AuthApi = ReturnType<typeof useAuth>;
