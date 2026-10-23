import { useState, type FormEvent } from 'react';
import type { AuthApi } from './useAuth';

type Props = Pick<
  AuthApi,
  'phase' | 'notice' | 'setNotice' | 'signIn' | 'signUp' | 'forgotPassword' | 'savePassword' | 'cancelRecovery'
>;

export function AuthScreen(props: Props) {
  const { phase, notice, setNotice } = props;
  const [view, setView] = useState<'signin' | 'signup'>('signin');

  const switchTo = (v: 'signin' | 'signup'): void => {
    setNotice(null);
    setView(v);
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-container">
        <div className="logo">⌂ DAILYNEST</div>
        <div className={'message' + (notice ? ' ' + notice.type : '')} role="status">
          {notice?.text}
        </div>

        {phase === 'loading' && <p className="subtitle">Loading…</p>}
        {phase === 'recovery' && <RecoveryForm {...props} />}
        {phase === 'signedOut' && view === 'signin' && <SignInForm {...props} onSwitch={() => switchTo('signup')} />}
        {phase === 'signedOut' && view === 'signup' && <SignUpForm {...props} onSwitch={() => switchTo('signin')} />}
      </div>
    </div>
  );
}

function SignInForm({ signIn, forgotPassword, onSwitch }: Props & { onSwitch: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      if (await signIn(email.trim(), password)) setPassword('');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Welcome back.</h1>
      <p className="subtitle">A calmer day starts here. Sign in to your DailyNest account.</p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="signin-email">Email address</label>
          <input
            id="signin-email"
            type="email"
            autoComplete="username"
            required
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>
        <div className="form-group">
          <label htmlFor="signin-password">Password</label>
          <input
            id="signin-password"
            type="password"
            autoComplete="current-password"
            required
            placeholder="••••••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Signing in...' : 'Sign in →'}
        </button>
      </form>
      <div className="footer-links">
        <button type="button" className="link-btn" onClick={() => void forgotPassword(email.trim())}>
          Forgot password?
        </button>
        <br />
        <br />
        <span>Don't have an account? </span>
        <button type="button" className="link-btn" onClick={onSwitch}>
          Create account
        </button>
      </div>
    </div>
  );
}

function SignUpForm({ signUp, onSwitch }: Props & { onSwitch: () => void }) {
  const [name, setName] = useState('');
  const [location, setLocation] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      await signUp(name.trim(), location.trim(), email.trim(), password);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Join DailyNest.</h1>
      <p className="subtitle">Let's set up your space. No pressure, just structure.</p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="signup-name">Your name</label>
          <input id="signup-name" type="text" required placeholder="Alexandra" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="signup-location">Location (Optional)</label>
          <input id="signup-location" type="text" placeholder="Binga, Zimbabwe" value={location} onChange={(e) => setLocation(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="signup-email">Email address</label>
          <input id="signup-email" type="email" required placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="signup-password">Password</label>
          <input
            id="signup-password"
            type="password"
            required
            minLength={12}
            autoComplete="new-password"
            placeholder="At least 12 characters"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit" className="btn" disabled={busy}>
          {busy ? 'Creating account...' : 'Create account →'}
        </button>
      </form>
      <div className="footer-links">
        <span>Already have an account? </span>
        <button type="button" className="link-btn" onClick={onSwitch}>
          ← Back to sign in
        </button>
      </div>
    </div>
  );
}

function RecoveryForm({ savePassword, cancelRecovery }: Props) {
  const [password, setPassword] = useState('');
  const [repeat, setRepeat] = useState('');
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault();
    setBusy(true);
    try {
      if (await savePassword(password, repeat)) {
        setPassword('');
        setRepeat('');
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <h1>Choose a new password</h1>
      <p className="subtitle">Complete your password reset securely.</p>
      <form onSubmit={submit}>
        <div className="form-group">
          <label htmlFor="new-password">New password</label>
          <input id="new-password" type="password" minLength={12} required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div className="form-group">
          <label htmlFor="repeat-password">Confirm new password</label>
          <input id="repeat-password" type="password" minLength={12} required autoComplete="new-password" value={repeat} onChange={(e) => setRepeat(e.target.value)} />
        </div>
        <button type="submit" className="btn" disabled={busy}>
          Save new password
        </button>
      </form>
      <div className="footer-links">
        <button type="button" className="link-btn" onClick={() => void cancelRecovery()}>
          Back to sign in
        </button>
      </div>
    </div>
  );
}
