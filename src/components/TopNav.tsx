import React, { useState } from 'react';

interface Props {
  views: { key: string; label: string; icon: string }[];
  currentView: string;
  onNavigate: (v: string) => void;
  syncStatus: 'ok' | 'error' | 'syncing';
  syncTime: string;
  profile: string;
  onSignOut: () => void;
  onOpenTerminal: () => void;
}

export function TopNav({ views, currentView, onNavigate, syncStatus, syncTime, profile, onSignOut, onOpenTerminal }: Props) {
  const [showProfile, setShowProfile] = useState(false);

  return (
    <nav className="topnav">
      <div className="topnav-inner">
        <div className="topnav-logo" onClick={() => onNavigate('hub')}>
          <span style={{ fontSize: '1.3rem' }}>◎</span>
          <span>create well</span>
        </div>

        <div className="topnav-links">
          {views.map(v => (
            <button
              key={v.key}
              className={`topnav-link ${currentView === v.key ? 'active' : ''}`}
              onClick={() => onNavigate(v.key)}
            >
              <span style={{ marginRight: 4 }}>{v.icon}</span>
              {v.label}
            </button>
          ))}
        </div>

        <div className="topnav-actions">
          <button
            className="btn-ghost"
            style={{ padding: '6px 10px', fontSize: '0.8rem' }}
            onClick={onOpenTerminal}
            title="iMessage Terminal"
          >💬</button>

          <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <div className={`sync-dot ${syncStatus}`} title={syncTime || 'Sync status'} />
          </div>

          <div style={{ position: 'relative' }}>
            <button
              className="btn-secondary"
              style={{ padding: '6px 12px', fontSize: '0.8rem', textTransform: 'capitalize' }}
              onClick={() => setShowProfile(!showProfile)}
            >
              {profile || 'User'} ▾
            </button>
            {showProfile && (
              <div style={{
                position: 'absolute', right: 0, top: '110%',
                background: 'var(--cream)', borderRadius: 'var(--radius-md)',
                boxShadow: 'var(--shadow-lg)', padding: '8px 0', minWidth: 140,
                zIndex: 101,
              }}>
                <button className="btn-ghost" style={{ width: '100%', borderRadius: 0, textAlign: 'left', padding: '8px 16px' }} onClick={onSignOut}>
                  Sign out
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
