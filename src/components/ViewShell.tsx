import type { ReactNode } from 'react';
import type { ModuleState } from '../types/dashboard';

interface Props {
  title: string;
  eyebrow?: string;
  state: ModuleState;
  emptyMessage?: string;
  restrictedMessage?: string;
  children: ReactNode;
}

const stateLabels: Record<ModuleState, string> = {
  loading: 'Loading',
  'empty-but-healthy': 'Clear for now',
  ready: '',
  stale: 'Stale data',
  'sync-failed': 'Sync failed',
  'permission-restricted': 'Permission restricted',
};

export function ViewShell({ title, eyebrow = 'Create Well dashboard', state, emptyMessage = 'Nothing needs your attention here yet.', restrictedMessage = 'This area is unavailable until the required consent or permission is granted.', children }: Props) {
  return (
    <section className={`view-shell view-shell-${state}`} aria-labelledby={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>
      <header className="view-shell-header">
        <div>
          <p className="view-shell-eyebrow">{eyebrow}</p>
          <h1 id={`${title.replace(/\s+/g, '-').toLowerCase()}-title`}>{title}</h1>
        </div>
        {stateLabels[state] && <span className="view-shell-state">{stateLabels[state]}</span>}
      </header>

      {state === 'loading' && <div className="view-shell-message" role="status"><span className="view-shell-spinner" /> Loading your dashboard…</div>}
      {state === 'empty-but-healthy' && <div className="view-shell-message view-shell-empty"><strong>All clear.</strong> {emptyMessage}</div>}
      {state === 'sync-failed' && <div className="view-shell-message view-shell-failed" role="alert"><strong>We couldn’t refresh this view.</strong> Check the sync status above and try again.</div>}
      {state === 'permission-restricted' && <div className="view-shell-message view-shell-restricted" role="note"><strong>Not available yet.</strong> {restrictedMessage}</div>}

      {(state === 'ready' || state === 'stale') && <div className="view-shell-content">{children}</div>}
      {state === 'stale' && <div className="view-shell-stale-note">This content may be out of date.</div>}
    </section>
  );
}
