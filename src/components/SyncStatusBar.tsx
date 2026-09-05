import type { SyncState } from '../types/dashboard';

interface Props {
  state: SyncState;
  lastSyncedAt: string | null;
}

function relativeTime(lastSyncedAt: string | null) {
  if (!lastSyncedAt) return 'Never';
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(lastSyncedAt).getTime()) / 60000));
  return minutes < 1 ? 'Just now' : `${minutes}m ago`;
}

export function SyncStatusBar({ state, lastSyncedAt }: Props) {
  const label = state === 'failed'
    ? 'Sync failed'
    : state === 'syncing'
      ? 'Syncing…'
      : `Last synced ${relativeTime(lastSyncedAt)}`;

  return (
    <div className={`sync-status-bar sync-status-${state}`} role="status" aria-live="polite">
      <span className="sync-status-indicator" aria-hidden="true" />
      <span>{label}</span>
      {state === 'stale' && <span className="sync-status-note">Showing the latest available data</span>}
      {state === 'failed' && <span className="sync-status-note">Try again when your connection is restored</span>}
    </div>
  );
}
