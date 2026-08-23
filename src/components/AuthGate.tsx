import React, { useState } from 'react';
import { validateClientToken } from '../api-client-portal';

interface Props { onAuthenticated: (profile: string) => void; }

const PROFILES: { key: string; label: string; role: string }[] = [
  { key: 'monny', label: 'Monny', role: 'core' },
  { key: 'sunshine', label: 'Sunshine', role: 'core' },
  { key: 'bingle', label: 'Bingle', role: 'core' },
  { key: 'omar', label: 'Omar', role: 'core' },
  { key: 'pia', label: 'Pia', role: 'co-creator' },
];

export function AuthGate({ onAuthenticated }: Props) {
  const [mode, setMode] = useState<'team' | 'client'>('team');
  const [pw, setPw] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [clientToken, setClientToken] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleTeamLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const match = PROFILES.find(p => p.key.toLowerCase() === pw.trim().toLowerCase());
    if (match) {
      localStorage.setItem('cr8w_profile', match.key);
      onAuthenticated(match.key);
    } else {
      setError('Not recognised.');
    }
  };

  const handleClientLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const res = await validateClientToken(clientEmail.trim(), clientToken.trim());
      if (res.valid && res.client) {
        localStorage.setItem('cr8w_client_id', res.client.id);
        onAuthenticated(`client:${res.client.id}`);
      } else {
        setError('Invalid email or access token.');
      }
    } catch {
      setError('Login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'var(--cream)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className="card" style={{ minWidth: 320, textAlign: 'center' }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>⛲</div>
        <h2 style={{ marginBottom: 16 }}>cr8w.com</h2>

        <div className="client-login-toggle">
          <button className={mode === 'team' ? 'active' : ''} onClick={() => setMode('team')}>Team</button>
          <button className={mode === 'client' ? 'active' : ''} onClick={() => setMode('client')}>Client</button>
        </div>

        {mode === 'team' ? (
          <form onSubmit={handleTeamLogin}>
            <input type="password" autoFocus placeholder="Enter team name..." value={pw} onChange={e => setPw(e.target.value)} style={{ width: '100%', marginBottom: 12 }} />
            <button type="submit" className="btn-primary" style={{ width: '100%' }}>Enter</button>
          </form>
        ) : (
          <form onSubmit={handleClientLogin}>
            <div className="form-group" style={{ textAlign: 'left' }}>
              <label>Email</label>
              <input type="email" autoFocus placeholder="your@email.com" value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={{ width: '100%' }} />
            </div>
            <div className="form-group" style={{ textAlign: 'left', marginTop: 10 }}>
              <label>Access Token</label>
              <input type="text" placeholder="Enter your portal token" value={clientToken} onChange={e => setClientToken(e.target.value)} style={{ width: '100%' }} />
            </div>
            <button type="submit" className="btn-primary" style={{ width: '100%', marginTop: 12 }} disabled={loading}>
              {loading ? 'Checking...' : 'Enter Portal'}
            </button>
          </form>
        )}

        {error && <p style={{ color: 'var(--danger)', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
