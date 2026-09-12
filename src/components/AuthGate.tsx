import { useState } from 'react';

interface Props {
  onAuthenticated: (profile: string) => void;
}

const PROFILE_KEYS = new Set(['sunshine', 'monny', 'bingle', 'omar', 'pia']);

function profileFromEmail(email: string) {
  const key = email.trim().toLowerCase().split('@')[0];
  return PROFILE_KEYS.has(key) ? key : 'monny';
}

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'signin' | 'register'>('signin');
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const teamPassphrase = import.meta.env.VITE_TEAM_PASSPHRASE;
    if (!email.trim()) { setError('Enter your email'); return; }
    if (!pass) { setError('Enter your password'); return; }
    if (!teamPassphrase?.trim()) { setError('Configuration error: VITE_TEAM_PASSPHRASE is not set'); return; }
    if (pass !== teamPassphrase) { setError('Wrong password'); return; }
    const profile = profileFromEmail(email);
    localStorage.setItem('cr8w_profile', profile);
    onAuthenticated(profile);
  };

  const switchMode = (nextMode: 'signin' | 'register') => {
    setMode(nextMode);
    setError('');
  };

  return (
    <main className="auth-screen" data-testid="auth-gate">
      <section className="auth-card" aria-labelledby="auth-title">
        <div className="auth-brand">
          <img src="/create-well-wordmark.png" alt="Create Well mark" className="auth-logo" />
          <div>
            <h1 id="auth-title">Create Well</h1>
            <p>CR8W DASHBOARD</p>
          </div>
        </div>

        <div className="auth-tabs" role="tablist" aria-label="Authentication mode">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'signin'}
            className={mode === 'signin' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => switchMode('signin')}
          >
            Sign In
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'register'}
            className={mode === 'register' ? 'auth-tab active' : 'auth-tab'}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label htmlFor="auth-email">Email</label>
          <input
            id="auth-email"
            type="email"
            data-testid="auth-email"
            name="email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={e => { setEmail(e.target.value); setError(''); }}
          />

          <label htmlFor="auth-password">Password</label>
          <div className="auth-password-wrap">
            <input
              id="auth-password"
              type={showPassword ? 'text' : 'password'}
              data-testid="auth-password"
              name="password"
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              placeholder="••••••••"
              value={pass}
              onChange={e => { setPass(e.target.value); setError(''); }}
            />
            <button
              type="button"
              className="auth-password-toggle"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              onClick={() => setShowPassword(value => !value)}
            >
              {showPassword ? '◉' : '◌'}
            </button>
          </div>

          {error && <p className="auth-error" role="alert">{error}</p>}

          <button data-testid="auth-submit" type="submit" className="auth-submit">
            {mode === 'signin' ? 'Sign In' : 'Create account'} <span aria-hidden="true">→</span>
          </button>
        </form>

        <p className="auth-footer">
          New to the Well?{' '}
          <button type="button" className="auth-link" onClick={() => switchMode('register')}>
            Create an account
          </button>
        </p>
      </section>
    </main>
  );
}
