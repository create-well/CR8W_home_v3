import React, { useState } from 'react';

interface Props {
  onAuthenticated: (profile: string) => void;
}

const PROFILES = [
  { key: 'sunshine', name: 'Sunshine', emoji: '☀️', color: '#D4A771' },
  { key: 'monny', name: 'Monny', emoji: '◎', color: '#C25B38' },
  { key: 'bingle', name: 'Bingle', emoji: '◉', color: '#7A9E7E' },
  { key: 'omar', name: 'Omar', emoji: '⚡', color: '#5B8BA0' },
  { key: 'pia', name: 'Pia', emoji: '🌙', color: '#8A7D72' },
];

export function AuthGate({ onAuthenticated }: Props) {
  const [pass, setPass] = useState('');
  const [error, setError] = useState('');
  const [selected, setSelected] = useState('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) { setError('Choose who you are'); return; }
    if (pass !== 'monnytinks') { setError('Wrong password'); return; }
    localStorage.setItem('cr8w_profile', selected);
    onAuthenticated(selected);
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--cream)', padding: 16,
    }}>
      <div className="card" style={{ maxWidth: 400, width: '100%', textAlign: 'center' }}>
        <div style={{ fontSize: '2.5rem', marginBottom: 8 }}>◎</div>
        <h1 style={{ marginBottom: 4 }}>create well</h1>
        <p style={{ color: 'var(--text-muted)', marginBottom: 24, fontSize: '0.9rem' }}>
          Collective dashboard. Who are you today?
        </p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 20 }}>
          {PROFILES.map(p => (
            <button
              key={p.key}
              onClick={() => { setSelected(p.key); setError(''); }}
              style={{
                padding: '14px 10px', borderRadius: 'var(--radius-md)',
                background: selected === p.key ? p.color : 'var(--sandstone)',
                color: selected === p.key ? 'white' : 'var(--charcoal)',
                border: 'none', fontWeight: 600, fontSize: '0.9rem',
                cursor: 'pointer', transition: 'all 0.2s',
                boxShadow: selected === p.key ? 'var(--shadow-md)' : 'var(--shadow-sm)',
              }}
            >
              <span style={{ fontSize: '1.3rem', display: 'block', marginBottom: 4 }}>{p.emoji}</span>
              {p.name}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit}>
          <input
            type="password"
            placeholder="Password"
            value={pass}
            onChange={e => { setPass(e.target.value); setError(''); }}
            style={{ width: '100%', marginBottom: 12 }}
          />
          {error && <div style={{ color: 'var(--danger)', fontSize: '0.85rem', marginBottom: 12 }}>{error}</div>}
          <button type="submit" className="btn-primary" style={{ width: '100%' }}>
            Enter the well
          </button>
        </form>
      </div>
    </div>
  );
}
