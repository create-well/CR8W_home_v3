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
        onAuthenticated('client:' + res.client.id);
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
    <div style={{ position: 'fixed', inset: 0, background: 'var(--ths-light, #e8f0f8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999 }}>
      <div className='card' style={{ minWidth: 320, textAlign: 'center', background: 'var(--ths-paper, #fff)', border: '1px solid var(--ths-line, #ccd5e1)', borderRadius: 12, padding: 32 }}>
        <div style={{ fontSize: '1.5rem', marginBottom: 8 }}>&#127968;</div>
        <h2 style={{ marginBottom: 16, color: 'var(--ths-ink, #17233a)' }}>Take Home Studio</h2>
        <div style={{ fontSize: '0.85rem', color: 'var(--ths-muted, #667085)', marginBottom: 20 }}>Client Portal + Operations</div>

        <div className='client-login-toggle'>
          <button className={mode === 'team' ? 'active' : ''} onClick={() => setMode('team')}>Team</button>
          <button className={mode === 'client' ? 'active' : ''} onClick={() => setMode('client')}>Client</button>
        </div>

        {mode === 'team' ? (
          <form onSubmit={handleTeamLogin}>
            <input type='password' autoFocus placeholder='Enter team name...' value={pw} onChange={e => setPw(e.target.value)} style={{ width: '100%', marginBottom: 12, padding: 10, borderRadius: 7, border: '1px solid var(--ths-line, #ccd5e1)' }} />
            <button type='submit' className='btn-primary' style={{ width: '100%', background: 'var(--ths-blue, #244b7a)', color: 'white', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }}>Enter</button>
          </form>
        ) : (
          <form onSubmit={handleClientLogin}>
            <div className='form-group' style={{ textAlign: 'left' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ths-muted, #667085)' }}>Email</label>
              <input type='email' autoFocus placeholder='your@email.com' value={clientEmail} onChange={e => setClientEmail(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 7, border: '1px solid var(--ths-line, #ccd5e1)', marginTop: 4 }} />
            </div>
            <div className='form-group' style={{ textAlign: 'left', marginTop: 10 }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--ths-muted, #667085)' }}>Access Token</label>
              <input type='text' placeholder='Enter your portal token' value={clientToken} onChange={e => setClientToken(e.target.value)} style={{ width: '100%', padding: 10, borderRadius: 7, border: '1px solid var(--ths-line, #ccd5e1)', marginTop: 4 }} />
            </div>
            <button type='submit' className='btn-primary' style={{ width: '100%', marginTop: 12, background: 'var(--ths-blue, #244b7a)', color: 'white', border: 'none', borderRadius: 7, padding: '10px 0', fontWeight: 600, cursor: 'pointer' }} disabled={loading}>
              {loading ? 'Checking...' : 'Enter Portal'}
            </button>
          </form>
        )}

        {error && <p style={{ color: 'var(--ths-red, #a83832)', fontSize: '0.85rem', marginTop: 12 }}>{error}</p>}
      </div>
    </div>
  );
}
