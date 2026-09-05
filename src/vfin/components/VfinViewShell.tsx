import type { ReactNode } from 'react';
import type { ModuleState } from '../../types/dashboard';

interface VfinViewShellProps {
  title: string;
  state: ModuleState;
  children?: ReactNode;
  emptyTitle?: string;
  emptyBody?: string;
  restrictedTitle?: string;
  restrictedBody?: string;
  failedTitle?: string;
  failedBody?: string;
  onRetry?: () => void;
}

export function VfinViewShell({
  title,
  state,
  children,
  emptyTitle = 'Clear for now',
  emptyBody = 'Nothing needs tending in this space right now.',
  restrictedTitle = 'Access restricted',
  restrictedBody = 'This area is available when the required consent or stewardship permission is in place.',
  failedTitle = 'Could not refresh this view',
  failedBody = 'The latest known state may still be useful. Check the sync status and try again.',
  onRetry,
}: VfinViewShellProps) {
  if (state === 'loading') {
    return (
      <section className="vfin-shell vfin-shell-loading" aria-labelledby={`${title}-title`}>
        <h2 id={`${title}-title`}>{title}</h2>
        <p role="status">Loading this part of the well…</p>
      </section>
    );
  }

  if (state === 'empty-but-healthy') {
    return (
      <section className="vfin-shell vfin-shell-empty" aria-labelledby={`${title}-title`}>
        <h2 id={`${title}-title`}>{title}</h2>
        <h3>{emptyTitle}</h3>
        <p>{emptyBody}</p>
      </section>
    );
  }

  if (state === 'sync-failed') {
    return (
      <section className="vfin-shell vfin-shell-failed" aria-labelledby={`${title}-title`}>
        <h2 id={`${title}-title`}>{title}</h2>
        <h3>{failedTitle}</h3>
        <p role="alert">{failedBody}</p>
        {onRetry && <button type="button" onClick={onRetry}>Retry sync</button>}
      </section>
    );
  }

  if (state === 'permission-restricted') {
    return (
      <section className="vfin-shell vfin-shell-restricted" aria-labelledby={`${title}-title`}>
        <h2 id={`${title}-title`}>{title}</h2>
        <h3>{restrictedTitle}</h3>
        <p>{restrictedBody}</p>
      </section>
    );
  }

  return (
    <section className="vfin-shell" aria-labelledby={`${title}-title`}>
      <header className="vfin-shell-header">
        <div>
          <p className="vfin-eyebrow">Create Well dashboard</p>
          <h2 id={`${title}-title`}>{title}</h2>
        </div>
        {state === 'stale' && <span className="vfin-state" role="status">Data may be stale</span>}
      </header>
      {children}
    </section>
  );
}
