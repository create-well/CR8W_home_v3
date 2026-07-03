/**
 * CR8W Create Well — Login Gate
 *
 * Step 1: Password check (SHA-256 compared client-side)
 * Step 2: Profile selection (Sunshine · Monica · Bingle)
 *
 * Storage:
 *   sessionStorage  cr8w_auth_session    = '1'   clears on tab close
 *   localStorage    cr8w_auth_persistent = '1'   "remember me" across sessions
 *   localStorage    cr8w_user_profile    = key   selected person key
 *
 * Default password: "createwell"
 * Override:  set VITE_APP_PASSWORD_HASH to the SHA-256 hex of your chosen password.
 */

import React, { useState, useEffect, useCallback } from 'react';
import cwLogoImg from 'figma:asset/26b5a4fd9027610adb3ddb9ed89749cb683707dd.png';

// SHA-256 of "createwell" — override via VITE_APP_PASSWORD_HASH env var
const DEFAULT_HASH = 'fe5c79ff0abb6da77f4e8e80e0ef53c5fa79bd5f87e96a07fafec4f40d1d1a03';

const STORED_HASH: string =
  (import.meta.env.VITE_APP_PASSWORD_HASH as string | undefined) ?? DEFAULT_HASH;

async function sha256hex(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

const PROFILES = [
  {
    key: 'sunshine',
    name: 'Sunshine',
    fullName: 'Sunshine',
    emoji: '☀️',
    color: '#C25B38',
    bg: '#FFF0EB',
    border: '#F2B49B',
    role: 'Remote',
    desc: 'Advance building · Content · Sponsor comms',
  },
  {
    key: 'monny',
    name: 'Monica',
    fullName: 'Monica (Monny)',
    emoji: '🌊',
    color: '#2A6A9A',
    bg: '#EAF4FC',
    border: '#A9D6F8',
    role: 'Open Invitation',
    desc: 'Outreach · Systems · Bridge building',
  },
  {
    key: 'bingle',
    name: 'Bingle',
    fullName: 'Bingle',
    emoji: '✨',
    color: '#7A5010',
    bg: '#FFF8EC',
    border: '#D4A771',
    role: 'In-Person',
    desc: 'Space-holding · Community · Workshops',
  },
  {
    key: 'event-support',
    name: 'Event Support',
    fullName: 'Event Support',
    emoji: '🎪',
    color: '#7A4A20',
    bg: '#FFF5EE',
    border: '#E8AF93',
    role: 'Day-Of',
    desc: 'Setup · Cleanup · Engagement',
  },
];

interface Props {
  onAuthenticated: (profileKey: string) => void;
}

type Step = 'password' | 'profile';

export function LoginGate({ onAuthenticated }: Props) {
  const [step, setStep] = useState<Step>('password');
  const [pw, setPw] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [remember, setRemember] = useState(false);
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);
  const [shake, setShake] = useState(false);

  const triggerShake = useCallback(() => {
    setShake(true);
    setTimeout(() => setShake(false), 600);
  }, []);

  async function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim()) return;
    setChecking(true);
    setError('');
    try {
      const hash = await sha256hex(pw.trim());
      if (hash !== STORED_HASH) {
        setError('Incorrect password. Check with your co-creator.');
        setPw('');
        triggerShake();
        setChecking(false);
        return;
      }
      // Password correct — check if we already have a stored profile
      const stored = localStorage.getItem('cr8w_user_profile');
      if (remember) localStorage.setItem('cr8w_auth_persistent', '1');
      sessionStorage.setItem('cr8w_auth_session', '1');
      if (stored && PROFILES.some(p => p.key === stored)) {
        onAuthenticated(stored);
      } else {
        setStep('profile');
      }
    } catch {
      setError('Something went wrong. Please try again.');
    }
    setChecking(false);
  }

  function handleProfileSelect(key: string) {
    localStorage.setItem('cr8w_user_profile', key);
    onAuthenticated(key);
  }

  // ── Password screen ───────────────────────────────────────────────────────
  if (step === 'password') {
    return (
      <div style={{
        minHeight: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(160deg, #FAF6F2 0%, #F4EDE6 40%, #EDE4DA 100%)',
        padding: '24px 16px',
        fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
      }}>
        {/* Radial glow accents */}
        <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
          <div style={{ position: 'absolute', top: '-10%', left: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(194,91,56,0.12) 0%, transparent 70%)' }} />
          <div style={{ position: 'absolute', bottom: '-10%', right: '-10%', width: '40vw', height: '40vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,168,157,0.14) 0%, transparent 70%)' }} />
        </div>

        <div style={{
          position: 'relative', zIndex: 1,
          width: '100%', maxWidth: 400,
          background: 'rgba(255,255,255,0.85)',
          backdropFilter: 'blur(12px)',
          borderRadius: 24,
          boxShadow: '0 8px 40px rgba(194,91,56,0.12), 0 2px 8px rgba(0,0,0,0.06)',
          padding: '40px 36px 36px',
          border: '1px solid rgba(212,167,113,0.25)',
          animation: shake ? 'cr8w-shake 0.55s ease' : 'none',
        }}>
          {/* Logo + wordmark */}
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 32 }}>
            <img
              src={cwLogoImg}
              alt="Create Well"
              style={{ width: 72, height: 72, borderRadius: '50%', objectFit: 'cover', marginBottom: 16, boxShadow: '0 4px 16px rgba(194,91,56,0.2)' }}
            />
            <div style={{ fontFamily: 'var(--font-display, "Fredoka", sans-serif)', fontSize: '2rem', fontWeight: 700, color: '#C25B38', letterSpacing: '-0.01em', lineHeight: 1 }}>
              Create Well
            </div>
            <div style={{ fontFamily: 'var(--font-label, "Blinker", sans-serif)', fontSize: '0.78rem', color: '#A07060', letterSpacing: '0.12em', textTransform: 'uppercase', marginTop: 4 }}>
              CR8W Dashboard
            </div>
          </div>

          <form onSubmit={handlePasswordSubmit}>
            <div style={{ marginBottom: 20 }}>
              <label style={{ display: 'block', fontFamily: 'var(--font-label, "Blinker", sans-serif)', fontSize: '0.72rem', fontWeight: 700, color: '#A07060', letterSpacing: '0.08em', textTransform: 'uppercase', marginBottom: 8 }}>
                Team Password
              </label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  value={pw}
                  onChange={e => { setPw(e.target.value); setError(''); }}
                  placeholder="enter your team password"
                  autoFocus
                  autoComplete="current-password"
                  style={{
                    width: '100%', boxSizing: 'border-box',
                    padding: '13px 44px 13px 16px',
                    borderRadius: 12,
                    border: error ? '1.5px solid #E05040' : '1.5px solid rgba(212,167,113,0.4)',
                    background: 'rgba(255,255,255,0.9)',
                    fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
                    fontSize: '0.95rem',
                    color: '#2D2438',
                    outline: 'none',
                    transition: 'border-color 0.15s',
                  }}
                  onFocus={e => { e.currentTarget.style.borderColor = '#C25B38'; }}
                  onBlur={e => { e.currentTarget.style.borderColor = error ? '#E05040' : 'rgba(212,167,113,0.4)'; }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                  style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', fontSize: '1rem', color: '#A07060', padding: 4 }}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {error && (
                <div style={{ marginTop: 8, fontFamily: 'var(--font-body, "Montserrat", sans-serif)', fontSize: '0.75rem', color: '#C03020', lineHeight: 1.4 }}>
                  {error}
                </div>
              )}
            </div>

            {/* Remember me */}
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer', marginBottom: 24 }}>
              <div
                onClick={() => setRemember(v => !v)}
                role="checkbox"
                aria-checked={remember}
                tabIndex={0}
                onKeyDown={e => { if (e.key === ' ' || e.key === 'Enter') setRemember(v => !v); }}
                style={{
                  width: 20, height: 20, borderRadius: 6, flexShrink: 0,
                  border: `1.5px solid ${remember ? '#C25B38' : 'rgba(160,112,96,0.35)'}`,
                  background: remember ? '#C25B38' : 'transparent',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  transition: 'all 0.15s', cursor: 'pointer',
                }}
              >
                {remember && <span style={{ color: '#fff', fontSize: '0.7rem', lineHeight: 1 }}>✓</span>}
              </div>
              <span style={{ fontFamily: 'var(--font-label, "Blinker", sans-serif)', fontSize: '0.75rem', color: '#8A6A5A', userSelect: 'none' }}>
                Keep me signed in on this device
              </span>
            </label>

            <button
              type="submit"
              disabled={checking || !pw.trim()}
              style={{
                width: '100%', padding: '14px', borderRadius: 12, border: 'none',
                background: checking || !pw.trim() ? 'rgba(194,91,56,0.35)' : '#C25B38',
                color: '#fff',
                fontFamily: 'var(--font-display, "Fredoka", sans-serif)',
                fontSize: '1.05rem', fontWeight: 600, letterSpacing: '0.01em',
                cursor: checking || !pw.trim() ? 'default' : 'pointer',
                transition: 'background 0.15s',
                boxShadow: checking || !pw.trim() ? 'none' : '0 4px 16px rgba(194,91,56,0.3)',
              }}
            >
              {checking ? 'Checking…' : 'Enter the Well →'}
            </button>
          </form>

          <p style={{ textAlign: 'center', marginTop: 20, fontFamily: 'var(--font-body, "Montserrat", sans-serif)', fontSize: '0.7rem', color: '#B09080', lineHeight: 1.5 }}>
            This space is for the CR8W team.<br />
            Contact a co-creator for access.
          </p>
        </div>

        <style>{`
          @keyframes cr8w-shake {
            0%,100% { transform: translateX(0); }
            15%      { transform: translateX(-8px); }
            30%      { transform: translateX(7px); }
            45%      { transform: translateX(-6px); }
            60%      { transform: translateX(5px); }
            75%      { transform: translateX(-3px); }
            90%      { transform: translateX(2px); }
          }
        `}</style>
      </div>
    );
  }

  // ── Profile selection screen ───────────────────────────────────────────────
  return (
    <div style={{
      minHeight: '100dvh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(160deg, #FAF6F2 0%, #F4EDE6 40%, #EDE4DA 100%)',
      padding: '24px 16px',
      fontFamily: 'var(--font-body, "Montserrat", sans-serif)',
    }}>
      <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 0 }}>
        <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '50vw', height: '50vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(123,168,157,0.15) 0%, transparent 70%)' }} />
        <div style={{ position: 'absolute', bottom: '-5%', left: '-5%', width: '35vw', height: '35vw', borderRadius: '50%', background: 'radial-gradient(circle, rgba(184,169,212,0.12) 0%, transparent 70%)' }} />
      </div>

      <div style={{ position: 'relative', zIndex: 1, width: '100%', maxWidth: 480 }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{ fontFamily: 'var(--font-display, "Fredoka", sans-serif)', fontSize: '1.9rem', fontWeight: 700, color: '#C25B38', marginBottom: 6 }}>
            Welcome to the Well
          </div>
          <div style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)', fontSize: '0.85rem', color: '#8A6A5A', lineHeight: 1.6 }}>
            Who are you joining as today?
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {PROFILES.map(profile => (
            <button
              key={profile.key}
              onClick={() => handleProfileSelect(profile.key)}
              style={{
                display: 'flex', alignItems: 'center', gap: 16,
                padding: '16px 20px', borderRadius: 16,
                border: `1.5px solid ${profile.border}`,
                background: profile.bg,
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.15s',
                boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
              }}
              onMouseEnter={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'translateY(-2px)';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = `0 6px 20px ${profile.border}55`;
              }}
              onMouseLeave={e => {
                (e.currentTarget as HTMLButtonElement).style.transform = 'none';
                (e.currentTarget as HTMLButtonElement).style.boxShadow = '0 2px 8px rgba(0,0,0,0.04)';
              }}
            >
              <div style={{
                width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
                background: `${profile.border}40`,
                border: `2px solid ${profile.border}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '1.5rem',
              }}>
                {profile.emoji}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontFamily: 'var(--font-display, "Fredoka", sans-serif)', fontSize: '1.1rem', fontWeight: 600, color: profile.color, marginBottom: 2 }}>
                  {profile.fullName}
                </div>
                <div style={{ fontFamily: 'var(--font-label, "Blinker", sans-serif)', fontSize: '0.68rem', fontWeight: 700, color: profile.color, opacity: 0.7, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3 }}>
                  {profile.role}
                </div>
                <div style={{ fontFamily: 'var(--font-body, "Montserrat", sans-serif)', fontSize: '0.72rem', color: '#8A7060', lineHeight: 1.4 }}>
                  {profile.desc}
                </div>
              </div>
              <span style={{ fontSize: '1rem', color: profile.color, opacity: 0.6, flexShrink: 0 }}>→</span>
            </button>
          ))}
        </div>

        <p style={{ textAlign: 'center', marginTop: 24, fontFamily: 'var(--font-body, "Montserrat", sans-serif)', fontSize: '0.7rem', color: '#B09080', lineHeight: 1.5 }}>
          Your choice sets your default chat identity.<br />You can switch at any time inside the app.
        </p>
      </div>
    </div>
  );
}

// ── Auth check helpers (used by App.tsx) ──────────────────────────────────────
export function isAuthenticated(): boolean {
  return (
    sessionStorage.getItem('cr8w_auth_session') === '1' ||
    localStorage.getItem('cr8w_auth_persistent') === '1'
  );
}

export function getStoredProfile(): string | null {
  return localStorage.getItem('cr8w_user_profile');
}

export function clearAuth(): void {
  sessionStorage.removeItem('cr8w_auth_session');
  localStorage.removeItem('cr8w_auth_persistent');
}
